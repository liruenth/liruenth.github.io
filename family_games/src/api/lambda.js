import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = "GameData";

// Mirrors GAME_TYPES in src/helpers/gameTypes.js. Duplicated rather than
// imported because this file is deployed on its own, away from the app — a type
// added there has to be added here too, or the roster read below will miss the
// players who only ever played it.
const GAME_TYPES = ["CR", "MB"];

// DynamoDB's hard ceiling on a BatchWriteItem call
const MAX_BATCH = 25;

// A throttled batch comes back as UnprocessedItems rather than an error, so the
// leftovers get resent a few times before the submit is called a failure.
const MAX_WRITE_ATTEMPTS = 3;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

// Stored uppercase so a lookup doesn't have to know how a name was typed —
// "Jim" and "jim" have to land on the same partition to be the same player.
// Numbers are handed back untouched: see the note on score in buildItem.
function upper(value) {
  return typeof value === "string" ? value.toUpperCase() : value;
}

// Fields a row doesn't always carry: Mormon Bridge sends what was bid and what
// was taken alongside the score it worked out from them, Contract Rummy has
// neither, and rows written before either existed have no seat. Absent rather
// than null where there's nothing to store, so nothing reading the item has to
// tell an empty attribute from a missing one.
const OPTIONAL_NUMBERS = ["bid", "took", "seat"];

function optionalNumber(value) {
  const number = Number(value);
  const present = value !== undefined && value !== null && value !== "";
  return present && Number.isFinite(number) ? number : undefined;
}

// One submitted row becomes one DynamoDB item. The composite keys are built
// here rather than at query time so the GSIs have something to sort on.
function buildItem(row) {
  const date = upper(row.date);
  const round = upper(row.round);
  const player = upper(row.player_name);
  const family = upper(row.family_name);
  const type = upper(row.type);

  const item = {
    id: `${date}_${row.id}`,
    date,
    date_round: `${date}#${round}`,
    player_round: `${player}#${round}`,
    family_type: `${family}#${type}`,
    family,
    player,
    round,
    // Left as a number, not uppercased into a string: the stats path compares
    // scores with `>`, which would compare them character by character instead.
    score: Number(row.score),
    type
  };

  // Numbers, and for the same reason score is: two are counts of tricks and one
  // is a row index, and what's done with all three is arithmetic.
  for (const field of OPTIONAL_NUMBERS) {
    const value = optionalNumber(row[field]);
    if (value !== undefined) {
      item[field] = value;
    }
  }

  return item;
}

// Named so the caller gets told which row was wrong, rather than a blanket 400
function rowError(row, index) {
  const required = ["id", "date", "player_name", "family_name", "round", "type"];
  const missing = required.filter((field) => row?.[field] === undefined || row[field] === "");
  if (missing.length) {
    return `Row ${index} is missing: ${missing.join(", ")}`;
  }

  if (!Number.isFinite(Number(row.score))) {
    return `Row ${index} has a non-numeric score`;
  }

  // Optional — a Contract Rummy row has no bid or took — but a row that sent one
  // and got it wrong is a bug worth naming rather than an attribute quietly
  // dropped on the floor.
  for (const field of OPTIONAL_NUMBERS) {
    const value = row[field];
    if (value !== undefined && value !== null && value !== "" && !Number.isFinite(Number(value))) {
      return `Row ${index} has a non-numeric ${field}`;
    }
  }

  return null;
}

async function writeRows(items) {
  for (let start = 0; start < items.length; start += MAX_BATCH) {
    let requests = items
      .slice(start, start + MAX_BATCH)
      .map((Item) => ({ PutRequest: { Item } }));

    for (let attempt = 0; attempt < MAX_WRITE_ATTEMPTS && requests.length; attempt += 1) {
      let result;
      try {
        result = await docClient.send(new BatchWriteCommand({
          RequestItems: { [TABLE_NAME]: requests }
        }));
      } catch (error) {
        // A key mismatch names neither the attribute nor the item, so log one
        // rejected item next to it — that's what tells us which key is wrong.
        console.error("BatchWrite failed:", error.name, error.message);
        console.error("Sample item:", JSON.stringify(requests[0].PutRequest.Item));
        throw error;
      }

      requests = result.UnprocessedItems?.[TABLE_NAME] || [];
    }

    if (requests.length) {
      throw new Error(`${requests.length} rows could not be written after ${MAX_WRITE_ATTEMPTS} attempts`);
    }
  }
}

// Takes the array of rows built by submitScores in routes.js
async function saveGame(event) {
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body || "", "base64").toString("utf8")
    : event.body;

  let rows;
  try {
    rows = JSON.parse(raw || "");
  } catch {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      body: JSON.stringify({ error: "Body must be valid JSON" })
    };
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      body: JSON.stringify({ error: "Body must be a non-empty array of score rows" })
    };
  }

  // Checked up front so a bad row doesn't leave half a game in the table
  const errors = rows.map(rowError).filter(Boolean);
  if (errors.length) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      body: JSON.stringify({ error: "Invalid rows", details: errors })
    };
  }

  const items = rows.map(buildItem);
  await writeRows(items);

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    body: JSON.stringify({
      written: items.length,
      gameIds: [...new Set(items.map((item) => item.id))]
    })
  };
}

// Every player a family has ever had a row written for, deduped — the roster a
// new game picks from.
//
// Asks the family_type index once per type rather than scanning: family_type is
// the only index partitioned on family, and a scan would read every other
// family's rows to answer for this one, growing with the table instead of with
// the family. Two queries beats that while the type list stays short.
async function listPlayers(familyName) {
  const family = upper(familyName);
  const players = new Set();

  for (const type of GAME_TYPES) {
    let startKey;

    // A long enough history runs past the 1MB a Query answers with, and it's the
    // oldest rows that get cut — where the players who have stopped playing are.
    do {
      const response = await docClient.send(new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: "family_type-date_round-index",
        KeyConditionExpression: "family_type = :target",
        ExpressionAttributeValues: { ":target": `${family}#${type}` },
        // One attribute per row is all a roster needs, so don't read the rest —
        // it's what keeps the paging above rare.
        ProjectionExpression: "#player",
        ExpressionAttributeNames: { "#player": "player" },
        ExclusiveStartKey: startKey
      }));

      (response.Items || []).forEach((item) => players.add(item.player));
      startKey = response.LastEvaluatedKey;
    } while (startKey);
  }

  // Sorted here rather than in the app: the order rows come back in is the order
  // they were played, which isn't an order to show a list of names in.
  return [...players].sort();
}

export const handler = async (event) => {
  try {
    // Set by the HTTP API (v2) and the REST API (v1) respectively
    const method = event.requestContext?.http?.method || event.httpMethod;

    // A JSON POST from the browser is preflighted, and that check never carries
    // a body — so it has to be answered before any of the parsing below.
    if (method === "OPTIONS") {
      return { statusCode: 204, headers: CORS_HEADERS, body: "" };
    }

    if (method === "POST") {
      return await saveGame(event);
    }

    // Set by the HTTP API (v2) and the REST API (v1) respectively. Matched on the
    // end rather than in full because a named stage prefixes it — /prod/players
    // and /players are the same route.
    const path = event.requestContext?.http?.path || event.path || "";

    // GET /players?family=NAME — the roster, which is the one read that isn't
    // about a single type of game. Ahead of the games read below, which is the
    // fallback for every other path.
    if (path.endsWith("/players")) {
      const { family } = event.queryStringParameters || {};

      if (!family) {
        return {
          statusCode: 400,
          headers: { "Content-Type": "application/json", ...CORS_HEADERS },
          body: JSON.stringify({ error: "Missing required parameter: family" })
        };
      }

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        body: JSON.stringify(await listPlayers(family))
      };
    }

    const { familyName, type, action } = event.queryStringParameters || {};

    // 1. Validation guardrails
    if (!familyName || !type) {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Missing required parameters: familyName and type" })
      };
    }

    // 2. Query the GSI (Guarantees data is sorted chronologically: Date then Round)
    const command = new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "family_type-date_round-index",
      KeyConditionExpression: "family_type = :target",
      ExpressionAttributeValues: {
        // Both halves are uppercased on the way in, so the lookup has to match
        ":target": `${familyName.toUpperCase()}#${type.toUpperCase()}` // e.g., "STARK#CR"
      },
      ScanIndexForward: true // true = oldest first, false = newest first
    });

    const response = await docClient.send(command);
    const items = response.Items || [];

    // -------------------------------------------------------------------------
    // PATTERN 1: Return Analytics/Stats
    // -------------------------------------------------------------------------
    if (action === "stats") {
      let highestScoreRecord = null;
      const gamesPerDay = {};

      items.forEach((item) => {
        // Track Highest Score (Only if querying for Contract Rummy records)
        if (type.toUpperCase() === "CR") {
          if (!highestScoreRecord || item.score > highestScoreRecord.score) {
            highestScoreRecord = item;
          }
        }

        // Track Games Per Day (Using a Set to count unique ids)
        if (!gamesPerDay[item.date]) {
          gamesPerDay[item.date] = new Set();
        }
        gamesPerDay[item.date].add(item.id);
      });

      // Find the date with the maximum number of unique games played
      let busiestDay = { date: null, count: 0 };
      for (const [date, gameSet] of Object.entries(gamesPerDay)) {
        if (gameSet.size > busiestDay.count) {
          busiestDay = { date, count: gameSet.size };
        }
      }

      return {
        statusCode: 200,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*" 
        },
        body: JSON.stringify({
          highestScore: highestScoreRecord ? {
            player: highestScoreRecord.player,
            round: highestScoreRecord.round,
            score: highestScoreRecord.score,
            date: highestScoreRecord.date,
            game_id: highestScoreRecord.id
          } : null,
          mostGamesInOneDay: busiestDay.date ? busiestDay : null
        })
      };
    }

    // -------------------------------------------------------------------------
    // PATTERN 2: Default Game History View (Grouped by game_id)
    // -------------------------------------------------------------------------
    const groupedByGame = items.reduce((acc, item) => {
      const gameId = item.id;
      if (!acc[gameId]) {
        acc[gameId] = [];
      }
      acc[gameId].push(item);
      return acc;
    }, {});

    return {
      statusCode: 200,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*" 
      },
      body: JSON.stringify(groupedByGame)
    };

  } catch (error) {
    console.error("Handler error:", error);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Internal Server Error", details: error.message })
    };
  }
};