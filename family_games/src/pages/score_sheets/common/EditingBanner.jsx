import { useState } from 'react'
import ConfirmModal from './ConfirmModal'
import { formatDate, titleCase } from '../../../helpers/statsData'
import './StartNewGame.css'

/* Says which game the sheet is holding open, and lets the family it's filed under
   be corrected.

   The family is drafted here and only handed up when it's saved. The sheet writes
   whatever family it's holding straight to storage, and that's the same name the
   stats page prefills its prompt with - so a rename typed live would leave a
   half-typed family behind the moment it was abandoned. Empty is refused outright:
   the writer requires a family on every row and would answer a 400 for the whole
   game.

   Moving a game to another family is asked about rather than just done. The id
   carries the date and the game's number within it but not the family, so a game
   moved onto a day the other family already has a game of that number on lands on
   top of it. Rare, and not something this can check from here, but it's worth the
   reader knowing before it happens rather than after. */
function EditingBanner({ game, familyName, onChangeFamily }) {
  const [draft, setDraft] = useState(familyName);
  const [confirming, setConfirming] = useState(false);

  const entered = draft.trim();
  const changed = !!entered && entered.toUpperCase() !== familyName.trim().toUpperCase();

  const save = (e) => {
    e.preventDefault();
    if (changed) {
      setConfirming(true);
    }
  };

  const applyChange = () => {
    setConfirming(false);
    onChangeFamily(entered);
  };

  return (
    <>
      <p className="notice is-important">
        Editing {formatDate(game.date)} · Game {game.number}. Submitting writes it
        back under that same date and number.
      </p>

      <form className="start-new-game" onSubmit={save}>
        <label htmlFor="editing-family">Family Name</label>
        <input
          id="editing-family"
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button type="submit" disabled={!changed}>Change Family</button>
      </form>

      {confirming &&
        <ConfirmModal
          heading="Change Family"
          message={`File this game under the ${titleCase(entered)} family instead of ${titleCase(familyName)}? It keeps the same date and game number, so it will overwrite a game the ${titleCase(entered)} family already has under those.`}
          confirmLabel="Change Family"
          onConfirm={applyChange}
          onClose={() => setConfirming(false)}
        />
      }
    </>
  );
}

export default EditingBanner
