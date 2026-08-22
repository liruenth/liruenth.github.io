import fs from 'fs';
import csv from 'csv-parser';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { fromIni } from '@aws-sdk/credential-providers';
import { buildGames } from './src/api/lambda.js';
import { roundsFor, startingRoundsFor } from './src/helpers/gameTypes.js';
import { mbRounds } from './src/helpers/mormonBridge.js';

/* Credentials come from ~/.aws/credentials, never from this file — a key written
   in here is a key one `git add -A` away from being in the history for good.

   Not the "Connection 1" profile this used to name: the SDK cannot resolve a
   profile whose name has a space in it, and it reports that as having no
   credentials rather than as being unable to read the name. Override with
   AWS_PROFILE to run as somebody else. */
const PROFILE = process.env.AWS_PROFILE || 'default';

const client = new DynamoDBClient({
  region: 'us-west-1',
  credentials: fromIni({ profile: PROFILE }),
});

const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = 'GameData';
const CSV_FILE_PATH = './test_game.csv'; // Path to your CSV file

/* The CSV holds the shape the table used to: one row per player per round, with
   the columns named as they were stored. A game is one item now, so the rows are
   turned into the rows a submit sends and handed to buildGames — the very code
   the API writes a played game with. There is one fold in this codebase and this
   is it, which is what stops an imported game and a played one drifting apart.

   Two things the CSV names differently: `player`/`family` are
   `player_name`/`family_name` on a submitted row, and the `id` column is the
   whole id where a submit sends only the counter within the day.

   `bid`, `took` and `seat` are optional, the same as they are on a played row —
   Contract Rummy has none of them, and a sheet that predates them has none
   either. Passed through where the CSV names them, left off where it doesn't: a
   Mormon Bridge game without them imports as scores alone, with the bid and took
   halves of every round blank. */

/* Whether a cell holds a number somebody entered. What the app asks of its own
   sheet before submitting it — see enteredNumber in src/api/routes.js — with a
   trim it doesn't need: a sheet's cells come from number inputs, where a
   spreadsheet's can hold a stray space. */
function entered(value) {
  const text = String(value ?? '').trim();
  return text !== '' && Number.isFinite(Number(text));
}

/* Why a row isn't a round anyone played, or null where it is. The same checks the
   app makes of a sheet on its way out, so an imported game holds what a played one
   would rather than more.

   A round with no score is the ordinary case, not a mistake: nobody reached it, or
   the player was out by then. It's left out rather than written down, because
   `Number('')` is 0 and a nought is a round played badly — which is the one thing
   a round nobody played is not. The app drops these the same way.

   A row with no round at all is the summary line a spreadsheet keeps at the
   bottom. It carries the id and the type of the rows above it, so nothing else
   here would catch it, and folded in it becomes a round of its own with everyone's
   totals for scores. */
function skipReason(row) {
  if (!row.id || !row.type) {
    return 'no id or no type';
  }
  if (String(row.round ?? '').trim() === '') {
    return 'no round name — a totals row?';
  }
  if (!entered(row.score)) {
    return 'no score — a round nobody played';
  }

  return null;
}

/* Every round name a game knows. For a game that can open on more than one round
   that's every round any of those openings produces — `9+` and `8-` included,
   since which of them a game holds is the whole record of where it opened. */
function knownRounds(type) {
  const starts = startingRoundsFor(type);
  return new Set(starts ? starts.flatMap((start) => mbRounds(start)) : roundsFor(type));
}

/* Names a round the game doesn't list, without dropping it.

   Not dropped, because that's how a game written under an older round list comes
   back at all — statsData appends what it doesn't recognise rather than losing it,
   and this import is the way such a game gets in. But it's also exactly what a
   totals row somebody labelled, a typo, and a column that didn't line up all look
   like, and those are worth hearing about before they become a column on the
   stats page. */
function reportUnknownRounds(rows) {
  const known = new Map();
  const unknown = new Map();

  for (const row of rows) {
    const type = String(row.type).toUpperCase();
    const round = String(row.round).trim().toUpperCase();

    if (!known.has(type)) {
      known.set(type, knownRounds(type));
    }
    if (!known.get(type).has(round)) {
      const key = `${type} "${round}"`;
      unknown.set(key, (unknown.get(key) ?? 0) + 1);
    }
  }

  for (const [key, count] of unknown) {
    console.warn(`Importing ${count} row${count === 1 ? '' : 's'} of ${key}, which is not a round ${key.split(' ')[0]} lists — check the round column`);
  }
}

function submittedRows(rows) {
  const usable = [];
  const skipped = new Map();

  for (const row of rows) {
    const reason = skipReason(row);
    if (reason) {
      skipped.set(reason, (skipped.get(reason) ?? 0) + 1);
    } else {
      usable.push(row);
    }
  }

  // Counted by reason rather than in one lump, so a row left out on purpose reads
  // differently from a column that didn't line up.
  for (const [reason, count] of skipped) {
    console.warn(`Skipped ${count} row${count === 1 ? '' : 's'}: ${reason}`);
  }

  reportUnknownRounds(usable);

  /* Grouped by date and round the way the index would have answered — but no
     further. Ordering within a round used to break the tie on `player_round`,
     which sorted the players of a round alphabetically; buildGames seats them in
     the order it meets them, so for a CSV with no seat column that sort WAS the
     seating, and it filed every Mormon Bridge game as though the bidding went
     round the table in alphabetical order.

     Left to the CSV's own order instead, which the sort being stable preserves.
     So the rows seat the players whether or not the sheet carries these columns,
     and a `seat` column overrides even that — see below. */
  return [...usable]
    .sort((a, b) => String(a.date_round).localeCompare(String(b.date_round)))
    .map((row) => {
      const built = {
        // The counter within the day; buildGames rebuilds the id around the date.
        id: String(row.id).slice(String(row.id).lastIndexOf('_') + 1),
        date: row.date,
        player_name: row.player,
        family_name: row.family,
        round: row.round,
        score: row.score,
        type: row.type,
      };

      /* Only where the column is there and holds a number, so a row comes out the
         same shape a played one does. An empty cell is a column the sheet keeps
         for the other game's sake, not a bid of nothing: buildGames would drop it
         either way, but a blank is what the API rejects a row for, and this import
         is the one path that doesn't go past that check. */
      for (const field of ['bid', 'took', 'seat']) {
        if (entered(row[field])) {
          built[field] = row[field];
        }
      }

      return built;
    });
}

async function batchWrite(items) {
  const params = {
    RequestItems: {
      [TABLE_NAME]: items.map((item) => ({
        PutRequest: {
          Item: item,
        },
      })),
    },
  };

  await docClient.send(new BatchWriteCommand(params));
}

async function importCsv() {
  const rows = [];
  let totalImported = 0;

  fs.createReadStream(CSV_FILE_PATH)
    .pipe(csv())
    .on('data', (row) => {
      rows.push(row);
    })
    .on('end', async () => {
      const games = buildGames(submittedRows(rows));
      console.log(`Parsed ${rows.length} rows into ${games.length} games. Uploading to ${TABLE_NAME}...`);

      for (let i = 0; i < games.length; i += 25) {
        const batch = games.slice(i, i + 25);
        try {
          await batchWrite(batch);
          totalImported += batch.length;
          console.log(`Imported ${totalImported} / ${games.length} games`);
        } catch (err) {
          console.error('Error writing batch:', err);
        }
      }

      console.log('Import finished successfully!');
    });
}

importCsv();
