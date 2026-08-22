import { useState } from 'react'
import { parseFamilyName } from '../../helpers/statsData'

/* Asked on every visit rather than remembered: the stored family is whoever the
   score sheet was last used for, which is a good guess but not an answer — the
   page exists to look up families, including ones nobody is mid-game with. So the
   name is prefilled and the ask is a single keystroke to confirm. */
function FamilyNamePrompt({ storageKey, onSubmit }) {
  const [familyInput, setFamilyInput] = useState(
    () => localStorage.getItem(storageKey) ?? ''
  );

  /* A star on the end of the name asks for the edit pencils as well as the games,
     and is read here rather than on the page it turns them on for: what was typed
     is only ever in the field, and the name the star is on is not a family the
     page should look up, show or remember. */
  const { name, editable } = parseFamilyName(familyInput);

  const submit = (e) => {
    e.preventDefault();
    if (!name) {
      return;
    }

    onSubmit(name, editable);
  };

  return (
    <section id="center">
      <div>
        <h1>Stats</h1>
      </div>
      <form className="stats-form" onSubmit={submit}>
        <label htmlFor="stats-family-name">Family Name</label>
        <input
          id="stats-family-name"
          type="text"
          value={familyInput}
          autoFocus
          onChange={(e) => setFamilyInput(e.target.value)}
        />
        <button type="submit" disabled={!name}>Load Games</button>
      </form>
    </section>
  );
}

export default FamilyNamePrompt
