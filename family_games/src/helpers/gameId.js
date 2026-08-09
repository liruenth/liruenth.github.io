/*
How a game is filed: the date it was played on and its number within that date.
Both are read by the API layer, which stamps them onto every row it writes, and
by the score sheet, which counts games on as they're finished.
*/

const GAME_ID_KEY = 'nextGameId';
const GAME_DATE_KEY = 'date';
const SUBMITTED_KEY = 'gameSubmitted';

// Local date, not toISOString() — that reports UTC, which rolls the date over
// early or late for anyone not on it.
export function today() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

// Every row of a submitted game shares this id, so it doubles as the id of the
// game itself. Kept in sessionStorage rather than a module variable so a refresh
// mid-game doesn't reset it and file the next game under one already used.
//
// Ids only have to be unique within a day, since the rows carry the date too,
// so they start over at 1 on a date that isn't the one they were last counted
// under. A missing date reads the same as a stale one: both mean the count
// running now isn't today's. That covers a tab left open overnight — the one
// case where a session outlives the day it started in.
export function currentGameId() {
  const startedOn = sessionStorage.getItem(GAME_DATE_KEY);
  const now = today();

  if (startedOn !== now) {
    sessionStorage.setItem(GAME_DATE_KEY, now);
    sessionStorage.setItem(GAME_ID_KEY, '1');
    // The count starting over hands out an id nothing has been filed under yet,
    // so what was submitted under yesterday's numbering doesn't stand for it.
    sessionStorage.removeItem(SUBMITTED_KEY);
    return 1;
  }

  const saved = Number(sessionStorage.getItem(GAME_ID_KEY));
  return Number.isInteger(saved) && saved > 0 ? saved : 1;
}

// Counted on when the next game starts rather than when a submit lands, so a
// failed attempt can be retried under the same id rather than burning one.
export function bumpGameId() {
  sessionStorage.setItem(GAME_ID_KEY, String(currentGameId() + 1));
  // The id just handed out has nothing filed under it yet
  sessionStorage.removeItem(SUBMITTED_KEY);
}

/* Whether the id running now has made it onto a row. Stored alongside the id and
   for the same reason: a refresh mid-game mustn't lose it, or the game would look
   unsubmitted and the next one would be filed on top of it.

   Set on a submit landing rather than on one being attempted, so a failure leaves
   the id as unused as it was — the same thing the id itself is counted on late for. */
export function markGameSubmitted() {
  sessionStorage.setItem(SUBMITTED_KEY, '1');
}

export function gameSubmitted() {
  return sessionStorage.getItem(SUBMITTED_KEY) === '1';
}
