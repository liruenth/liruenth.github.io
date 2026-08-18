/*
Opening a finished game back up on the score sheet.

The stats page hands a game over; the score sheet picks it up and, when it is
submitted, files it under the id and date it already had rather than under the id
the day is counting. Everything either side needs is put into storage here, in
one place, because a handoff that missed a key would leave the sheet holding half
of one game and half of another.

Storage rather than router state, for the same reason the sheet keeps its scores
there: a refresh part-way through an edit that lost the session would carry on as
an ordinary game and file it as a new one, on top of whatever the day's counter
happened to be pointing at.
*/
import { bumpGameId, gameSubmitted } from './gameId';
import { GROUPS_KEY, saveGroups } from './groups';
import { saveSheet, clearSheet } from './sheetStorage';
import { emptyCell } from './mormonBridge';
import { roundCellFor } from './gameTypes';
import { REMOVED_KEYS } from '../pages/score_sheets/common/removedPlayers';

const EDIT_KEY = 'editingGame';

export function editingGame() {
  const saved = localStorage.getItem(EDIT_KEY);
  if (!saved) {
    return null;
  }

  try {
    const parsed = JSON.parse(saved);
    // A session naming neither of the two things it exists to carry is no
    // session — better dropped than used to file a game under `undefined`.
    return parsed?.number && parsed?.date ? parsed : null;
  } catch {
    return null;
  }
}

// Forgets the edit without touching the sheet: what's on the desk stays there,
// it just stops being an edit of anything and goes back to being a game.
export function stopEditing() {
  localStorage.removeItem(EDIT_KEY);
}

/* Everything a game leaves behind, so the next one doesn't inherit it. The same
   set ScoreSheet's own new-game clears, plus the removals — which live with the
   sheets that offer them and so are cleared by neither end of a handoff that
   never goes through a new game. */
function clearDesk() {
  clearSheet();
  localStorage.removeItem('gameType');
  localStorage.removeItem(GROUPS_KEY);
  REMOVED_KEYS.forEach((key) => localStorage.removeItem(key));
}

/* A finished game back into the sheet it was played on.

   Rows in seat order where the game knows them, since the seats are worked out
   again from the row order when the edit is written back — a Contract Rummy game
   opened in its ranking would file the ranking as the seating. Where no seat was
   ever stored the game's own order is as good as there is.

   Every round the game holds is carried over, including any the type no longer
   lists: those rounds are still written back, and dropping them here would file
   an edit that deleted them. Mormon Bridge additionally gets a blank cell for the
   rounds it never reached — its cell renderer shows a round with no cell as one
   that can't be played, so without this an edit couldn't finish a game that ended
   early. Contract Rummy needs no such thing: a missing round is an empty cell
   there, and typing into it makes one. */
function rebuildSheet(game) {
  const bidTook = roundCellFor(game.type) === 'bid-took';
  const order = game.seated ?? game.order;

  return new Map(order.map((player) => {
    const played = game.scores.get(player);

    if (!bidTook) {
      return [player, new Map(played)];
    }

    const rounds = new Map(game.rounds.map((round) => [round, emptyCell()]));
    for (const [round, cell] of played) {
      rounds.set(round, { ...cell });
    }

    return [player, rounds];
  }));
}

/* Hands a game to the score sheet and marks it as being edited. Guard with
   canEdit in statsData.js before calling: a game with no counter or of a type the
   sheet doesn't know can't be written back.

   The day's id is counted on first. It's the one thing here that isn't about the
   game being edited: the sheet being cleared takes with it whatever was on it,
   and if that game had been submitted then its id has been used — so it's retired
   now rather than left for the next game to file itself on top of. Done here
   rather than when the edit finishes, so an edit that's abandoned still leaves the
   counter somewhere safe. */
export function startEditing(game, familyName) {
  if (gameSubmitted()) {
    bumpGameId();
  }

  clearDesk();

  localStorage.setItem('gameType', game.type);
  /* One group. How a finished game's table was split isn't stored anywhere, so
     there's nothing to restore and one group is the honest answer. It also holds
     the Contract Rummy sheet still: it re-ranks its rows only while it's split,
     and rows that moved would be written back as seats that moved. */
  saveGroups(1);
  if (familyName) {
    localStorage.setItem('familyName', familyName);
  }

  saveSheet(rebuildSheet(game));

  localStorage.setItem(EDIT_KEY, JSON.stringify({
    number: game.gameNumber,
    // The key's date, not the shown one — see idDate in statsData.js
    date: game.idDate ?? game.date,
    family: familyName,
  }));
}

// The edit is filed and done with: clear it away so the sheet opens on a new game
// rather than on the one that's already been written back.
export function finishEditing() {
  clearDesk();
  stopEditing();
}
