/* Splitting a sheet into groups. Which rows a group holds is the only thing the
   sheet needs to know about them — the grouping isn't stored on a player, it's
   read off where they've ended up in the ranking. */

/* Where the count is kept. Saved rather than held in state alone so a refresh
   brings the groups back along with the scores it restores, and cleared with the
   rest of the sheet when a new game starts — see ScoreSheet.jsx. */
export const GROUPS_KEY = 'numGroups';

/* The one clamp everything that touches the count goes through: it's typed into
   by hand in two places — the roster screen before the game and the modal during
   it — it reads back out of storage as a plain string, and it outlives the sheet
   it was picked for, so no caller can assume it's a number in range.

   Anything that isn't a whole number of at least one reads as one group, which is
   what an unsplit sheet is. */
export function clampGroups(value, maxGroups) {
  const entered = Math.floor(Number(value));
  return Number.isFinite(entered) && entered >= 1 ? Math.min(entered, maxGroups) : 1;
}

// Clamped on the way in as well as on the way out, since the stored count was
// picked for whatever roster was playing then, not the one asking now.
export function readGroups(maxGroups) {
  return clampGroups(localStorage.getItem(GROUPS_KEY), maxGroups);
}

export function saveGroups(count) {
  localStorage.setItem(GROUPS_KEY, String(count));
}

/* Where one group ends and the next begins, as row indexes counted from 0.

   The rows divide as evenly as they can: with `n` rows over `g` groups every group
   takes floor(n / g), and the remainder is handed out one row at a time from the
   top. So 11 rows over 3 groups come out 4, 4, 3. */
export function groupEndRows(rowCount, groups) {
  if (groups < 1 || rowCount < 1) {
    return new Set();
  }

  const size = Math.floor(rowCount / groups);
  const remainder = rowCount % groups;
  const ends = new Set();

  /* The groups that take the extra row come first, so the bigger blocks sit at the
     top of the sheet.

     The last group's end is the sheet's own last row, and a line there would read
     as the bottom of the table rather than a split in it — so only the boundaries
     between groups are kept. Which is also why one group marks nothing, and why
     asking for more groups than there are rows can't mark the same row twice. */
  let end = -1;
  for (let group = 0; group < groups; group += 1) {
    end += size + (group < remainder ? 1 : 0);
    if (end < rowCount - 1) {
      ends.add(end);
    }
  }

  return ends;
}
