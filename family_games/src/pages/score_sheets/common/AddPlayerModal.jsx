import { useState, useEffect, useRef } from 'react'
import './AddPlayerModal.css'

function AddPlayerModal({ existingPlayers, onAdd, onClose }) {
  const dialogRef = useRef(null);
  const [name, setName] = useState('');
  const [error, setError] = useState(null);

  // showModal (rather than the open attribute) is what gives us the backdrop,
  // the focus trap, and Esc-to-close for free.
  useEffect(() => {
    dialogRef.current.showModal();
  }, []);

  const submit = (e) => {
    e.preventDefault();
    const player = name.trim();
    if (!player) {
      return;
    }

    const duplicate = existingPlayers.some((p) => p.toLowerCase() === player.toLowerCase());
    if (duplicate) {
      setError(`${player} is already on the sheet`);
      return;
    }

    onAdd(player);
    onClose();
  };

  return (
    <dialog ref={dialogRef} className="add-player-modal" onClose={onClose}>
      <form onSubmit={submit}>
        <h2>Add Player</h2>
        <label htmlFor="add-player-name">Player Name</label>
        <input
          id="add-player-name"
          type="text"
          value={name}
          autoFocus
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
        />
        {error && <p className="modal-error">{error}</p>}
        <div className="modal-actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="submit" disabled={!name.trim()}>Add</button>
        </div>
      </form>
    </dialog>
  );
}

export default AddPlayerModal
