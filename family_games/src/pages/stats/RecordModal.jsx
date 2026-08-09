import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import './RecordModal.css'
import GameTable from './GameTable'

/* The game a record was set in, as its sheet looked — the same table the Games
   tab stacks, since a record is only worth opening if what opens is the game.

   More than one game where the record is tied. Two players level on a total both
   won it, and one player level with themselves across two games set it twice:
   showing whichever came first would be picking one of them to be the record.

   Portalled to the body like ConfirmModal, and here it's not optional: the cell
   that opens this sits inside the table's own horizontal scroller, which would
   otherwise be what bounds the dialog. */
function RecordModal({ heading, games, onClose }) {
  const dialogRef = useRef(null);
  const startedOutside = useRef(false);

  // showModal (rather than the open attribute) is what gives us the backdrop,
  // the focus trap, and Esc-to-close for free.
  useEffect(() => {
    dialogRef.current.showModal();
  }, []);

  /* Where the backdrop is: the dialog fills the screen with it, and a click out
     there lands on the dialog element itself, since everything else in reach is
     inside it. So it's the point that says which was hit, not the target — asking
     the target would count the dialog's own padding as backdrop and shut the
     games on a click just past their edge. */
  const onBackdrop = (event) => {
    const { top, bottom, left, right } = dialogRef.current.getBoundingClientRect();

    return event.clientX < left || event.clientX > right
      || event.clientY < top || event.clientY > bottom;
  };

  /* Both ends of the click have to be out there. Dragging across a row of scores
     to read them off often finishes past the table's edge, and a click is where
     it was released — closing on that would take the game away mid-read. */
  const pressOutside = (event) => {
    startedOutside.current = onBackdrop(event);
  };

  const releaseOutside = (event) => {
    const outside = startedOutside.current && onBackdrop(event);
    startedOutside.current = false;

    if (outside) {
      onClose();
    }
  };

  /* onClose is on the dialog rather than only on the button, because Esc closes
     the element without going near either. Left to the button alone, escaping
     would shut the dialog while the record that opened it stayed set — nothing
     unmounts, so nothing runs showModal again, and every record after it would
     open a dialog that was already closed. */
  return createPortal(
    <dialog
      ref={dialogRef}
      className="record-modal"
      onClose={onClose}
      onMouseDown={pressOutside}
      onClick={releaseOutside}
    >
      <h2>{heading}</h2>

      {/* The same wrapper the Games tab uses. The rule between stacked games is
          drawn on adjacent blocks, so anything in between would take it away. */}
      <div className="game-list">
        {games.map((game) => <GameTable key={game.key} game={game} />)}
      </div>

      <div className="modal-actions">
        <button type="button" onClick={onClose}>Close</button>
      </div>
    </dialog>,
    document.body
  );
}

export default RecordModal
