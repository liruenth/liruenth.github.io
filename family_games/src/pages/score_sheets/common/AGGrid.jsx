import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { AllCommunityModule, themeBalham, themeAlpine, themeQuartz } from 'ag-grid-community';
import { AgGridProvider, AgGridReact } from 'ag-grid-react';
import './AGGrid.css';

// import 'ag-grid-community/styles/ag-grid.css';
// import 'ag-grid-community/styles/ag-theme-alpine.css';

const modules = [AllCommunityModule];

// Set explicitly rather than left to the theme so the height math below can
// know what the grid will actually render.
const ROW_HEIGHT = 28;
const HEADER_HEIGHT = 32;

// A grid-driven change ('data') would loop back through rowData, so only
// write on edits the user made themselves. Our own total write uses its own
// source so the recalc it triggers gets filtered out here too.
const MANUAL_SOURCES = ['edit', 'paste', 'undo', 'redo'];
const TOTAL_SOURCE = 'rowTotal';

// Editors hand back strings, and unplayed rounds are blank, so skip anything
// that isn't a real number rather than letting it poison the sum with NaN.
function rowTotal(playerScores, cols) {
  return cols.reduce((sum, col) => {
    const score = Number(playerScores.get(col));
    return Number.isFinite(score) ? sum + score : sum;
  }, 0);
}

function buildRows(scoreData, cols) {
  // A restored sheet already holds scores, so spread them onto the row
  return [...scoreData.keys()].map((player) => ({
    player,
    ...Object.fromEntries(scoreData.get(player)),
    total: rowTotal(scoreData.get(player), cols)
  }));
}

const AGGrid = ({scoreData, cols, setScoreData}) => {
  const containerRef = useRef(null);
  const [layout, setLayout] = useState({ scrollbar: 0, available: null });

  const defaultColDef = useMemo(() => {
    return {
      resizable: false,
      // flex: 1,
      maxWidth: 100
    };
  }, []);

  const autoSizeStrategy = useMemo(() => { 
    return {
      type: 'fitCellContents',
    };
  }, []);
  
  const [columnDefs, setColumnDefs] = useState([
    // { field: 'make2', editable: true },
    // { field: 'model', editable: true },
    // { field: 'price', editable: true }
    { field: 'player', pinned: 'left' },
    ...cols.map((col, cIdx) => ({ field: col, editable: true })),
    { field: 'total', pinned: 'right' }
  ]);

  // { make2: "Toyota", model: "Celica", price: 35000 },
  // { make2: "Ford", model: "Mondeo", price: 32000 },
  // { make2: "Porsche", model: "Boxster", },
  //
  // Keyed on the Map's identity, which only changes when the roster does, so
  // adding a player rebuilds the rows while cell edits leave them untouched.
  const rowData = useMemo(() => buildRows(scoreData, cols), [scoreData, cols]);

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
    setScoreData(new Map(scoreData));
  }, [scoreData, cols, setScoreData]);

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
          theme={themeBalham}
          // theme={themeAlpine}
          // theme={themeQuartz}
          autoSizeStrategy={autoSizeStrategy}
          defaultColDef={defaultColDef}
          columnDefs={columnDefs}
          rowData={rowData}
          rowHeight={ROW_HEIGHT}
          headerHeight={HEADER_HEIGHT}
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