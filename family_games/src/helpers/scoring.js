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
