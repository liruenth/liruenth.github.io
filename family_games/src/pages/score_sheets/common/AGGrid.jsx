/*
The grid every sheet is drawn on.

What's here is everything that doesn't depend on what a round is: the theme, the
two frozen columns, the responsive widths, and the height math that keeps the
grid inside the viewport with its header row frozen. What a round column looks
like and what happens when one is edited belong to the game, so they live with
it — see contract_rummy/contract_rummy_table.jsx and
mormon_bridge/mormon_bridge_table.jsx, which both render this.

The constants and helpers those two share with it are in sheetGrid.js, so this
file exports a component and nothing else.
*/
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { AllCommunityModule, themeBalham } from 'ag-grid-community';
import { AgGridProvider, AgGridReact } from 'ag-grid-react';
import {
  ROW_HEIGHT,
  HEADER_HEIGHT,
  MIN_COL_WIDTH,
  MIN_COL_WIDTH_SMALL,
  getRowStyle,
  useSmallScreen
} from './sheetGrid';
import './AGGrid.css';

const modules = [AllCommunityModule];

// Balham only borders the header row, so ask for column borders through the body
// as well. Built once — a new theme object on each render re-inits the grid.
const gridTheme = themeBalham.withParams({ columnBorder: true });

const SheetGrid = ({
  columnDefs,
  rowData,
  rowHeight = ROW_HEIGHT,
  headerHeight = HEADER_HEIGHT,
  defaultColDef: colDefOverrides,
  ...gridProps
}) => {
  const containerRef = useRef(null);
  const [layout, setLayout] = useState({ scrollbar: 0, available: null });

  const smallScreen = useSmallScreen();

  const defaultColDef = useMemo(() => {
    return {
      resizable: false,
      // Share out the spare width evenly, but never shrink below the floor.
      // Under that total the grid scrolls horizontally instead.
      flex: 1,
      minWidth: smallScreen ? MIN_COL_WIDTH_SMALL : MIN_COL_WIDTH,
      ...colDefOverrides
    };
  }, [smallScreen, colDefOverrides]);

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
  const chromeHeight = headerHeight + layout.scrollbar + 2;

  // What the grid would take to show every row without scrolling. The CSS caps
  // this against the space left below the grid.
  const naturalHeight = chromeHeight + (rowData.length * rowHeight);

  const sizing = {
    // The CSS rounds the leftover space down to whole rows, so it has to be told
    // how tall a row is on this sheet rather than assume the default. Mormon
    // Bridge's cell CSS positions its text against it too.
    '--sheet-row-height': `${rowHeight}px`,
    '--grid-natural-height': `${naturalHeight}px`,
    '--grid-chrome': `${chromeHeight}px`
  };

  // Until the first measurement the CSS falls back to the full viewport
  if (layout.available !== null) {
    sizing['--grid-available'] = `${layout.available}px`;
  }

  return (
    <div
      ref={containerRef}
      className="grid-container"
      style={sizing}
    >
      <AgGridProvider modules={modules}>
        <AgGridReact
          theme={gridTheme}
          defaultColDef={defaultColDef}
          columnDefs={columnDefs}
          rowData={rowData}
          rowHeight={rowHeight}
          headerHeight={headerHeight}
          getRowStyle={getRowStyle}
          singleClickEdit={smallScreen}
          onFirstDataRendered={measureLayout}
          onGridSizeChanged={measureLayout}
          lockPinned={true}
          {...gridProps}
        />
      </AgGridProvider>
    </div>
  );
}

export default SheetGrid
