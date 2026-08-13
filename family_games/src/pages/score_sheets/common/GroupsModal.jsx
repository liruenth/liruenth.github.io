import { useState, useEffect, useRef } from 'react'
import { clampGroups } from '../../../helpers/groups'
import './GroupsModal.css'

function GroupsModal({ value, maxGroups, onSave, onClose }) {
  const dialogRef = useRef(null);
  const [groups, setGroups] = useState(String(value));

  // showModal (rather than the open attribute) is what gives us the backdrop,
  // the focus trap, and Esc-to-close for free.
  useEffect(() => {
    dialogRef.current.showModal();
  }, []);

  // Clamped on the way out as well as on the input, since typing into a number
  // field can put values outside min/max — and clearing it reads back as an
  // empty string. Left free while typing so a two-digit number can be entered
  // without its first digit being corrected out from under you.
  const save = (e) => {
    e.preventDefault();
    onSave(clampGroups(groups, maxGroups));
    onClose();
  };

  return (
    <dialog ref={dialogRef} className="groups-modal" onClose={onClose}>
      <form onSubmit={save}>
        <h2>Groups</h2>
        <label className="groups-field" htmlFor="groups-count">
          Split the table into
          <input
            id="groups-count"
            type="number"
            min="1"
            max={maxGroups}
            step="1"
            value={groups}
            autoFocus
            onChange={(e) => setGroups(e.target.value)}
          />
        </label>
        <div className="modal-actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="submit">Save</button>
        </div>
      </form>
    </dialog>
  );
}

export default GroupsModal
