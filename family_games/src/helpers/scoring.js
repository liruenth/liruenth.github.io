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

// A column is finished once nobody is still blank in it, whatever order it got
// filled in. Editors hand back strings, so an empty one is unplayed, not a score.
export function columnComplete(scoreData, col) {
  if (scoreData.size === 0) {
    return false;
  }

  return [...scoreData.keys()].every((player) => {
    const score = scoreData.get(player).get(col);
    return score !== undefined && score !== null && score !== '';
  });
}

// The furthest round everyone has finished, or null if none has been. Searched
// from the end, since that's the one a late joiner is caught up to.
export function lastCompleteCol(scoreData, cols) {
  for (let i = cols.length - 1; i >= 0; i -= 1) {
    if (columnComplete(scoreData, cols[i])) {
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

// The sheet's own key order is the row order, so ranking players means rebuilding
// the Map in the new order. Inner Maps are carried over by reference, so no score
// is copied or lost.
export function sortedByTotal(scoreData, cols) {
  const ranked = [...scoreData.keys()].sort((a, b) => (
    rowTotal(scoreData.get(a), cols) - rowTotal(scoreData.get(b), cols)
  ));

  return new Map(ranked.map((player) => [player, scoreData.get(player)]));
}
