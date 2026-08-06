/*
Contract Rummy's sheet: one editable number per player per round, a running total
frozen on the right, and a re-rank each time a round finishes.

Everything about how the grid itself is put together — theme, frozen columns,
responsive widths, viewport height — comes from SheetGrid in common/AGGrid.jsx
and the pieces beside it in common/sheetGrid.js, which Mormon Bridge's table
renders too.
*/
import { useMemo, useCallback } from 'react'
import SheetGrid from '../common/AGGrid';
import {
  buildRows,
  pinnedColumnDefs,
  useSmallScreen,
  MANUAL_SOURCES,
  TOTAL_SOURCE
} from '../common/sheetGrid';
import { rowTotal, columnComplete, sortedByTotal } from '../../../helpers/scoring';

const ContractRummyTable = ({scoreData, cols, setScoreData, autoSortTable, onReorder}) => {
  const smallScreen = useSmallScreen();

  const columnDefs = useMemo(() => {
    const { playerCol, totalCol } = pinnedColumnDefs(smallScreen);

    return [
      playerCol,
      // The editor renders an <input type="number">, which is what gets a phone
      // to raise its number pad instead of the full keyboard. cellDataType keeps
      // the column numeric on the way back out too, so a score is stored as a
      // number rather than the string a text editor would hand back. Scores are
      // whole, so no decimals — and the stepper buttons stay off by default,
      // which suits a column this narrow.
      ...cols.map((col) => ({
        field: col,
        editable: true,
        cellDataType: 'number',
        cellEditor: 'agNumberCellEditor',
        cellEditorParams: { precision: 0 }
      })),
      totalCol
    ];
  }, [cols, smallScreen]);

  // Keyed on the Map's identity, which changes when the roster or the row order
  // does — so adding a player or re-ranking rebuilds the rows, while cell edits
  // (which mutate in place) leave them untouched.
  const rowData = useMemo(() => buildRows(scoreData, cols, rowTotal), [scoreData, cols]);

  // Lets AG Grid move existing rows on a re-sort instead of rebuilding them all
  const getRowId = useCallback((params) => params.data.player, []);

  const onCellValueChanged = useCallback((event) => {
    if (!MANUAL_SOURCES.includes(event.source)) {
      return;
    }

    const player = event.data.player;
    const col = event.colDef.field;
    const playerScores = scoreData.get(player);
    if (!playerScores) {
      return;
    }

    playerScores.set(col, event.newValue);
    // Totals stay derived — recomputed from the row rather than stored
    event.node.setDataValue('total', rowTotal(playerScores, cols), TOTAL_SOURCE);
    // Setting a value repaints the cell but not the row, so the background has
    // to be asked for again now the total it depends on has moved.
    event.api.redrawRows({ rowNodes: [event.node] });

    // Re-rank once the edit leaves no blanks in the column — the cell that
    // completes a round needn't be the bottom one. Handing the reordered sheet up
    // rather than sorting the grid means the order is part of the saved data, so
    // it survives a refresh, and it stays a one-off: rows settle and then hold
    // still through the next column instead of re-shuffling on every edit.
    if (autoSortTable && onReorder && columnComplete(scoreData, col)) {
      onReorder(sortedByTotal(scoreData, cols));
      return;
    }

    setScoreData(new Map(scoreData));
  }, [scoreData, cols, setScoreData, autoSortTable, onReorder]);

  return (
    <SheetGrid
      columnDefs={columnDefs}
      rowData={rowData}
      getRowId={getRowId}
      onCellValueChanged={onCellValueChanged}
    />
  );
}

export default ContractRummyTable
