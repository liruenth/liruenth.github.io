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
import { groupEndRows } from '../../../helpers/groups';
import './contract_rummy_table.css';

/* The line under the last row of a group, and the shade over a player who's been
   taken out of play. Static, since both read a flag off the row rather than closing
   over the count the rows were split by or the set they were removed in. */
const rowClassRules = {
  'cr-group-end': (params) => !!params.data?.groupEnd,
  'cr-row-closed': (params) => !!params.data?.disabled
};

// A removed player sits out the rest of the game, so their row takes no more scores.
// A callback rather than a flag on the column, since it's the row that's closed.
const roundEditable = (params) => !params.data?.disabled;

const ContractRummyTable = ({
  scoreData,
  cols,
  setScoreData,
  autoSortTable,
  onReorder,
  numGroups = 1,
  removedPlayers
}) => {
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
        editable: roundEditable,
        cellDataType: 'number',
        cellEditor: 'agNumberCellEditor',
        cellEditorParams: { precision: 0 }
      })),
      totalCol
    ];
  }, [cols, smallScreen]);

  /* Keyed on the Map's identity, which changes when the roster or the row order
     does — so adding a player or re-ranking rebuilds the rows, while cell edits
     (which mutate in place) leave them untouched.

     Groups split the sheet by position rather than by player: the boundaries fall on
     the same rows however the ranking moves, so the flag rides on the row and is
     worked out again each time the rows are. Being out of play follows the player
     instead, but it rides on the row for the same reason — it's what the grid has
     when it asks whether the row is closed.

     Only the players still in the game are divided up. A removed row is passed over
     rather than counted, so the groups above it are the sizes they'd be if the sheet
     were the length it is minus them — which is what the ranking sinking those rows
     to the bottom leaves. Their positions are looked up rather than assumed to be
     the last ones, so a sheet restored before it was ranked still groups right. */
  const rowData = useMemo(() => {
    const rows = buildRows(scoreData, cols, rowTotal).map((row) => ({
      ...row,
      disabled: !!removedPlayers?.has(row.player)
    }));

    const playing = rows.reduce((indexes, row, index) => {
      if (!row.disabled) {
        indexes.push(index);
      }
      return indexes;
    }, []);

    const groupEnds = new Set(
      [...groupEndRows(playing.length, numGroups)].map((end) => playing[end])
    );

    return rows.map((row, index) => ({ ...row, groupEnd: groupEnds.has(index) }));
  }, [scoreData, cols, numGroups, removedPlayers]);

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

    // Re-rank once the edit leaves no blanks in the column — bar the players who
    // are out of play, who will never fill one in. The cell that completes a round
    // needn't be the bottom one. Handing the reordered sheet up
    // rather than sorting the grid means the order is part of the saved data, so
    // it survives a refresh, and it stays a one-off: rows settle and then hold
    // still through the next column instead of re-shuffling on every edit.
    if (autoSortTable && onReorder && columnComplete(scoreData, col, removedPlayers)) {
      onReorder(sortedByTotal(scoreData, cols, removedPlayers));
      return;
    }

    setScoreData(new Map(scoreData));
  }, [scoreData, cols, setScoreData, autoSortTable, onReorder, removedPlayers]);

  return (
    <SheetGrid
      columnDefs={columnDefs}
      rowData={rowData}
      getRowId={getRowId}
      rowClassRules={rowClassRules}
      onCellValueChanged={onCellValueChanged}
    />
  );
}

export default ContractRummyTable
