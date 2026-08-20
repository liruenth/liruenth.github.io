/* Which round a Mormon Bridge game opens on.

   Kept in storage rather than handed over by the roster screen's confirm, the
   same bargain the group count strikes in groups.js: the sheet is what needs it,
   it's read back there, and passing it as well would leave two paths to one
   number.

   Wanted once and once only, when the sheet is seeded. After that the sheet
   carries its own rounds — sheetRounds in mormonBridge.js reads them back off it
   — so nothing has to keep this in step with a game in progress, and a finished
   game opened back up for editing brings the rounds it was played on rather than
   whatever was last picked here.
*/
import { MB_ROUNDS_IN_GAME, MB_LOWEST_START } from './mormonBridge';

/* Where the choice is kept. Cleared with the rest of the sheet when a new game
   starts, so the next game doesn't inherit the last one's opening round — see
   ScoreSheet.jsx and clearDesk in editGame.js. */
export const STARTING_ROUND_KEY = 'startingRound';

/* The one clamp everything that touches the choice goes through. It's picked by
   hand on the roster screen, it reads back out of storage as a plain string, and
   it outlives the game it was picked for, so no caller can assume it's a round a
   game can open on.

   Anything else reads as ten, which is the ordinary game — the same answer a
   game nobody was asked about gets. */
export function clampStartingRound(value) {
  const entered = Math.floor(Number(value));
  return Number.isFinite(entered) && entered >= MB_LOWEST_START && entered <= MB_ROUNDS_IN_GAME
    ? entered
    : MB_ROUNDS_IN_GAME;
}

export function readStartingRound() {
  return clampStartingRound(localStorage.getItem(STARTING_ROUND_KEY));
}

export function saveStartingRound(round) {
  localStorage.setItem(STARTING_ROUND_KEY, String(round));
}
