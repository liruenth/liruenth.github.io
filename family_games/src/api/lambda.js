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

/* ---------------------------------------------------------------------------
   A game is one item.

   It used to be one item per player per round, keyed `id` / `player_round`. It
   is now one item per game, holding an ordered list of players and what each of
   them scored in each round.

   The keys are the same two attributes they always were, because a table's key
   schema cannot be changed once the table is made — there is no altering it in
   place and no adding to it, only building another table. So `player_round`
   keeps its name and holds the game's type, and `date_round` keeps its name and
   holds the game's number within its day. Both read as misnomers now; both are
   what makes this a change of contents rather than a rebuild.

   Nothing ever read a game a round at a time — the only query asks for a
   family's games of one type and the app folds the rows straight back into a
   sheet — so the split bought nothing and cost a great deal: ~70 items and
   ~9.7KB for a ten-player game, a 1MB query page that filled at around a hundred
   games, and an edit that could not be atomic because a game ran past what one
   write could hold.

   The rows are gone: the table was backfilled and holds one item per game
   throughout. What is left of the old shape is the two key attributes whose
   names still describe it.
   --------------------------------------------------------------------------- */

// Stored uppercase so a lookup doesn't have to know how a name was typed —
// "Jim" and "jim" have to land on the same partition to be the same player.
// Numbers are handed back untouched: see the note on score in putCell.
function upper(value) {
  return typeof value === "string" ? value.toUpperCase() : value;
}

// Fields a row doesn't always carry: Mormon Bridge sends what was bid and what
// was taken alongside the score it worked out from them, Contract Rummy has
// neither, and rows written before either existed have no seat. Absent rather
// than null where there's nothing to store, so nothing reading the item has to
// tell an empty attribute from a missing one.
const OPTIONAL_NUMBERS = ["bid", "took", "seat"];

// The two of those that belong to a round rather than to the player. `seat` is
// the player's, and is stored once against them instead of against every round
// they played.
const CELL_NUMBERS = ["bid", "took"];

function optionalNumber(value) {
  const number = Number(value);
  const present = value !== undefined && value !== null && value !== "";
  return present && Number.isFinite(number) ? number : undefined;
}

/* The game's number within its day, padded so the index sorts it as the count it
   is — unpadded, game 10 sorts before game 2. Left alone if it isn't a count,
   which is an id this app didn't write and has no numbering to respect. */
function paddedNumber(value) {
  const text = String(value ?? "");
  return /^\d+$/.test(text) ? text.padStart(4, "0") : text;
}

/* A player's entry in the game being built, made on first sight of them.

   `players` is a list rather than an object keyed by name so that its order is
   kept. That order is the order the rows arrived in, and for a game written
   before seats were stored it is the only record there is of where anyone sat —
   which for Mormon Bridge is the order the bidding went round. */
function playerEntry(game, player) {
  let entry = game.players.find((held) => held.player === player);

  if (!entry) {
    entry = { player, rounds: {} };
    game.players.push(entry);
  }

  return entry;
}

// One round of one player. Score is left as a number, not uppercased into a
// string: the stats path compares scores with `>`, which would compare them
// character by character instead. Bid and took are numbers for the same reason —
// they are counts of tricks, and what's done with them is arithmetic.
function putCell(entry, round, source) {
  const cell = { score: Number(source.score) };

  for (const field of CELL_NUMBERS) {
    const value = optionalNumber(source[field]);
    if (value !== undefined) {
      cell[field] = value;
    }
  }

  entry.rounds[round] = cell;
}

/* The submitted rows into the items they are filed as: one per game, and a POST
   is normally one game. Grouped by id and type together, because the id is the
   date and a counter within it and does not carry the type — two games can share
   one, and merged they would be a single game with the other's rounds blank. */
function buildGames(rows) {
  const games = new Map();

  for (const row of rows) {
    const date = upper(row.date);
    const type = upper(row.type);
    const family = upper(row.family_name);
    const id = `${date}_${row.id}`;
    const key = `${id}#${type}`;

    if (!games.has(key)) {
      games.set(key, {
        id,
        type,
        date,
        family,
        family_type: `${family}#${type}`,
        // Named for what it used to hold. Keeping the name is what lets the sort
        // key change contents without rebuilding the index, whose key schema
        // cannot be altered in place.
        date_round: `${date}#${paddedNumber(row.id)}`,
        // The table's own sort key, and a table's key schema cannot be changed
        // after it is made — so the attribute keeps its name and holds the type
        // instead, the same bargain date_round above strikes. A legacy row's
        // always has a # in it and a game's never does, which is what keeps the
        // two from ever landing on each other.
        player_round: type,
        players: []
      });
    }

    const entry = playerEntry(games.get(key), upper(row.player_name));
    const seat = optionalNumber(row.seat);

    // Every row of a player's carries the same seat, so the first one to name it
    // has named it. A row written before seats were stored doesn't.
    if (seat !== undefined && entry.seat === undefined) {
      entry.seat = seat;
    }

    putCell(entry, upper(row.round), row);
  }

  return [...games.values()];
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

// Takes made-up requests rather than items, so a caller can put or delete
// through the same chunking and the same retry.
async function writeRequests(all) {
  for (let start = 0; start < all.length; start += MAX_BATCH) {
    let requests = all.slice(start, start + MAX_BATCH);

    for (let attempt = 0; attempt < MAX_WRITE_ATTEMPTS && requests.length; attempt += 1) {
      let result;
      try {
        result = await docClient.send(new BatchWriteCommand({
          RequestItems: { [TABLE_NAME]: requests }
        }));
      } catch (error) {
        // A key mismatch names neither the attribute nor the item, so log one
        // rejected request next to it — that's what tells us which key is wrong.
        // Either kind: a batch of deletes carries keys and no items at all.
        console.error("BatchWrite failed:", error.name, error.message);
        console.error("Sample request:", JSON.stringify(
          requests[0].PutRequest?.Item ?? requests[0].DeleteRequest?.Key
        ));
        throw error;
      }

      requests = result.UnprocessedItems?.[TABLE_NAME] || [];
    }

    if (requests.length) {
      throw new Error(`${requests.length} items could not be written after ${MAX_WRITE_ATTEMPTS} attempts`);
    }
  }
}

/* Takes the array of rows built by buildScoreRows in routes.js.

   The rows are still what the app sends: a game is small enough that collapsing
   it here rather than in the browser costs nothing, and it means there is only
   ever one shape to accept on the way in.

   There is no longer anything to ask for on the way in. A game is one item, so a
   submit replaces it whole — an edit, a re-submit and a first submit are the same
   single write, and the `replace` flag that used to turn the clearing away on and
   off has nothing left to decide. A stale `?replace=1` from a browser holding an
   older build is ignored rather than refused. */
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

  // Checked up front so a bad row doesn't leave half a submit in the table
  const errors = rows.map(rowError).filter(Boolean);
  if (errors.length) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      body: JSON.stringify({ error: "Invalid rows", details: errors })
    };
  }

  const games = buildGames(rows);

  /* One write, and a game is one item, so a submit is atomic in the only sense
     that matters here: the game that was there is replaced by the game that was
     sent, whole, or it is not touched at all. There is nothing left over to clear
     away afterwards and no half-written game to put right by submitting again. */
  await writeRequests(games.map((Item) => ({ PutRequest: { Item } })));

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    body: JSON.stringify({
      written: games.length,
      gameIds: [...new Set(games.map((game) => game.id))]
    })
  };
}

/* A family's games of one type, oldest first.

   Paged. One item per game means a page now holds several hundred games rather
   than about a hundred, but the history has no bound and the answer being cut
   short showed as the oldest games quietly missing rather than as an error. */
async function queryGames(familyName, type) {
  const items = [];
  let startKey;

  do {
    const response = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "family_type-date_round-index",
      KeyConditionExpression: "family_type = :target",
      // Both halves are uppercased on the way in, so the lookup has to match
      ExpressionAttributeValues: { ":target": `${upper(familyName)}#${upper(type)}` },
      ScanIndexForward: true,
      ExclusiveStartKey: startKey
    }));

    items.push(...(response.Items || []));
    startKey = response.LastEvaluatedKey;
  } while (startKey);

  return items;
}

// Every player a family has ever had a game written for, deduped — the roster a
// new game picks from.
//
// Asks the family_type index once per type rather than scanning: family_type is
// the only index partitioned on family, and a scan would read every other
// family's games to answer for this one, growing with the table instead of with
// the family. Two queries beats that while the type list stays short.
async function listPlayers(familyName) {
  const family = upper(familyName);
  const players = new Set();

  for (const type of GAME_TYPES) {
    let startKey;

    // A long enough history runs past the 1MB a Query answers with, and it's the
    // oldest games that get cut — where the players who have stopped playing are.
    do {
      const response = await docClient.send(new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: "family_type-date_round-index",
        KeyConditionExpression: "family_type = :target",
        ExpressionAttributeValues: { ":target": `${family}#${type}` },
        // The names and nothing else, so don't read the rest — it's what keeps
        // the paging above rare. One game names all of its players at once.
        ProjectionExpression: "#players",
        ExpressionAttributeNames: { "#players": "players" },
        ExclusiveStartKey: startKey
      }));

      for (const item of response.Items || []) {
        for (const entry of item.players || []) {
          players.add(entry.player);
        }
      }

      startKey = response.LastEvaluatedKey;
    } while (startKey);
  }

  // Sorted here rather than in the app: the order games come back in is the order
  // they were played, which isn't an order to show a list of names in.
  return [...players].sort();
}

// The highest single score anyone has, and the day that held the most games.
// The same walk it always was, with the rounds now a level further in.
function statsFor(games, type) {
  let highestScore = null;
  const perDay = {};

  for (const game of games) {
    if (upper(type) === "CR") {
      for (const entry of game.players) {
        for (const [round, cell] of Object.entries(entry.rounds || {})) {
          if (!highestScore || cell.score > highestScore.score) {
            highestScore = {
              player: entry.player,
              round,
              score: cell.score,
              date: game.date,
              game_id: game.id
            };
          }
        }
      }
    }

    if (!perDay[game.date]) {
      perDay[game.date] = new Set();
    }
    perDay[game.date].add(game.id);
  }

  let busiestDay = { date: null, count: 0 };
  for (const [date, ids] of Object.entries(perDay)) {
    if (ids.size > busiestDay.count) {
      busiestDay = { date, count: ids.size };
    }
  }

  return {
    highestScore,
    mostGamesInOneDay: busiestDay.date ? busiestDay : null
  };
}

// Exported for import-csv.js, which turns a CSV into the same items a submit
// writes. Sharing the one fold is what keeps a game imported and a game played
// from being two different shapes.
export { buildGames };

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

    if (!familyName || !type) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        body: JSON.stringify({ error: "Missing required parameters: familyName and type" })
      };
    }

    const games = await queryGames(familyName, type);

    if (action === "stats") {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        body: JSON.stringify(statsFor(games, type))
      };
    }

    /* Grouped by id, which is the envelope the app already reads: an object keyed
       by game id, holding what that id answered for. A key can hold more than one
       game, since two types can share an id and the app asks for each type in
       turn and merges the answers. */
    const grouped = {};
    for (const game of games) {
      if (!grouped[game.id]) {
        grouped[game.id] = [];
      }
      grouped[game.id].push(game);
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      body: JSON.stringify(grouped)
    };

  } catch (error) {
    console.error("Handler error:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      body: JSON.stringify({ error: "Internal Server Error", details: error.message })
    };
  }
};
