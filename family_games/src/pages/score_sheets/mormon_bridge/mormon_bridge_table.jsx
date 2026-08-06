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
  useSmallScreen,
  TOTAL_SOURCE
} from '../common/sheetGrid';
import RoundWedges from './RoundWedges';
import { mbRowTotal, setCellValue, clampToRound } from '../../../helpers/mormonBridge';
import './round_cell.css';
import './mormon_bridge_table.css';

/* Three wedges, two of them typed into, so a row needs about twice the height a
   single number does. SheetGrid mirrors it into --sheet-row-height, which is what
   the CSS positions the wedges' text against — so this is the one place it's set.

   The header carries the same three wedges, so it's the same height. */
const MB_ROW_HEIGHT = 52;
const MB_HEADER_HEIGHT = 52;

/* Nothing may reorder the sheet: the rows are in seating order, which is what
   makes the bidding read left to right, and it's also what a future Auto Step
   walks. So no sorting, and no dragging a column out of the countdown either. */
const NO_REORDER = { sortable: false, suppressMovable: true };

/* A round cell. The wedges render straight off the cell object rather than
   mirroring it into state, so there's one copy of a bid and it's the one that
   gets submitted — writing mutates that object and then asks for a repaint. */
function RoundCell({ data, value, colDef, node, onEnter, onCommit }) {
  const [, repaint] = useReducer((count) => count + 1, 0);

  const round = colDef.field;
  const cell = value;
  const disabled = !!data.disabled;

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
        max={round}
        step="1"
        aria-label={`${data.player} bid, round ${round}`}
        disabled={disabled}
        value={cell.bid}
        onChange={write('bid')}
        onBlur={commit}
      />
      <input
        className="mb-wedge mb-wedge-took"
        type="number"
        inputMode="numeric"
        min="0"
        max={round}
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

// The same three wedges as a cell, so the columns read as what's under them:
// which side is the bid, which the took, and the round across the bottom.
function RoundHeader({ round }) {
  return <RoundWedges heading bid="bid" took="took" score={round} />;
}

// Greys out a player who's been removed. Static, since it reads the flag off the
// row rather than closing over the set it came from.
const rowClassRules = { 'mb-row-disabled': (params) => !!params.data?.disabled };

const MormonBridgeTable = ({ scoreData, cols, setScoreData, disabledPlayers }) => {
  const smallScreen = useSmallScreen();

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

  const columnDefs = useMemo(() => {
    const { playerCol, totalCol } = pinnedColumnDefs(smallScreen);

    return [
      playerCol,
      ...cols.map((round) => ({
        field: round,
        // Ours is the editing here — see the note at the top of the file. And
        // cellDataType off, or AG Grid reads the cell object as a value to infer
        // a column type from.
        editable: false,
        cellDataType: false,
        cellClass: 'mb-round-cell',
        cellRenderer: RoundCell,
        cellRendererParams: { onEnter, onCommit },
        headerClass: 'mb-round-header',
        headerComponent: RoundHeader,
        headerComponentParams: { round },
        // The inputs own their keys — otherwise the grid takes the arrows for
        // moving between cells while someone is still typing into one.
        suppressKeyboardEvent: () => true
      })),
      totalCol
    ];
  }, [cols, smallScreen, onEnter, onCommit]);

  const rowData = useMemo(() => (
    buildRows(scoreData, cols, mbRowTotal).map((row) => ({
      ...row,
      disabled: disabledPlayers.has(row.player)
    }))
  ), [scoreData, cols, disabledPlayers]);

  const getRowId = useCallback((params) => params.data.player, []);

  /* Two things move a cell without moving its value, and AG Grid only redraws a
     cell whose value moved. Removing a player sets a flag on the row. Auto Step
     writes into the cell object the grid was already handed, so the object it
     compares is the object it has. Either way the wedges would go on showing what
     they showed until something else happened to repaint them, so this is the ask.

     The rows themselves have already been updated by the time it runs: the grid
     takes its new rowData in an effect of its own, and that's a child of this one.
     On the first pass there's no grid to ask yet, and typing into a cell doesn't
     move the sheet's identity, so it can't pull the focus out of one. */
  const gridApi = useRef(null);
  useEffect(() => {
    gridApi.current?.refreshCells({ force: true });
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
      onGridReady={(event) => { gridApi.current = event.api; }}
    />
  );
}

export default MormonBridgeTable
