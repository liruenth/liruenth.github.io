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
   is now one item per game, keyed `id` / `type`, holding an ordered list of
   players and what each of them scored in each round.

   Nothing ever read a game a round at a time — the only query asks for a
   family's games of one type and the app folds the rows straight back into a
   sheet — so the split bought nothing and cost a great deal: ~70 items and
   ~9.7KB for a ten-player game, a 1MB query page that filled at around a hundred
   games, and an edit that could not be atomic because a game ran past what one
   write could hold.

   Both shapes are read for as long as the old rows are still in the table. A
   legacy sort key always contains a `#` and a new one never does, so the two
   cannot collide and no cutover is needed. Everything marked LEGACY below goes
   once the table is backfilled.
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

// Takes made-up requests rather than items, so the same chunking and the same
// retry serve the writing and the clearing away below it.
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

/* LEGACY. The rows a game used to be filed as, which the item now replacing it
   does not overwrite: it is filed under a different sort key, so without this
   the game would be answered for twice.

   Read from the table itself rather than through the family index every other
   read here uses, for two reasons. The index is partitioned on family, and a
   game being re-filed under a new one has to be found under the old one it is
   leaving — asking the index would ask for the family the rows are not under yet
   and find nothing. And only the table can be read consistently: two submits of
   the same game in quick succession would otherwise let the second miss what the
   first had just written, and leave those rows behind.

   Held to the type being written, and only to the type: two games can share an
   id, so without that a Contract Rummy submit would clear away the Mormon Bridge
   game filed beside it. Not held to the family, because the family is the one
   thing an edit is allowed to change — it is not part of the key, so re-filing a
   game is the write itself moving it, and matching on it would look for the rows
   where they have already gone.

   A row that never carried a type matches nothing and is left alone, which is
   the right way round to be wrong about it. */
async function legacyKeys(games) {
  const keys = [];

  for (const game of games) {
    let startKey;

    do {
      const response = await docClient.send(new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "#id = :id",
        ExpressionAttributeValues: { ":id": game.id },
        // The key to delete by, plus the type — which is what tells this game
        // apart from the other one that can be filed under the same id.
        ProjectionExpression: "#id, player_round, #type",
        ExpressionAttributeNames: { "#id": "id", "#type": "type" },
        ConsistentRead: true,
        ExclusiveStartKey: startKey
      }));

      for (const item of response.Items || []) {
        // The item just written has no player_round; only the rows it replaces
        // do, which is what picks them out of everything under this id.
        if (item.player_round && item.type === game.type) {
          keys.push({ id: item.id, player_round: item.player_round });
        }
      }

      startKey = response.LastEvaluatedKey;
    } while (startKey);
  }

  return keys;
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
  const stale = await legacyKeys(games);

  /* Written first, cleared away second. The two cannot overlap — stale is only
     ever rows of the shape being replaced — so nothing is put and taken away in
     the same breath, which a batch would refuse anyway.

     It is also the order to fail in: clearing away first and then failing leaves
     a game gone with nothing put back, while writing first and then failing
     leaves the new item standing with some of the old rows beside it, which the
     read below already knows to ignore and which submitting again puts right. */
  await writeRequests(games.map((Item) => ({ PutRequest: { Item } })));
  await writeRequests(stale.map((Key) => ({ DeleteRequest: { Key } })));

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    body: JSON.stringify({
      written: games.length,
      // The only sign from out here that clearing away did what was meant by it
      deleted: stale.length,
      gameIds: [...new Set(games.map((game) => game.id))]
    })
  };
}

/* The counter an id ends in — the game's number within its day. An id that
   carries none is one this app didn't write. */
function counterOf(id) {
  const text = String(id ?? "");
  const at = text.lastIndexOf("_");
  return at === -1 ? "" : text.slice(at + 1);
}

/* LEGACY. A game still stored as rows, as the one item that replaces them.

   Used on both sides of the migration: the read below answers with it so the app
   is handed one shape whatever it finds, and the backfill stores it. That is why
   it builds the sort key afresh from the id rather than carrying the rows' own
   across — a row's is the round it holds, and the item's is the game's number
   within its day.

   The rows must already be in index order. That order is what stands in for the
   seating where no seat was ever stored, and it is `date_round` that gives it —
   not the order a Scan happens to answer in, which is by player. collapseLegacy
   below is what guarantees it. */
function collapseStored(rows) {
  const first = rows[0];
  const game = {
    id: first.id,
    type: first.type,
    date: first.date,
    family: first.family,
    family_type: first.family_type,
    date_round: `${first.date}#${paddedNumber(counterOf(first.id))}`,
    players: []
  };

  for (const row of rows) {
    const entry = playerEntry(game, row.player);

    /* Read the same way a submitted row's is, rather than with a bare Number:
       a CSV hands every column over as a string, and an empty seat column would
       otherwise become a seat of nought for everyone — which for Mormon Bridge
       would be a seating invented out of nothing and stored as fact. */
    const seat = optionalNumber(row.seat);

    if (seat !== undefined && entry.seat === undefined) {
      entry.seat = seat;
    }

    putCell(entry, row.round, row);
  }

  return game;
}

/* LEGACY. Loose rows into the games they belong to.

   Grouped by id and type together, because the id does not carry the type and
   two games can share one. Each game's rows are put into index order before they
   are folded, back into the order the index would have answered in: by
   date_round, and then by player_round, which is what DynamoDB breaks a tie on
   because it is the table's own sort key. Reproducing both halves is the point —
   sorted on date_round alone it would be right only by luck of the input already
   being in player order, and a Scan answers in exactly that order while a CSV
   answers in none. Get it wrong and a game with no seats stored comes back
   re-ordered, which for Mormon Bridge is its seating rewritten. */
function collapseLegacy(rows) {
  const byGame = new Map();

  for (const row of rows) {
    const key = `${row.id}#${row.type}`;
    if (!byGame.has(key)) {
      byGame.set(key, []);
    }
    byGame.get(key).push(row);
  }

  return [...byGame.values()].map((group) => collapseStored(
    [...group].sort((a, b) =>
      String(a.date_round).localeCompare(String(b.date_round))
      || String(a.player_round).localeCompare(String(b.player_round)))
  ));
}

/* Whatever the query answered with, as games. An item carrying a player list is
   already one; anything else is rows to be folded.

   A game answered for as an item is the whole of itself, so rows found beside it
   are leftovers a clearing away did not finish and are dropped rather than folded
   — folded, the game would hold its scores twice. */
function gamesFrom(items) {
  const games = items.filter((item) => Array.isArray(item.players));
  const answered = new Set(games.map((game) => `${game.id}#${game.type}`));

  const leftover = items.filter((item) =>
    !Array.isArray(item.players) && !answered.has(`${item.id}#${item.type}`));

  return [...games, ...collapseLegacy(leftover)];
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

  return gamesFrom(items);
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
        // the paging above rare. Both shapes are asked for: a game names its
        // players together, a legacy row names the one it belongs to.
        ProjectionExpression: "#player, #players",
        ExpressionAttributeNames: { "#player": "player", "#players": "players" },
        ExclusiveStartKey: startKey
      }));

      for (const item of response.Items || []) {
        if (Array.isArray(item.players)) {
          item.players.forEach((entry) => players.add(entry.player));
        } else if (item.player) {
          players.add(item.player);
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

// Exported for the one-off scripts that write the same items this reads: they
// must produce what the read above would, and sharing the fold is what makes
// that so rather than something to keep in step by hand.
export { buildGames, collapseStored, collapseLegacy };

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
