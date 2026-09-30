/*
Mormon Bridge's sheet: one column per round, and each round cell holds three
values rather than one — what the player bid, what they took, and the score the
two of them work out to.

The three sit in the cell as triangles that tile it exactly: bid in the top-left
wedge, took in the top-right, and the score across the bottom with its base on
the cell's bottom edge. Geometry is in round_cell.css, which the stats page draws
a finished game with too; the short version is that a triangle whose base is a
whole edge takes half the cell, which is what leaves the score the big one and
bid and took a quarter each. mormon_bridge_table.css is only what that cell needs
from the grid around it.

The two inputs are ours, not AG Grid's editor: one AG Grid cell can only have one
editor, and this cell needs two. So the round columns are editable: false and the
writing below goes straight into the sheet.

Everything about the grid itself — theme, frozen columns, responsive widths,
viewport height — comes from SheetGrid in common/AGGrid.jsx and the pieces beside
it in common/sheetGrid.js, the same as Contract Rummy's table.
*/
import { useMemo, useCallback, useRef, useEffect, useReducer } from 'react'
import SheetGrid from '../common/AGGrid';
import {
  buildRows,
  pinnedColumnDefs,
  playerColumnWidth,
  useSmallScreen,
  NO_REORDER,
  TOTAL_SOURCE
} from '../common/sheetGrid';
import RoundWedges from './RoundWedges';
import {
  activePlayers,
  bidLean,
  clampToRound,
  mbRowTotal,
  setCellValue,
  tookTally,
  tricksIn
} from '../../../helpers/mormonBridge';
import { positionsByTotal } from '../../../helpers/scoring';
import { winsWith } from '../../../helpers/gameTypes';
import './round_cell.css';
import './mormon_bridge_table.css';

/* Three wedges, two of them typed into, so a row needs about twice the height a
   single number does. SheetGrid mirrors it into --sheet-row-height, which is what
   the CSS positions the wedges' text against — so this is the one place it's set.

   The header carries the same three wedges, so it's the same height. */
const MB_ROW_HEIGHT = 52;
const MB_HEADER_HEIGHT = 52;

/* A round cell. The wedges render straight off the cell object rather than
   mirroring it into state, so there's one copy of a bid and it's the one that
   gets submitted — writing mutates that object and then asks for a repaint. */
function RoundCell({ data, value, colDef, node, onEnter, onCommit, getOverTaken, watchRound }) {
  const [, repaint] = useReducer((count) => count + 1, 0);
  const round = colDef.field;

  /* A took entered three rows up can turn this cell red, so the cell has to be
     reachable by something that isn't it. It hands its own repaint to the table
     and is asked for one when its round's tooks stop adding up — see watchRound
     below for why the grid's own refresh can't be what does the asking. */
  useEffect(() => watchRound(round, repaint), [watchRound, round, repaint]);

  const cell = value;
  const disabled = !!data.disabled;
  // Read off the table rather than handed over in the column's params, for the
  // same reason the heading reads its lean — see the note on getLean below.
  const tookOver = getOverTaken(round);

  // A sheet saved before a round existed wouldn't have a cell for it. Nothing
  // writes one now, so show the round as unplayable rather than crash on it.
  if (!cell) {
    return null;
  }

  const write = (field) => (event) => {
    onEnter(node, round, field, event.target.value);
    repaint();
  };

  // Held back until focus leaves rather than run on every keystroke: it's what
  // hands a new Map up to be saved, and doing that mid-entry rebuilds the rows
  // under a cursor that's still in one of them.
  const commit = () => {
    onCommit(node, round);
    repaint();
  };

  return (
    <div className="mb-round">
      <input
        className="mb-wedge mb-wedge-bid"
        type="number"
        inputMode="numeric"
        min="0"
        max={tricksIn(round)}
        step="1"
        aria-label={`${data.player} bid, round ${round}`}
        disabled={disabled}
        value={cell.bid}
        onChange={write('bid')}
        onBlur={commit}
      />
      {/* Reddened where the round's tooks add up to more tricks than were dealt.
          On every took in the column rather than on the one that tipped it over,
          because which of them is wrong is exactly what the sheet can't know —
          what it can say is that one of these numbers is. */}
      <input
        className={tookOver ? 'mb-wedge mb-wedge-took mb-took-over' : 'mb-wedge mb-wedge-took'}
        type="number"
        inputMode="numeric"
        min="0"
        max={tricksIn(round)}
        step="1"
        aria-label={`${data.player} took, round ${round}`}
        disabled={disabled}
        value={cell.took}
        onChange={write('took')}
        onBlur={commit}
      />
      {/* Worked out from the other two, so there's nothing to type here — a
          disabled input rather than plain text, so it reads as a cell that's
          closed rather than one nobody has got to yet. */}
      <input
        className="mb-wedge mb-wedge-score"
        type="text"
        tabIndex={-1}
        readOnly
        disabled
        aria-label={`${data.player} score, round ${round}`}
        value={cell.score}
      />
    </div>
  );
}

/* The player's name with where they stand beside it, so the sheet says who's
   winning without moving anyone.

   The rows here are the seating — the order the bidding goes round, and what
   Auto Step walks — so nothing the grid does may reorder them: see NO_REORDER in
   common/sheetGrid.js, which both sheets pass. Which is the whole reason the
   place has to be written on the row rather than shown by it. (A seat that has
   really changed is said outright in the Players modal — see MormonBridge.jsx —
   which is a different thing from the grid ranking the table under whoever is
   typing into it.)

   A superscript rather than a column of its own: it's read alongside the name,
   and the pinned column is already the narrowest thing on a phone. */
function PlayerCell({ data }) {
  return (
    <span className="mb-player">
      {/* The name is its own element so it's the part that gets cut short on a
          narrow column — a place trimmed off the end would be the half of this
          the row can't say any other way. */}
      <span className="mb-player-name">{data.player}</span>
      {data.position ? <sup className="mb-position">{data.position}</sup> : null}
    </span>
  );
}

/* The same three wedges as a cell, so the columns read as what's under them:
   which side is the bid, which the took, and the round across the bottom.

   The round number is coloured where the bidding didn't add up to it, and the
   took label where the taking came to more than the round holds — so a column
   scrolled away from its own cells still says which one it is. Both are asked
   for rather than handed over: see the note on getLean below for why neither
   answer can ride in the column's params. */
function RoundHeader({ round, getLean, getOverTaken }) {
  return (
    <RoundWedges
      heading
      bid="bid"
      took="took"
      score={round}
      lean={getLean(round)}
      tookOver={getOverTaken(round)}
    />
  );
}

// Greys out a player who's been removed. Static, since it reads the flag off the
// row rather than closing over the set it came from.
const rowClassRules = { 'mb-row-disabled': (params) => !!params.data?.disabled };

const MormonBridgeTable = ({ scoreData, cols, setScoreData, disabledPlayers }) => {
  const smallScreen = useSmallScreen();

  /* A number rather than the roster, so the columns are rebuilt when a name
     changes rather than on every render — see playerColumnWidth in
     common/sheetGrid.js. Rebuilding a column here takes its two inputs with it,
     so "every render" would mean losing the cursor on every commit. */
  const playerWidth = playerColumnWidth(smallScreen, [...scoreData.keys()]);

  /* Writes the entered value into the sheet and re-scores the round — through the
     same helper Auto Step writes with, so the two ways of entering a bid can't
     drift apart. The total is the one thing outside this cell that moves, and it's
     repainted on its own: asking the grid to redraw the row would take the focus
     out of the input being typed into. */
  const onEnter = useCallback((node, round, field, entered) => {
    const playerRounds = scoreData.get(node.data.player);
    if (!playerRounds) {
      return;
    }

    setCellValue(scoreData, node.data.player, round, field, entered);
    node.setDataValue('total', mbRowTotal(playerRounds, cols), TOTAL_SOURCE);
  }, [scoreData, cols]);

  /* On the way out of a cell: hold the entry to the round it was played in, then
     hand a new Map up so the sheet gets saved. Clamped here rather than while
     typing, so a two-digit bid can be entered without its first digit being
     corrected out from under you — the same reason GroupsModal clamps on save. */
  const onCommit = useCallback((node, round) => {
    const playerRounds = scoreData.get(node.data.player);
    const cell = playerRounds?.get(round);
    if (!cell) {
      return;
    }

    for (const field of ['bid', 'took']) {
      setCellValue(scoreData, node.data.player, round, field, clampToRound(cell[field], round));
    }

    node.setDataValue('total', mbRowTotal(playerRounds, cols), TOTAL_SOURCE);
    setScoreData(new Map(scoreData));
  }, [scoreData, cols, setScoreData]);

  /* How each round's two sums came out, which is what the sheet colours with.

     A lean is whether the table bid short of the tricks on the table or over
     them, and it colours the round number in the heading. Over-taken is a round
     written down with more tricks taken than were ever dealt in it, and it
     reddens every took in the column — it's the one thing here that can't just
     be how a round went, since a table can bid over the tricks on it and often
     does, but it cannot take tricks that were never there.

     Both are over the players still in, since a removed one is out of the
     bidding — the same as the tallies Auto Step shows.

     They reach the columns through callbacks that never change rather than as
     values, because the headings belong to the columns: an answer in
     headerComponentParams would rebuild every column def each time a cell was
     committed, and rebuilding a column takes its cells' renderers with it —
     which is the focus, mid-tab from a bid to the took beside it. So the columns
     hold still and read these two refs, and the effect below is what loads
     them. */
  const leansRef = useRef(new Map());
  const getLean = useCallback((round) => leansRef.current.get(round) ?? null, []);

  const overTakenRef = useRef(new Set());
  const getOverTaken = useCallback((round) => overTakenRef.current.has(round), []);

  // Up here rather than beside the effect at the foot of the file, because both
  // effects ask things of the grid.
  const gridApi = useRef(null);

  /* Every round cell on the sheet, by the round it's in, so one can be asked to
     repaint by something outside it.

     The grid's own refreshCells is what would usually do this, and it's what the
     effect at the foot of this file uses — but it builds the cell again from
     scratch, which for a cell holding two inputs means the one being typed into
     is replaced mid-entry. Tabbing from a bid to the took beside it commits the
     bid, and committing is exactly when a round's tooks might stop adding up, so
     that is not a rare case: it's the ordinary way a round goes in.

     So the cells repaint themselves instead. React keeps the input it already
     drew and only puts a class on it, which leaves the cursor where it was. */
  const cellRepaints = useRef(new Map());
  const watchRound = useCallback((round, repaint) => {
    const watching = cellRepaints.current.get(round) ?? new Set();
    watching.add(repaint);
    cellRepaints.current.set(round, watching);

    return () => watching.delete(repaint);
  }, []);

  /* Both sums worked out again, put where the callbacks above read them, and then
     only what actually moved asked to show it.

     On every render, and with no dependencies to say when — because there are
     none that could. The sheet is written into in place, so entering a bid moves
     nothing this component is handed: an effect listed against the sheet would
     run once and the colours would stay as they were when it was opened. It's
     ten rounds against a table of players, which is not a sum worth trying to
     skip, and on most renders it finds nothing changed and stops there.

     Ahead of the effect at the foot of the file, so that where both run the refs
     are loaded before that one rebuilds the cells and headings that read them. */
  useEffect(() => {
    const players = activePlayers(scoreData, disabledPlayers);
    const leans = new Map(cols.map((round) => [round, bidLean(players, scoreData, round)]));
    const overTaken = new Set(
      cols.filter((round) => tookTally(players, scoreData, round).left < 0)
    );

    const repainting = cols.filter(
      (round) => overTakenRef.current.has(round) !== overTaken.has(round)
    );
    const recolouring = cols.filter(
      (round) => leansRef.current.get(round) !== leans.get(round)
    );

    if (repainting.length === 0 && recolouring.length === 0) {
      return;
    }

    leansRef.current = leans;
    overTakenRef.current = overTaken;

    // Only the columns that tipped over, and only the cells in them — a cell
    // repaints itself, which leaves the input the cursor is in where it was.
    for (const round of repainting) {
      cellRepaints.current.get(round)?.forEach((repaint) => repaint());
    }

    // Nothing in a heading is focusable, so that one can be rebuilt outright.
    gridApi.current?.refreshHeader();
  });

  const columnDefs = useMemo(() => {
    const { playerCol, totalCol } = pinnedColumnDefs(smallScreen, playerWidth);

    return [
      // The position rides on the row rather than in these params, so a re-scored
      // sheet doesn't rebuild every column to show a place that moved.
      { ...playerCol, cellRenderer: PlayerCell },
      ...cols.map((round) => ({
        field: round,
        // Ours is the editing here — see the note at the top of the file. And
        // cellDataType off, or AG Grid reads the cell object as a value to infer
        // a column type from.
        editable: false,
        cellDataType: false,
        cellClass: 'mb-round-cell',
        cellRenderer: RoundCell,
        cellRendererParams: { onEnter, onCommit, getOverTaken, watchRound },
        headerClass: 'mb-round-header',
        headerComponent: RoundHeader,
        headerComponentParams: { round, getLean, getOverTaken },
        // The inputs own their keys — otherwise the grid takes the arrows for
        // moving between cells while someone is still typing into one.
        suppressKeyboardEvent: () => true
      })),
      totalCol
    ];
  }, [cols, smallScreen, playerWidth, onEnter, onCommit, getLean, getOverTaken, watchRound]);

  /* Worked out here rather than in each row so the whole field is ranked once and
     the places agree with each other — a place is only meaningful next to the
     others it was worked out against. */
  const rowData = useMemo(() => {
    const positions = positionsByTotal(scoreData, cols, disabledPlayers, mbRowTotal, winsWith('MB'));

    return buildRows(scoreData, cols, mbRowTotal).map((row) => ({
      ...row,
      position: positions.get(row.player),
      disabled: disabledPlayers.has(row.player)
    }));
  }, [scoreData, cols, disabledPlayers]);

  const getRowId = useCallback((params) => params.data.player, []);

  /* Two things move a cell without moving its value, and AG Grid only redraws a
     cell whose value moved. Removing a player sets a flag on the row. Anything
     that writes into the sheet from outside the grid — Auto Step, a roster edit —
     writes into the cell object the grid was already handed, so the object it
     compares is the object it has. Either way the wedges would go on showing what
     they showed until something else happened to repaint them, so this is the ask.

     The rows themselves have already been updated by the time it runs: the grid
     takes its new rowData in an effect of its own, and that's a child of this one.
     On the first pass there's no grid to ask yet.

     This is the heavy one — every cell built again, which is every input on the
     sheet replaced — so it's held to the two things that can't be done any other
     way, and both of them happen with the sheet in front of you rather than with
     a cursor in it. Typing into a cell is not one of them: a committed bid recolours
     its heading and can redden its column, and both of those go through the effect
     above, which touches only what moved. */
  useEffect(() => {
    gridApi.current?.refreshCells({ force: true });
    gridApi.current?.refreshHeader();
  }, [disabledPlayers, scoreData]);

  return (
    <SheetGrid
      columnDefs={columnDefs}
      rowData={rowData}
      getRowId={getRowId}
      rowHeight={MB_ROW_HEIGHT}
      headerHeight={MB_HEADER_HEIGHT}
      defaultColDef={NO_REORDER}
      rowClassRules={rowClassRules}
      /* The headings are drawn before the effect above has anywhere to put the
         leans, so a sheet picked back up mid-game would open with its round
         numbers uncoloured. Asked for again here, which covers it whichever way
         round the two happen to land. */
      onGridReady={(event) => {
        gridApi.current = event.api;
        event.api.refreshHeader();
      }}
    />
  );
}

export default MormonBridgeTable
