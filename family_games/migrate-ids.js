/*
One-off. Puts the family into each game's id, and clears away the games that are
not worth keeping.

  node migrate-ids.js            # says what it would do, writes nothing
  node migrate-ids.js --commit   # does it

`id` is the table's partition key, so it cannot be updated — a game moves by
being written under the new id and deleted from the old one. That is done a game
at a time rather than in two sweeps, so at most one game is ever sitting under
both ids at once. Stopping halfway leaves that one game showing twice, which is
visible and is put right by running this again; the other order would leave a
game missing, which is not.

Delete this file once it has run. It has nothing to do afterwards.
*/
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { fromIni } from '@aws-sdk/credential-providers';

const TABLE_NAME = 'GameData';
const REGION = 'us-west-1';
const PROFILE = process.env.AWS_PROFILE || 'default';

// The families worth keeping. Everything else in the table is test data.
const KEEP = ['JIMMY ANGELL'];

const commit = process.argv.includes('--commit');

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({
  region: REGION,
  credentials: fromIni({ profile: PROFILE }),
}));

const upper = (value) => (typeof value === 'string' ? value.toUpperCase() : value);
const keyOf = (item) => ({ id: item.id, player_round: item.player_round });

async function scanAll() {
  const items = [];
  let startKey;

  do {
    const response = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      ExclusiveStartKey: startKey,
    }));
    items.push(...(response.Items || []));
    startKey = response.LastEvaluatedKey;
  } while (startKey);

  return items;
}

/* The same game under its new id, and nothing else changed. The family is
   uppercased into the id the way buildGames uppercases it, and the family and
   family_type attributes are brought into line with it — one of these games was
   written by a CSV import that stored them as they were typed. */
function moved(item) {
  const family = upper(item.family);

  return {
    ...item,
    id: `${family}#${item.id}`,
    family,
    family_type: `${family}#${item.type}`,
  };
}

/* Whether the move lost anything. Everything but the three attributes the move
   is allowed to touch has to come through untouched. */
function problems(before, after) {
  const found = [];
  const allowed = new Set(['id', 'family', 'family_type']);
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of keys) {
    if (allowed.has(key)) {
      continue;
    }
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      found.push(`${key} changed`);
    }
  }

  if (after.id !== `${upper(before.family)}#${before.id}`) {
    found.push(`new id is ${after.id}`);
  }

  return found;
}

const items = await scanAll();

console.log(`Table ${TABLE_NAME} in ${REGION}, profile "${PROFILE}"`);
console.log(commit ? 'COMMITTING\n' : 'Dry run — nothing will be written. Add --commit to do it.\n');

const keeping = [];
const discarding = [];

for (const item of items) {
  const isGame = Array.isArray(item.players) && item.family && item.type;
  if (isGame && KEEP.includes(upper(item.family))) {
    keeping.push(item);
  } else {
    discarding.push(item);
  }
}

// A move that would land on top of something already there is not a move.
const taken = new Set(items.map((item) => `${item.id}#${item.player_round}`));
const blocked = [];

console.log(`Moving ${keeping.length} game(s):`);
for (const item of keeping) {
  const after = moved(item);
  const found = problems(item, after);
  const clash = taken.has(`${after.id}#${after.player_round}`);

  if (clash) {
    found.push(`${after.id} is already taken`);
  }
  if (found.length) {
    blocked.push({ item, found });
    console.log(`  BLOCKED  ${item.id} -> ${after.id}: ${found.join('; ')}`);
    continue;
  }

  const cells = item.players.reduce((n, p) => n + Object.keys(p.rounds).length, 0);
  console.log(`  ${item.id} -> ${after.id}  (${item.type}, ${item.players.length} players, ${cells} cells)`);
}

console.log(`\nDiscarding ${discarding.length} item(s) — THIS CANNOT BE UNDONE:`);
for (const item of discarding) {
  const what = Array.isArray(item.players)
    ? `${item.type} ${item.players.length} players`
    : 'not a game';
  console.log(`  ${String(item.id).padEnd(14)} ${String(item.player_round).padEnd(10)} ${String(item.family).padEnd(14)} ${what}`);
}

if (blocked.length) {
  console.error(`\n${blocked.length} game(s) blocked. Nothing written — fix those first.`);
  process.exit(1);
}

if (!commit) {
  console.log('\nDry run. Nothing written. Add --commit to do it.');
} else {
  console.log('');
  for (const item of keeping) {
    const after = moved(item);
    // Written first, then the old one taken away, so a stop in between shows the
    // game twice rather than losing it.
    await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: after }));
    await docClient.send(new DeleteCommand({ TableName: TABLE_NAME, Key: keyOf(item) }));
    console.log(`  moved  ${item.id} -> ${after.id}`);
  }
  for (const item of discarding) {
    await docClient.send(new DeleteCommand({ TableName: TABLE_NAME, Key: keyOf(item) }));
    console.log(`  discarded  ${item.id} / ${item.player_round}`);
  }
  console.log('\nDone.');
}
