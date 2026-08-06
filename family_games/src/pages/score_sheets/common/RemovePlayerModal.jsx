import { useState, useEffect, useRef } from 'react'
import './RemovePlayerModal.css'

/* Takes players out of play without taking them off the sheet.

   A toggle list rather than a one-way remove: the sheet keeps a removed player's
   row and the rounds they did play, so putting them back is a real thing to want
   — and Mormon Bridge, the only game with this action, has no Add Player to undo
   a mis-tap with.

   Nothing is applied until Save, so the whole list is one decision. */
function RemovePlayerModal({ players, removed, onSave, onClose }) {
  const dialogRef = useRef(null);
  const [selected, setSelected] = useState(() => new Set(removed));

  // showModal (rather than the open attribute) is what gives us the backdrop,
  // the focus trap, and Esc-to-close for free.
  useEffect(() => {
    dialogRef.current.showModal();
  }, []);

  const toggle = (player) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(player)) {
        next.delete(player);
      } else {
        next.add(player);
      }
      return next;
    });
  };

  const save = (e) => {
    e.preventDefault();
    onSave(selected);
    onClose();
  };

  return (
    <dialog ref={dialogRef} className="remove-player-modal" onClose={onClose}>
      <form onSubmit={save}>
        <h2>Remove Player</h2>
        <p className="modal-hint">
          A removed player's row is closed to entries and sits out the rest of the
          game. The rounds they already played stay on the sheet.
        </p>
        <ul className="player-list">
          {players.map((player) => (
            <li key={player}>
              <label className={selected.has(player) ? 'player removed' : 'player'}>
                <input
                  type="checkbox"
                  checked={selected.has(player)}
                  onChange={() => toggle(player)}
                />
                {player}
              </label>
            </li>
          ))}
        </ul>
        <div className="modal-actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="submit">Save</button>
        </div>
      </form>
    </dialog>
  );
}

export default RemovePlayerModal
