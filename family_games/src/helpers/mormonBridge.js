/*
Mormon Bridge's rules, kept apart from its sheet so the scoring can be read
without reading a grid.

A cell is one round for one player: what they bid, what they took, and the score
that falls out of the two. The score is stored rather than derived on read, both
because it's what the players see on the sheet and because it's the one number
the API needs a row for — see buildScoreRows in api/routes.js.

Blank, not null, for a value nobody has entered: that's what the sheet's other
helpers already read as an unplayed round.
*/
import { roundsFor } from './gameTypes';

// From gameTypes rather than written again here — that list is also what orders
// the stats page's columns, and two copies could disagree.
export const MB_ROUNDS = roundsFor('MB');

/* Taking every trick you bid for is worth a bonus, and a bigger one if what you
   bid for was the whole round. Round one is the exception: one trick out of one
   is the same feat but a far easier bet, so it pays less.

   Blank until both halves are in — a score off a bid with no took yet would read
   as a round that had been played. */
export function roundScore(round, bid, took) {
  const target = Number(round);
  const called = Number(bid);
  const won = Number(took);

  if (bid === '' || bid === null || bid === undefined || !Number.isFinite(called)) {
    return '';
  }
  if (took === '' || took === null || took === undefined || !Number.isFinite(won)) {
    return '';
  }

  let bonus = 0;
  if (called === won) {
    bonus = won === target ? (target === 1 ? 15 : 25) : 10;
  }

  return (won * 2) + bonus;
}

export function emptyCell() {
  return { bid: '', took: '', score: '' };
}

// A cell nobody has got to yet. Both halves have to be in for a round to count as
// played, since one of them alone scores nothing.
export function isBlank(cell, field) {
  const value = cell?.[field];
  return value === '' || value === null || value === undefined;
}

/* A whole number of tricks: you can't take a trick that isn't on the table, and
   you can't take a negative one.

   Blank stays blank, because on the sheet that's a round nobody has played and
   turning it into a zero would file it as one they played badly. Auto Step's
   input, which is never blank, defaults to '0' before it gets here rather than
   asking this to decide that blank means none. */
export function clampToRound(value, round) {
  if (value === '' || value === null || value === undefined) {
    return '';
  }

  const entered = Math.floor(Number(value));
  if (!Number.isFinite(entered)) {
    return '';
  }

  return String(Math.min(Math.max(entered, 0), Number(round)));
}

/* Writes one value into the sheet and re-scores the round it's in.

   The single place a bid or a took gets written. Both ways of entering one — the
   sheet's own wedges and Auto Step — come through here, so what the grid draws,
   what the total adds up and what gets submitted can't drift apart. The cell
   already in the sheet is mutated rather than replaced, which is what lets the
   grid keep rendering off the same object it was handed. */
export function setCellValue(scores, player, round, field, value) {
  const playerRounds = scores.get(player);
  if (!playerRounds) {
    return null;
  }

  const cell = playerRounds.get(round) ?? emptyCell();
  cell[field] = value;
  cell.score = roundScore(round, cell.bid, cell.took);
  playerRounds.set(round, cell);

  return cell;
}

/* A new sheet: every player, every round, all blank. Seeded in full rather than
   filled in as rounds are played, so nothing downstream has to cope with a round
   that isn't there yet — the cell renderer always has a cell, and Auto Step can
   walk the rounds it can see. */
export function emptySheet(players) {
  return new Map(players.map((player) => [
    player,
    new Map(MB_ROUNDS.map((round) => [round, emptyCell()]))
  ]));
}

/* A player's running total. Same shape of job as rowTotal in scoring.js and the
   same tolerance of blanks — a game still in progress totals what's been played
   — but it adds up the score inside each cell rather than the cell itself. */
export function mbRowTotal(playerRounds, cols) {
  return cols.reduce((sum, round) => {
    const score = Number(playerRounds.get(round)?.score);
    return Number.isFinite(score) ? sum + score : sum;
  }, 0);
}


/* ---------------------------------------------------------------------------
   Auto Step: walking the sheet a cell at a time, in the order the game is played.

   Kept here rather than in the modal that shows it because it's the part with the
   edge cases — where the bidding starts, which way it goes round, what's already
   been filled in — and none of that needs a dialog to be true.
   --------------------------------------------------------------------------- */

// Who's still in, in seat order. That's also bidding order: the rows are the
// seating, which is why the roster screen asks for them that way round.
export function activePlayers(scores, removed) {
  return [...scores.keys()].filter((player) => !removed.has(player));
}

/* The first round still missing anything, or -1 when there's nothing left to
   enter. It's what saves Auto Step from having to ask which round it's on: the
   sheet already knows, and asking would be asking the scorer to read it back. */
export function firstUnfinishedRound(cols, players, scores) {
  return cols.findIndex((round) => players.some((player) => {
    const cell = scores.get(player)?.get(round);
    return isBlank(cell, 'bid') || isBlank(cell, 'took');
  }));
}

/* Every cell Auto Step could ask for, in order: `{ round, player, field }`.

   Within a round it takes every player's bid, starting from whoever leads and
   going round the table, and then every player's took in that same order — you
   can't score a trick until everyone has called. Then the lead moves one seat
   along for the next round, which is the deal rotating.

   Built as a flat list rather than generated a step at a time: it's ten rounds of
   two passes, so a few hundred entries at the outside, and having the whole thing
   in hand is what lets the skipping below be a search rather than a loop with a
   condition in it. */
export function autoSteps(cols, players, fromRound, leader) {
  const steps = [];
  if (players.length === 0) {
    return steps;
  }

  for (let r = Math.max(fromRound, 0); r < cols.length; r += 1) {
    const leads = (leader + r - fromRound) % players.length;

    for (const field of ['bid', 'took']) {
      for (let seat = 0; seat < players.length; seat += 1) {
        steps.push({
          round: cols[r],
          player: players[(leads + seat) % players.length],
          field
        });
      }
    }
  }

  return steps;
}

/* The next step that still needs a value, or -1 once none do.

   This is the whole of the skipping: Auto Step asks for the next *blank* rather
   than the next step, so a round somebody typed straight into the sheet is passed
   over, and stopping and reopening carries on where it left off instead of
   walking back through what's already in. */
export function nextBlankStep(steps, scores, from = 0) {
  for (let index = Math.max(from, 0); index < steps.length; index += 1) {
    const { round, player, field } = steps[index];
    if (isBlank(scores.get(player)?.get(round), field)) {
      return index;
    }
  }

  return -1;
}

/* What's left to bid for in a round, and how many players have yet to call.

   The count includes whoever is being asked — they haven't bid yet — which is
   what makes it read "3 left for 5" to the fifth-from-last bidder rather than
   "3 left for 4". `left` goes negative when a round is overbid, which is not an
   error but the whole point of saying it out loud: somebody is going to be set.

   Only active players count, since a removed one is out of the bidding. */
export function bidTally(players, scores, round) {
  let bid = 0;
  let remaining = 0;

  for (const player of players) {
    const cell = scores.get(player)?.get(round);
    if (isBlank(cell, 'bid')) {
      remaining += 1;
    } else {
      bid += Number(cell.bid);
    }
  }

  return { left: Number(round) - bid, remaining };
}
