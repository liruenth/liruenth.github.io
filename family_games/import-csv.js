import fs from 'fs';
import csv from 'csv-parser';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { fromIni } from '@aws-sdk/credential-providers';
import { collapseLegacy } from './src/api/lambda.js';

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

/* The CSV is in the shape the table used to hold: one row per player per round,
   with the columns named as they were stored. A game is one item now, so the rows
   are folded on the way in — by the same code the read path folds legacy rows
   with, so that a game imported here and a game played in the app are the same
   thing. See collapseLegacy in src/api/lambda.js, and in particular what it says
   about the order rows have to be put back into: the CSV is in no order in
   particular, and for a game with no seat column that order is its seating.

   A row has to name the game it belongs to. Without an id or a type there is
   nothing to group it under, and it would land in a partition nothing queries. */
function usableRows(rows) {
  const usable = rows.filter((row) => row.id && row.type);
  const dropped = rows.length - usable.length;

  if (dropped) {
    console.warn(`Skipped ${dropped} rows with no id or no type`);
  }

  return usable;
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
      const games = collapseLegacy(usableRows(rows));
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
