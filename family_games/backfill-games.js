/*
One-off. Collapses the rows a game used to be filed as into the single item it is
filed as now, and clears the rows away.

Run it AFTER the Lambda is deployed, so that nothing is still writing rows while
this is turning them into items. Nothing has to be run before it: the two shapes
sit side by side quite happily, and the read path answers for either, so this can
be run in pieces and stopped whenever.

  node backfill-games.js                 # says what it would do, writes nothing
  node backfill-games.js --limit=5       # the first five games only
  node backfill-games.js --commit        # actually does it

Safe to run again after a failure. A game already collapsed has no rows left to
find, so a second run picks up wherever the first stopped.

The fold itself is imported rather than written here. A game read back has to be
the game that was stored, and the only way to be sure of that is for the backfill
and the read to be the same code — see collapseLegacy in src/api/lambda.js, and
in particular what it says about the order rows have to be put back into.
*/
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { fromIni } from '@aws-sdk/credential-providers';
import { collapseLegacy } from './src/api/lambda.js';

const TABLE_NAME = 'GameData';
const REGION = 'us-west-1';
const PROFILE = process.env.AWS_PROFILE || 'Connection 1';

const MAX_BATCH = 25;
const MAX_WRITE_ATTEMPTS = 5;

// DynamoDB refuses an item over 400KB. Well under it, so that a game close to the
// line is reported rather than failing halfway through a batch.
const MAX_ITEM_BYTES = 350_000;

const commit = process.argv.includes('--commit');
const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.slice('--limit='.length)) : Infinity;

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({
  region: REGION,
  credentials: fromIni({ profile: PROFILE })
}));

const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

// Everything in the table. A backfill has to find every family, and family is
// only a partition on the index — so there is nothing to query by and a scan is
// the whole of it.
async function scanAll() {
  const items = [];
  let startKey;

  do {
    const response = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      ExclusiveStartKey: startKey
    }));

    items.push(...(response.Items || []));
    startKey = response.LastEvaluatedKey;
    process.stdout.write(`\r  scanned ${items.length} items`);
  } while (startKey);

  process.stdout.write('\n');
  return items;
}

/* One round of one player, as a string, so that what a game holds can be compared
   with what its rows held without caring how either is arranged. An absent bid is
   not a bid of nothing, so it has to read differently from one. */
function cellKey(player, round, score, bid, took) {
  return [player, round, Number(score), bid ?? '', took ?? ''].join('|');
}

/* Whether the item about to be written holds everything the rows it replaces
   held, and nothing besides.

   Checked per game rather than trusted across the table: the fold is tested, but
   the data is fifteen months of whatever was actually written, and a game that
   does not check out is one to leave alone and look at rather than to delete the
   evidence of. */
function verify(game, rows) {
  const problems = [];

  const rowCells = new Set(rows.map((row) =>
    cellKey(row.player, row.round, row.score, row.bid, row.took)));
  const gameCells = new Set(game.players.flatMap((entry) =>
    Object.entries(entry.rounds).map(([round, cell]) =>
      cellKey(entry.player, round, cell.score, cell.bid, cell.took))));

  for (const cell of rowCells) {
    if (!gameCells.has(cell)) {
      problems.push(`lost ${cell}`);
    }
  }
  for (const cell of gameCells) {
    if (!rowCells.has(cell)) {
      problems.push(`invented ${cell}`);
    }
  }

  const rowPlayers = new Set(rows.map((row) => row.player));
  const gamePlayers = new Set(game.players.map((entry) => entry.player));
  if (rowPlayers.size !== gamePlayers.size) {
    problems.push(`${rowPlayers.size} players in, ${gamePlayers.size} out`);
  }

  // A player's rows all carry the same seat, so the item's has to be that one.
  for (const entry of game.players) {
    const seats = new Set(rows.filter((row) => row.player === entry.player)
      .map((row) => row.seat).filter((seat) => seat !== undefined));
    const stored = seats.size === 1 ? Number([...seats][0]) : undefined;
    if (entry.seat !== stored) {
      problems.push(`${entry.player} seat ${stored} became ${entry.seat}`);
    }
  }

  const bytes = JSON.stringify(game).length;
  if (bytes > MAX_ITEM_BYTES) {
    problems.push(`${bytes} bytes is too big to store`);
  }

  return problems;
}

// Sends a batch, resending whatever comes back unprocessed. A throttled write is
// not an error, it is a shorter answer — so it has to be looked for.
async function writeRequests(all, label) {
  let done = 0;

  for (let start = 0; start < all.length; start += MAX_BATCH) {
    let requests = all.slice(start, start + MAX_BATCH);
    const size = requests.length;

    for (let attempt = 0; attempt < MAX_WRITE_ATTEMPTS && requests.length; attempt += 1) {
      if (attempt > 0) {
        await sleep(2 ** attempt * 100);
      }

      const result = await docClient.send(new BatchWriteCommand({
        RequestItems: { [TABLE_NAME]: requests }
      }));

      requests = result.UnprocessedItems?.[TABLE_NAME] || [];
    }

    if (requests.length) {
      throw new Error(`${requests.length} ${label} could not be written after ${MAX_WRITE_ATTEMPTS} attempts`);
    }

    done += size;
    process.stdout.write(`\r  ${label}: ${done}/${all.length}`);
  }

  if (all.length) {
    process.stdout.write('\n');
  }
}

async function backfill() {
  console.log(`Table ${TABLE_NAME} in ${REGION}, profile "${PROFILE}"`);
  console.log(commit ? 'COMMITTING\n' : 'Dry run — nothing will be written. Add --commit to do it.\n');

  const items = await scanAll();

  // Already an item, so nothing to do but note that this game is done — its rows,
  // if any are still beside it, are leftovers to clear away rather than to fold.
  const migrated = new Set();
  const legacy = [];
  const typeless = [];

  for (const item of items) {
    if (Array.isArray(item.players)) {
      migrated.add(`${item.id}#${item.type}`);
    } else if (!item.type) {
      // Its family_type reads FAMILY#undefined, a partition nothing asks for, so
      // this row has never been visible. Guessing a type would make it visible
      // for the first time, which is not a backfill's decision to take.
      typeless.push(item);
    } else {
      legacy.push(item);
    }
  }

  const byGame = new Map();
  for (const row of legacy) {
    const key = `${row.id}#${row.type}`;
    if (!byGame.has(key)) {
      byGame.set(key, []);
    }
    byGame.get(key).push(row);
  }

  const puts = [];
  const deletes = [];
  const skipped = [];
  let collapsed = 0;
  let alreadyDone = 0;
  let beforeBytes = 0;
  let afterBytes = 0;

  for (const [key, rows] of byGame) {
    if (collapsed + alreadyDone >= limit) {
      break;
    }

    const keys = rows.map((row) => ({ id: row.id, player_round: row.player_round }));

    /* The game is already an item and these rows are what it replaced — a sweep
       that did not finish, or a submit that fell over between its two halves.
       Clear them away without folding: the item beside them is the game. */
    if (migrated.has(key)) {
      deletes.push(...keys);
      alreadyDone += 1;
      continue;
    }

    const game = collapseLegacy(rows)[0];
    const problems = verify(game, rows);

    if (problems.length) {
      skipped.push({ key, problems });
      continue;
    }

    puts.push(game);
    deletes.push(...keys);
    collapsed += 1;
    beforeBytes += JSON.stringify(rows).length;
    afterBytes += JSON.stringify(game).length;
  }

  return { items, legacy, typeless, byGame, puts, deletes, skipped, collapsed, alreadyDone, beforeBytes, afterBytes };
}

const plan = await backfill();

console.log(`
  ${plan.items.length} items in the table
  ${plan.byGame.size} games still stored as rows (${plan.legacy.length} rows)
  ${plan.collapsed} to collapse, ${plan.alreadyDone} already an item with rows left beside it
  ${plan.puts.length} items to write, ${plan.deletes.length} rows to clear away`);

if (plan.beforeBytes) {
  const factor = (plan.beforeBytes / plan.afterBytes).toFixed(1);
  console.log(`  ${plan.beforeBytes} bytes of rows become ${plan.afterBytes} bytes of items (${factor}x smaller)`);
}

if (plan.typeless.length) {
  console.log(`\n  ${plan.typeless.length} rows carry no type and are left alone — they sit in a`);
  console.log('  partition nothing queries, so they are not visible now and would be');
  console.log('  visible for the first time if this guessed at them.');
}

if (plan.skipped.length) {
  console.log(`\n  ${plan.skipped.length} games did NOT check out and are left untouched:`);
  for (const { key, problems } of plan.skipped.slice(0, 10)) {
    console.log(`    ${key}: ${problems.slice(0, 3).join('; ')}`);
  }
  if (plan.skipped.length > 10) {
    console.log(`    ...and ${plan.skipped.length - 10} more`);
  }
}

if (plan.puts.length) {
  console.log('\n  A sample of what would be written:');
  console.log(JSON.stringify(plan.puts[0], null, 2).split('\n').map((line) => `    ${line}`).join('\n'));
}

if (!commit) {
  console.log('\nDry run. Nothing written. Add --commit to do it.');
} else if (!plan.puts.length && !plan.deletes.length) {
  console.log('\nNothing to do.');
} else {
  /* Written first, cleared away second, for the reason the Lambda writes in that
     order too: stopping in between leaves the new items standing with some old
     rows beside them, which the read path already knows to ignore and which
     running this again puts right. The other way round loses games. */
  console.log('');
  await writeRequests(plan.puts.map((Item) => ({ PutRequest: { Item } })), 'items written');
  await writeRequests(plan.deletes.map((Key) => ({ DeleteRequest: { Key } })), 'rows cleared');
  console.log('\nDone.');
}
