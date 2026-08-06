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
const PLAYER_COL_WIDTH_SMALL = 64;
const TOTAL_COL_WIDTH = 100;
const TOTAL_COL_WIDTH_SMALL = 64;

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

/* The name and the running total, frozen either side of the round columns.
   Shared rather than written per game so both sheets freeze the same two columns
   at the same widths.

   flex: 0 opts them out of the width sharing, and their own minWidth overrides
   the floor in defaultColDef, which would otherwise hold them open to the round
   columns' minimum. */
export function pinnedColumnDefs(smallScreen) {
  const playerWidth = smallScreen ? PLAYER_COL_WIDTH_SMALL : PLAYER_COL_WIDTH;
  const totalWidth = smallScreen ? TOTAL_COL_WIDTH_SMALL : TOTAL_COL_WIDTH;

  return {
    playerCol: {
      field: 'player',
      pinned: 'left',
      flex: 0,
      width: playerWidth,
      minWidth: playerWidth
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
