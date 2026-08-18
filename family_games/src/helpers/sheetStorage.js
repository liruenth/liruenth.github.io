/*
Where a score sheet in progress is kept, and how it survives being written down.

One sheet at a time, under one key. The score sheet saves to it as cells are
edited and reads it back on the next visit; the stats page writes to it too, to
hand a finished game over to be edited — which is the reason this isn't private
to ScoreSheet.jsx any more.
*/

export const SHEET_KEY = 'scoreData';

/* A sheet is Maps inside Maps, which JSON has no notion of, so each one is
   written out marked as what it is and read back by that mark.

   Marked rather than guessed at: a Mormon Bridge round is an object of its own —
   a bid, a took and a score — and a reviver that turned every object it met into
   a Map would swallow it along with the two it's meant to catch. */
const MAP_MARK = '__map';

function mapReplacer(key, value) {
  return value instanceof Map ? { [MAP_MARK]: [...value] } : value;
}

function mapReviver(key, value) {
  return value && Array.isArray(value[MAP_MARK]) ? new Map(value[MAP_MARK]) : value;
}

export function saveSheet(scoreData) {
  localStorage.setItem(SHEET_KEY, JSON.stringify(scoreData, mapReplacer));
}

/* A sheet saved before the marks above were written is unreadable now. There's
   nothing to migrate — it's a game in progress, not history, and history lives in
   DynamoDB — so it's dropped and the sheet starts over rather than restoring
   something it can't use. */
export function restoreSheet() {
  const saved = localStorage.getItem(SHEET_KEY);
  if (!saved) {
    return null;
  }

  try {
    const parsed = JSON.parse(saved, mapReviver);
    return parsed instanceof Map ? parsed : null;
  } catch {
    return null;
  }
}

export function clearSheet() {
  localStorage.removeItem(SHEET_KEY);
}
