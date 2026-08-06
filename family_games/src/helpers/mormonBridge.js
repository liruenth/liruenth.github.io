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
