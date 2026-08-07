/* Splitting a sheet into groups. Which rows a group holds is the only thing the
   sheet needs to know about them — the grouping isn't stored on a player, it's
   read off where they've ended up in the ranking. */

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
