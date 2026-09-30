import { useState, useEffect, useRef } from 'react'
import './PlayersModal.css'

/* Who's on the sheet: what they're called, and — where the game cares — what
   order they're sitting in.

   One dialog for both, because on the sheet they're one thing: a sheet is a Map
   keyed by player name, so the name is the key and the row order is the key
   order. Editing either is the same rebuild, which is why helpers/roster.js takes
   one list covering both.

   That list is what's handed back: `[{ original, name }]` in the order the rows
   are to end up in. A row nobody touched says the same name twice, so the caller
   never has to work out which of the two edits it was.

   Nothing is applied until Save, the same as Remove Player — a half-renamed sheet
   isn't a state worth having, and the duplicate check below can only be run
   against the whole list anyway.

   Reordering is asked for rather than always offered. Mormon Bridge's rows are
   the seating and the bidding goes round them, so moving one is a real move;
   Contract Rummy ranks its own rows once the table is split into groups, and
   arrows there would be undone by the next finished round. */
function PlayersModal({ players, reorderable = false, onSave, onClose }) {
  const dialogRef = useRef(null);
  const [entries, setEntries] = useState(
    () => players.map((player) => ({ original: player, name: player }))
  );
  const [error, setError] = useState(null);

  // showModal (rather than the open attribute) is what gives us the backdrop,
  // the focus trap, and Esc-to-close for free.
  useEffect(() => {
    dialogRef.current.showModal();
  }, []);

  /* A row that moves takes its buttons with it, and React reorders by moving the
     nodes — which drops the focus that was on one of them. So the arrow that was
     clicked is put back under the cursor, and a player can be walked up the table
     with repeated presses rather than one press and a re-aim.

     Found by its marker rather than held as a ref, because the button being
     looked for is the one that has just been re-rendered somewhere else. Read off
     the list and compared rather than asked for as a selector, since half the
     marker is a player's name and a name isn't something to have to escape.

     Runs after every render and does nothing unless a move set it, which is
     cheaper than the bookkeeping to make it run after only the ones that did. */
  const refocus = useRef(null);
  useEffect(() => {
    if (!refocus.current) {
      return;
    }

    const buttons = dialogRef.current?.querySelectorAll('[data-move]') ?? [];
    [...buttons].find((button) => button.dataset.move === refocus.current)?.focus();
    refocus.current = null;
  });

  const rename = (index, name) => {
    setEntries((prev) => prev.map(
      (entry, at) => (at === index ? { ...entry, name } : entry)
    ));
    setError(null);
  };

  // A swap with the neighbour rather than a splice, so a row can only ever move
  // one seat at a time and the seat it takes is the one it can be given back.
  const move = (index, by) => {
    const to = index + by;
    if (to < 0 || to >= entries.length) {
      return;
    }

    refocus.current = `${entries[index].original}:${by}`;
    setEntries((prev) => {
      const next = [...prev];
      [next[index], next[to]] = [next[to], next[index]];
      return next;
    });
  };

  /* Trimmed first, so the checks and what's saved are the same names. Both
     failures are the sheet's rather than this list's: a row has to be called
     something for the grid to have a row id, and two rows called the same thing
     would be one row holding both their scores. */
  const save = (e) => {
    e.preventDefault();
    const trimmed = entries.map((entry) => ({ ...entry, name: entry.name.trim() }));

    if (trimmed.some((entry) => !entry.name)) {
      setError('Every player needs a name');
      return;
    }

    const seen = new Set();
    for (const { name } of trimmed) {
      const key = name.toLowerCase();
      if (seen.has(key)) {
        setError(`${name} is on the sheet twice`);
        return;
      }
      seen.add(key);
    }

    onSave(trimmed);
    onClose();
  };

  return (
    <dialog ref={dialogRef} className="players-modal" onClose={onClose}>
      <form onSubmit={save}>
        <h2>Edit Players</h2>
        <p className="modal-hint">
          {reorderable
            ? 'Renaming a player keeps their scores. The rows are the seating, so moving one moves where they bid.'
            : 'Renaming a player keeps their scores.'}
        </p>
        <ul className="players-edit-list">
          {entries.map((entry, index) => (
            /* Keyed on the name the row arrived under, which is the one thing
               about it that neither editing it nor moving it changes — keyed on
               the name being typed, every keystroke would throw the input away
               and take the cursor with it. */
            <li key={entry.original} className="players-edit-row">
              <input
                type="text"
                aria-label={`${entry.original}'s name`}
                value={entry.name}
                onChange={(e) => rename(index, e.target.value)}
              />
              {reorderable && (
                <span className="players-edit-move">
                  <button
                    type="button"
                    data-move={`${entry.original}:-1`}
                    aria-label={`Move ${entry.original} up`}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    &#9650;
                  </button>
                  <button
                    type="button"
                    data-move={`${entry.original}:1`}
                    aria-label={`Move ${entry.original} down`}
                    disabled={index === entries.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    &#9660;
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
        {error && <p className="modal-error">{error}</p>}
        <div className="modal-actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="submit">Save</button>
        </div>
      </form>
    </dialog>
  );
}

export default PlayersModal
