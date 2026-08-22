import './round_split.css'

/* One round of a game that scores a plain number, as a finished game is read
   back: what was scored in the round above the diagonal, and the total that put
   the player on below it.

   The running total is the reason the cell is split at all. A sheet's round
   column says what a round cost, and the Total column at the end says where
   everybody finished, but between them there was nothing to say who was ahead
   going into the last round — which for Contract Rummy, where the low total
   takes it, is most of what a finished game has to tell. So each cell carries
   both: the round on its own, and the game to that point.

   Two triangles rather than two lines, because the cell is a column narrow
   enough that two stacked numbers would read as one four-digit one. The
   diagonal runs the way the pair is written — score, slash, total — and only the
   lower half is filled, which is what draws it: the cell has no border inside it
   to divide the halves with.

   A round nobody played holds neither number. Nothing is drawn for it at all,
   not even the diagonal: a blank cell is how the sheet said the game ended
   there, and half a cell tinted in a round that was never dealt would read as
   something having happened in it.

   Stats-page only, unlike Mormon Bridge's three-wedge cell — the Contract Rummy
   sheet's own cells are score inputs, and a running total is a thing to read off
   a game that's over rather than a second number to keep up to date while
   there's still scoring to do. */
function RoundSplit({ score, total }) {
  if (!Number.isFinite(score)) {
    return null;
  }

  return (
    <div className="split-round">
      <span className="split-half split-half-score">{score}</span>
      {/* Blank if it somehow isn't a number, rather than the word NaN: the score
          is what the cell is for, and it stands on its own. */}
      <span className="split-half split-half-total">
        {Number.isFinite(total) ? total : ''}
      </span>
    </div>
  );
}

export default RoundSplit
