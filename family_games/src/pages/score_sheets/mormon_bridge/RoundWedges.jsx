import './round_cell.css'

/* A Mormon Bridge round, read-only: the bid and took in the top corners and the
   score across the bottom, as three triangles that tile the cell.

   Shared, because the same round is drawn in three places — the sheet's headings,
   and both the headings and the cells of a finished game on the stats page — and
   they have to be the same shape or the stats table stops reading as the sheet
   that was played. The sheet's own cells are the exception: those two corners are
   inputs there, so mormon_bridge_table.jsx builds its own out of the same classes.

   Blanks stay blank. A round that was never played has no bid, no took and no
   score, and a zero in any of them would read as one that was. */
function RoundWedges({ bid, took, score, heading = false }) {
  return (
    <div className={heading ? 'mb-round mb-round-heading' : 'mb-round'}>
      <span className="mb-wedge mb-wedge-bid">{bid ?? ''}</span>
      <span className="mb-wedge mb-wedge-took">{took ?? ''}</span>
      <span className="mb-wedge mb-wedge-score">{score ?? ''}</span>
    </div>
  );
}

export default RoundWedges
