/* Scoring rules shared by the sheet and the components around it. A sheet is a
   Map of player name to a Map of column to score, and `cols` is the round list. */

// Editors hand back strings, and unplayed rounds are blank, so skip anything
// that isn't a real number rather than letting it poison the sum with NaN.
export function rowTotal(playerScores, cols) {
  return cols.reduce((sum, col) => {
    const score = Number(playerScores.get(col));
    return Number.isFinite(score) ? sum + score : sum;
  }, 0);
}

/* The row total as it stood at each round: a Map of round to the sum of every
   score up to and including it, for a table that shows where a player was on the
   way through as well as where they ended up.

   Only the rounds that were played get an entry. A round left blank was never
   played — the same thing rowTotal above skips — and a total written against it
   wouldn't be the total going into it, it would be a number the game never stood
   at. So it reads back blank, exactly as the score beside it does. */
export function runningTotals(playerScores, cols) {
  const totals = new Map();
  let sum = 0;

  for (const col of cols) {
    const value = playerScores.get(col);
    const score = Number(value);

    // Number('') is nought rather than NaN, so a blank has to be ruled out on the
    // value itself — otherwise an unplayed round would take an entry holding the
    // total of the rounds before it.
    if (value === undefined || value === null || value === '' || !Number.isFinite(score)) {
      continue;
    }

    sum += score;
    totals.set(col, sum);
  }

  return totals;
}

/* A column is finished once nobody is still blank in it, whatever order it got
   filled in. Editors hand back strings, so an empty one is unplayed, not a score.

   `skip` is the players who are out of play. Their rows stay on the sheet with the
   rounds they did play, but they'll never fill in another — so counting them would
   leave every column from their removal on unfinished, and a sheet that ranks
   itself as rounds finish would quietly stop. */
export function columnComplete(scoreData, col, skip) {
  const playing = [...scoreData.keys()].filter((player) => !skip?.has(player));
  if (playing.length === 0) {
    return false;
  }

  return playing.every((player) => {
    const score = scoreData.get(player).get(col);
    return score !== undefined && score !== null && score !== '';
  });
}

// The furthest round everyone has finished, or null if none has been. Searched
// from the end, since that's the one a late joiner is caught up to.
export function lastCompleteCol(scoreData, cols, skip) {
  for (let i = cols.length - 1; i >= 0; i -= 1) {
    if (columnComplete(scoreData, cols[i], skip)) {
      return cols[i];
    }
  }

  return null;
}

// Where a player joining mid-game starts: the middle of the field as it stands,
// so they're neither handed the lead nor left unable to catch up.
export function averageTotal(scoreData, cols) {
  if (scoreData.size === 0) {
    return 0;
  }

  const sum = [...scoreData.keys()].reduce(
    (total, player) => total + rowTotal(scoreData.get(player), cols),
    0
  );

  return Math.round(sum / scoreData.size);
}

/* The sheet's own key order is the row order, so ranking players means rebuilding
   the Map in the new order. Inner Maps are carried over by reference, so no score
   is copied or lost.

   `removed` is who's out of play. They rank below everyone still playing whatever
   their total: it can't move again, so it isn't a position in a game that's still
   being played. Among themselves they're ranked the same way as anyone else.

   `total` is how this game adds a row up, since not every one of them sums its
   cells — Mormon Bridge's hold a bid and a took as well as the score. Defaulted
   to the plain sum, which is what the sheet that does sum its cells passes. */
export function sortedByTotal(scoreData, cols, removed, total = rowTotal) {
  const outOfPlay = (player) => (removed?.has(player) ? 1 : 0);
  const rank = (player) => total(scoreData.get(player), cols);

  const ranked = [...scoreData.keys()].sort((a, b) => (
    outOfPlay(a) - outOfPlay(b) || rank(a) - rank(b)
  ));

  return new Map(ranked.map((player) => [player, scoreData.get(player)]));
}

/* Where everyone stands, as a place per player rather than as an order: the same
   ranking sortedByTotal builds, for a sheet that shows a player's position beside
   their name instead of moving their row to it.

   Level totals share a place and the places after them are skipped — 1, 2, 2, 4 —
   so a place is always "how many are ahead of you, plus one" rather than a count
   of the distinct totals above.

   `wins` is which end of the totals leads, since the games disagree; it takes what
   helpers/gameTypes.js says. Out of play still ranks below the field for the same
   reason it does there, and a removed player never shares a place with someone
   still playing even on the same total. */
export function positionsByTotal(scoreData, cols, removed, total = rowTotal, wins = 'low') {
  const outOfPlay = (player) => (removed?.has(player) ? 1 : 0);
  const rank = (player) => total(scoreData.get(player), cols);
  const ahead = wins === 'high' ? -1 : 1;

  const ranked = [...scoreData.keys()].sort((a, b) => (
    outOfPlay(a) - outOfPlay(b) || ahead * (rank(a) - rank(b))
  ));

  const positions = new Map();
  let place = 0;
  let previous = null;

  ranked.forEach((player, index) => {
    const standing = `${outOfPlay(player)}:${rank(player)}`;
    if (standing !== previous) {
      place = index + 1;
      previous = standing;
    }

    positions.set(player, place);
  });

  return positions;
}
