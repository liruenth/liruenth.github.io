/*
The parts of a score sheet's grid that don't depend on what a round is: how tall
a row is, how wide the columns get, which two are frozen, and how a row is built
out of the sheet.

Apart from AGGrid.jsx, which is the component that renders with them, so that
file exports a component and nothing else — anything else in it and a change to
the sheet reloads the page instead of hot-swapping the grid.

Both games' tables import from here: contract_rummy/contract_rummy_table.jsx and
mormon_bridge/mormon_bridge_table.jsx.
*/
import { useState, useEffect } from 'react'

// Set explicitly rather than left to the theme so the height math in AGGrid.jsx
// can know what the grid will actually render. ROW_HEIGHT is the default a sheet
// gets; a game whose cell holds more than one number passes its own.
export const ROW_HEIGHT = 28;
export const HEADER_HEIGHT = 32;

// A 100px floor reads well on a desktop, but on a phone the two pinned columns
// alone would take most of the screen and leave the rounds no room, so the floor
// drops on small screens. Kept in step with the breakpoint in AGGrid.css —
// minWidth is a column value, so it can't come from the media query itself.
export const MIN_COL_WIDTH = 100;
export const MIN_COL_WIDTH_SMALL = 48;
const SMALL_SCREEN = '(max-width: 1024px)';

// The pinned columns hold a name and a running total — fixed content that
// doesn't get wider with the screen. They're sized to it and kept out of the
// flex share, so the spare width goes to the round columns instead of padding
// these two out.
const PLAYER_COL_WIDTH = 200;
const TOTAL_COL_WIDTH = 100;
const TOTAL_COL_WIDTH_SMALL = 64;

/* What a name needs on a small screen, where the column can't just be given the
   200px the desktop one has.

   The grid renders in Balham, which is a 12px font, and a name on the sheet is
   usually in capitals — the roster comes back from the API that way, and so does
   a finished game opened up to be edited (see fetchFamilyPlayers in
   api/routes.js). Capitals at 12px run about eight to the character, which is
   what this is.

   The chrome is the cell's own padding — tightened to 4px a side on small
   screens, see AGGrid.css — plus room for the place Mormon Bridge writes after
   the name. Contract Rummy has no place beside its names and so gets those few
   pixels as slack, which is cheaper than a second constant for the sake of them. */
const NAME_CHAR_WIDTH = 8;
const NAME_CELL_CHROME = 18;

/* Wide enough for the longest name on this sheet, but held between two ends: a
   table of short names keeps the width the column has always had, and one long
   name can't take the screen away from the rounds, which are what the sheet is
   for. Past the top of it a name is still cut short — but it's cut short at
   thirteen characters rather than six. */
const PLAYER_COL_WIDTH_SMALL_MIN = 64;
const PLAYER_COL_WIDTH_SMALL_MAX = 124;

/* The grid orders nothing on either sheet — not its rows, and not its columns.

   The rows, because each game already has an order and it means something.
   Mormon Bridge's are the seating, which is what the bidding goes round and what
   Auto Step walks. Contract Rummy's are a ranking the sheet keeps itself as
   rounds finish, and the lines dividing it into groups are drawn by row position
   — so a sort laid over the top would move the rows out from under the lines.

   The columns, because a round is only the round it is for where it falls: the
   countdown from ten, or the climb from two sets to three runs.

   Both sheets pass this as their defaultColDef, and it's shared rather than
   written twice because it's the same statement about both. Module-level, too:
   SheetGrid memoises the column defaults against this object, so a fresh one on
   each render would re-initialise every column as fast as the sheet could be
   typed into. */
export const NO_REORDER = { sortable: false, suppressMovable: true };

// A grid-driven change ('data') would loop back through rowData, so only
// write on edits the user made themselves. Our own total write uses its own
// source so the recalc it triggers gets filtered out here too.
export const MANUAL_SOURCES = ['edit', 'paste', 'undo', 'redo'];
export const TOTAL_SOURCE = 'rowTotal';

// Background for a data row, chosen from its running total. The bands are still
// to be decided, so every path returns null for now and rows keep the theme's
// own background.
function rowBackground(total) {
  if (!Number.isFinite(total)) {
    return null;
  }

  // TODO: pick the colours — e.g. leader vs middle of the pack vs trailing
  return null;
}

/* Rows are styled by their total, which AG Grid only reads when a row is drawn —
   so a sheet that repaints a total has to ask for the row again too. Shared, so
   both games band their rows the same way. */
export function getRowStyle(params) {
  const background = rowBackground(params.data?.total);
  return background ? { background } : undefined;
}

/* One row per player, in the sheet's own key order. `total` is the game's own row
   total, since what a cell holds — and so how it adds up — is the one thing the
   two sheets don't agree on.

   A restored sheet already holds scores, so spread them onto the row. */
export function buildRows(scoreData, cols, total) {
  return [...scoreData.keys()].map((player) => ({
    player,
    ...Object.fromEntries(scoreData.get(player)),
    total: total(scoreData.get(player), cols)
  }));
}

// Whether the sheet is on a small screen, which both the column widths and
// single-click editing key off.
export function useSmallScreen() {
  const [smallScreen, setSmallScreen] = useState(() => window.matchMedia(SMALL_SCREEN).matches);

  useEffect(() => {
    const query = window.matchMedia(SMALL_SCREEN);
    const update = (event) => setSmallScreen(event.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return smallScreen;
}

/* How wide the name column has to be for the names actually on this sheet.

   Measured off the roster rather than set to a number picked in advance, because
   the number that fits is the number that fits these players: a table of Jims
   and Sals wants none of the screen and a table with a Christopher at it wants
   twice what the sheet used to give. The desktop column is wide enough for any
   of them, so only the small screen asks.

   Handed back as a number for the caller to put in its column memo, rather than
   worked out inside pinnedColumnDefs below off the roster itself. The roster is
   a fresh array on every render and the width is not — so this way the columns
   are rebuilt when a name changes rather than every time a cell is committed,
   which matters because rebuilding a column takes its inputs with it. */
export function playerColumnWidth(smallScreen, players) {
  if (!smallScreen) {
    return PLAYER_COL_WIDTH;
  }

  const longest = players.reduce((most, player) => Math.max(most, player.length), 0);
  const wanted = (longest * NAME_CHAR_WIDTH) + NAME_CELL_CHROME;

  return Math.min(Math.max(wanted, PLAYER_COL_WIDTH_SMALL_MIN), PLAYER_COL_WIDTH_SMALL_MAX);
}

/* The name and the running total, frozen either side of the round columns.
   Shared rather than written per game so both sheets freeze the same two columns
   the same way.

   flex: 0 opts them out of the width sharing, and their own minWidth overrides
   the floor in defaultColDef, which would otherwise hold them open to the round
   columns' minimum.

   The name column is the one that's measured, so its width is passed in — see
   playerColumnWidth above. Defaulted for a caller with nothing to say about it,
   which is the width the column had before it was measured at all. */
export function pinnedColumnDefs(smallScreen, playerWidth) {
  const nameWidth = playerWidth ?? (smallScreen ? PLAYER_COL_WIDTH_SMALL_MIN : PLAYER_COL_WIDTH);
  const totalWidth = smallScreen ? TOTAL_COL_WIDTH_SMALL : TOTAL_COL_WIDTH;

  return {
    playerCol: {
      field: 'player',
      pinned: 'left',
      flex: 0,
      width: nameWidth,
      minWidth: nameWidth,
      // What the tightened padding in AGGrid.css hangs off — the column is
      // sized to the name, so the cell can't go on keeping 8px a side for itself.
      cellClass: 'sheet-player-cell',
      headerClass: 'sheet-player-cell'
    },
    totalCol: {
      field: 'total',
      pinned: 'right',
      flex: 0,
      width: totalWidth,
      minWidth: totalWidth
    }
  };
}
