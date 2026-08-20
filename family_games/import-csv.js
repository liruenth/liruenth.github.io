import fs from 'fs';
import csv from 'csv-parser';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { fromIni } from '@aws-sdk/credential-providers';
import { buildGames } from './src/api/lambda.js';

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
function submittedRows(rows) {
  const usable = rows.filter((row) => row.id && row.type);
  const dropped = rows.length - usable.length;

  if (dropped) {
    console.warn(`Skipped ${dropped} rows with no id or no type`);
  }

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

      /* Only where the column is there and filled in, so a row comes out the same
         shape a played one does. An empty cell is a column the sheet keeps for the
         other game's sake, not a bid of nothing: buildGames would drop it either
         way, but a blank is what the API rejects a row for, and this import is the
         one path that doesn't go past that check. */
      for (const field of ['bid', 'took', 'seat']) {
        if (row[field] !== undefined && row[field] !== '') {
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
