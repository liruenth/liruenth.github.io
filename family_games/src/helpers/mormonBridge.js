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
/* ---------------------------------------------------------------------------
   The rounds a game is played over.

   Ten cards dealt down to one, so a game is ten rounds — but the deck runs out
   before ten cards each does: six players want sixty cards and there are
   fifty-two. A table that big opens lower and plays its opening round more than
   once, which keeps every game the same ten rounds however many are sitting at
   it.

   The repeats are told apart by a mark on the round's name, and the mark is part
   of the name: it's what the sheet shows, what gets stored, and what the stats
   page reads back. Marked rounds come first, so a row of them reads in the order
   they were played — `9+` then `9`, or `8+` then `8-` then `8`.

   A mark is a label and nothing else. `9+` is a nine-trick round exactly as `9`
   is, so everything that asks how many tricks are on the table goes through
   tricksIn below rather than reading the name as a number.
   --------------------------------------------------------------------------- */

// A game is this many rounds however high it opens, which is what the repeats are
// for.
export const MB_ROUNDS_IN_GAME = 10;

/* One mark per repeat bar the last, which goes unmarked — so the marks are also
   what decides how low a game can open. A third mark here would allow a seventh
   round to open on and nothing else would need changing. */
const REPEAT_MARKS = ['+', '-'];

const MARKED = /[+-]$/;

// The lowest round a game can open on, which the marks above decide.
export const MB_LOWEST_START = MB_ROUNDS_IN_GAME - REPEAT_MARKS.length;

/* The rounds a game opening on `start` is played over: that round repeated as
   many times as it takes to make ten, then the countdown from it down to one.

   Clamped rather than trusted, because the number comes back out of storage as
   whatever was last written there — and a start the marks can't label would
   otherwise build a game of fewer than ten rounds. */
export function mbRounds(start) {
  const entered = Math.floor(Number(start));
  const first = Number.isFinite(entered)
    ? Math.min(Math.max(entered, MB_LOWEST_START), MB_ROUNDS_IN_GAME)
    : MB_ROUNDS_IN_GAME;

  // The opening round again for every round the countdown is short of ten.
  const extra = MB_ROUNDS_IN_GAME - first;
  const opening = REPEAT_MARKS.slice(0, extra).map((mark) => `${first}${mark}`);

  const countdown = [];
  for (let round = first; round >= 1; round -= 1) {
    countdown.push(String(round));
  }

  return [...opening, ...countdown];
}

/* How many tricks are on the table in a round: the round's own number, with any
   repeat mark read past. parseInt rather than Number, because Number('9+') is
   NaN and the mark is exactly what has to be ignored. */
export function tricksIn(round) {
  return parseInt(round, 10);
}

/* Which round a game opened on, read back off the rounds it holds. Every mark in
   a game sits on its opening round, so the first marked round found names it;
   nothing marked is the ordinary game that opened on ten.

   Read back rather than stored, because the round names already say it — `8+` is
   a round only a game that opened on eight has — so there is no second copy of
   the answer to keep in step. */
export function mbStartingRound(rounds) {
  const marked = [...rounds].find((round) => MARKED.test(round));
  return marked ? tricksIn(marked) : MB_ROUNDS_IN_GAME;
}

/* The rounds a sheet is being played over, which is any player's row: emptySheet
   below seeds every round of every player up front, and so does the rebuild a
   finished game is opened back up on — see rebuildSheet in helpers/editGame.js.

   Read off the sheet rather than worked out again from where the game opened, so
   a sheet restored from storage and a finished game reopened both keep the rounds
   they were actually played on rather than whichever start was last picked. */
export function sheetRounds(scores) {
  const first = scores.values().next().value;
  return first ? [...first.keys()] : [];
}

/* Taking every trick you bid for is worth a bonus, and a bigger one if what you
   bid for was the whole round. Round one is the exception: one trick out of one
   is the same feat but a far easier bet, so it pays less.

   Blank until both halves are in — a score off a bid with no took yet would read
   as a round that had been played. */
export function roundScore(round, bid, took) {
  const target = tricksIn(round);
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

  return String(Math.min(Math.max(entered, 0), tricksIn(round)));
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
   that isn't there yet — the cell renderer always has a cell, Auto Step can walk
   the rounds it can see, and sheetRounds above can read the round list back off
   any row.

   Which rounds those are depends on where the game opens, so it's asked for
   rather than assumed. Ten by default: the ordinary game, and what a caller with
   nothing to say about it means. */
export function emptySheet(players, start = MB_ROUNDS_IN_GAME) {
  const rounds = mbRounds(start);

  return new Map(players.map((player) => [
    player,
    new Map(rounds.map((round) => [round, emptyCell()]))
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


/* How a round's bidding came out against the tricks on the table: 'under' when
   the table called for fewer than there are, 'over' when it called for more, and
   null when it called for exactly them.

   Both tables colour the round number with it, which is the point of it: an
   overbid round has somebody in it who must be set and an underbid one has a
   trick going spare, and that reads better at the top of the column than it does
   added up by hand across the row.

   Null too while a round is still being called, because a round only half bid is
   under by definition and a column that said so from the first bid would be
   saying nothing. A player with no cell at all is passed over rather than counted
   as still to call: that's how the stats page holds a round somebody had already
   been removed before, since an unplayed round is never written (buildScoreRows
   in api/routes.js). The sheet seeds every round of every player, so there it's
   the caller that passes the players still in. */
export function bidLean(players, scores, round) {
  let called = 0;
  let counted = 0;

  for (const player of players) {
    const cell = scores.get(player)?.get(round);
    if (!cell) {
      continue;
    }
    if (isBlank(cell, 'bid')) {
      return null;
    }

    called += Number(cell.bid);
    counted += 1;
  }

  if (counted === 0) {
    return null;
  }

  const left = tricksIn(round) - called;
  if (left === 0) {
    return null;
  }

  return left > 0 ? 'under' : 'over';
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

  return { left: tricksIn(round) - bid, remaining };
}
