import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { AllCommunityModule, themeBalham, themeAlpine, themeQuartz } from 'ag-grid-community';
import { AgGridProvider, AgGridReact } from 'ag-grid-react';
import { rowTotal, columnComplete, sortedByTotal } from './scoring';
import './AGGrid.css';

// import 'ag-grid-community/styles/ag-grid.css';
// import 'ag-grid-community/styles/ag-theme-alpine.css';

const modules = [AllCommunityModule];

// Balham only borders the header row, so ask for column borders through the body
// as well. Built once — a new theme object on each render re-inits the grid.
const gridTheme = themeBalham.withParams({ columnBorder: true });

// Set explicitly rather than left to the theme so the height math below can
// know what the grid will actually render.
const ROW_HEIGHT = 28;
const HEADER_HEIGHT = 32;

// A 100px floor reads well on a desktop, but on a phone the two pinned columns
// alone would take most of the screen and leave the rounds no room, so the floor
// drops on small screens. Kept in step with the breakpoint in AGGrid.css —
// minWidth is a column value, so it can't come from the media query itself.
const MIN_COL_WIDTH = 100;
const MIN_COL_WIDTH_SMALL = 48;
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
const MANUAL_SOURCES = ['edit', 'paste', 'undo', 'redo'];
const TOTAL_SOURCE = 'rowTotal';


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

function buildRows(scoreData, cols) {
  // A restored sheet already holds scores, so spread them onto the row
  return [...scoreData.keys()].map((player) => ({
    player,
    ...Object.fromEntries(scoreData.get(player)),
    total: rowTotal(scoreData.get(player), cols)
  }));
}

const AGGrid = ({scoreData, cols, setScoreData, autoSortTable, onReorder}) => {
  const containerRef = useRef(null);
  const [layout, setLayout] = useState({ scrollbar: 0, available: null });

  const [smallScreen, setSmallScreen] = useState(() => window.matchMedia(SMALL_SCREEN).matches);

  useEffect(() => {
    const query = window.matchMedia(SMALL_SCREEN);
    const update = (event) => setSmallScreen(event.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  const defaultColDef = useMemo(() => {
    return {
      resizable: false,
      // Share out the spare width evenly, but never shrink below the floor.
      // Under that total the grid scrolls horizontally instead.
      flex: 1,
      minWidth: smallScreen ? MIN_COL_WIDTH_SMALL : MIN_COL_WIDTH
    };
  }, [smallScreen]);

  // Rows are styled by their total, which getRowStyle only reads when a row is
  // drawn — see the redraw in onCellValueChanged.
  const getRowStyle = useCallback((params) => {
    const background = rowBackground(params.data?.total);
    return background ? { background } : undefined;
  }, []);

  // { field: 'make2', editable: true },
  // { field: 'model', editable: true },
  // { field: 'price', editable: true }
  //
  // flex: 0 opts the pinned columns out of the width sharing, and their own
  // minWidth overrides the floor in defaultColDef, which would otherwise hold
  // them open to the round columns' minimum.
  const columnDefs = useMemo(() => {
    const playerWidth = smallScreen ? PLAYER_COL_WIDTH_SMALL : PLAYER_COL_WIDTH;
    const totalWidth = smallScreen ? TOTAL_COL_WIDTH_SMALL : TOTAL_COL_WIDTH;

    return [
      { field: 'player', pinned: 'left', flex: 0, width: playerWidth, minWidth: playerWidth },
      ...cols.map((col) => ({ field: col, editable: true })),
      { field: 'total', pinned: 'right', flex: 0, width: totalWidth, minWidth: totalWidth }
    ];
  }, [cols, smallScreen]);

  // { make2: "Toyota", model: "Celica", price: 35000 },
  // { make2: "Ford", model: "Mondeo", price: 32000 },
  // { make2: "Porsche", model: "Boxster", },
  //
  // Keyed on the Map's identity, which changes when the roster or the row order
  // does — so adding a player or re-ranking rebuilds the rows, while cell edits
  // (which mutate in place) leave them untouched.
  const rowData = useMemo(() => buildRows(scoreData, cols), [scoreData, cols]);

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

  const measureLayout = useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    // Where the scrollbar takes real layout space, it takes it out of the grid's
    // own height, so the last row ends up clipped behind it unless we allow for
    // it. Left to the DOM rather than a fixed guess, since scrollbars differ per
    // platform: this reads what was actually reserved, and 0 both when the
    // columns fit and where the media query has collapsed the strip.
    const scroller = container.querySelector('.ag-body-horizontal-scroll');
    const scrollViewport = container.querySelector('.ag-body-horizontal-scroll-viewport');
    const overflows = scrollViewport && scrollViewport.scrollWidth > scrollViewport.clientWidth;
    const scrollbar = scroller && overflows ? scroller.offsetHeight : 0;

    // Whatever sits above the grid — nav, headings — is height the grid can't
    // have, so measure down from where it actually starts instead of assuming it
    // owns the whole viewport. Keeps the buttons below it on screen.
    const top = container.getBoundingClientRect().top;
    const available = Math.max(0, Math.round(window.innerHeight - top));

    setLayout((prev) => (
      prev.scrollbar === scrollbar && prev.available === available
        ? prev
        : { scrollbar, available }
    ));
  }, []);

  // The grid's own resize event covers width changes; this catches a window that
  // only got shorter, which leaves the grid's box the same size.
  useEffect(() => {
    window.addEventListener('resize', measureLayout);
    return () => window.removeEventListener('resize', measureLayout);
  }, [measureLayout]);

  // Everything in the grid's height that isn't rows, which the CSS needs so it
  // can round the leftover space down to whole rows. +2 covers the container's
  // top and bottom border.
  const chromeHeight = HEADER_HEIGHT + layout.scrollbar + 2;

  // What the grid would take to show every row without scrolling. The CSS caps
  // this against the space left below the grid.
  const naturalHeight = chromeHeight + (rowData.length * ROW_HEIGHT);

  const sizing = {
    '--grid-natural-height': `${naturalHeight}px`,
    '--grid-chrome': `${chromeHeight}px`
  };

  // Until the first measurement the CSS falls back to the full viewport
  if (layout.available !== null) {
    sizing['--grid-available'] = `${layout.available}px`;
  }

  return (
    // <div className="ag-theme-alpine" style={{ height: 300, width: 600 }}><
    <div
      ref={containerRef}
      className="grid-container"
      style={sizing}
    >
      <AgGridProvider modules={modules}>
        <AgGridReact
          theme={gridTheme}
          // theme={themeAlpine}
          // theme={themeQuartz}
          defaultColDef={defaultColDef}
          columnDefs={columnDefs}
          rowData={rowData}
          getRowId={getRowId}
          rowHeight={ROW_HEIGHT}
          headerHeight={HEADER_HEIGHT}
          getRowStyle={getRowStyle}
          onCellValueChanged={onCellValueChanged}
          onFirstDataRendered={measureLayout}
          onGridSizeChanged={measureLayout}
          lockPinned={true}
        />
      </AgGridProvider>
    </div>
  );
}

export default AGGrid