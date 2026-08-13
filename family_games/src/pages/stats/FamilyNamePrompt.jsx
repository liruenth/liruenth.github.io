import { useState } from 'react'

/* Asked on every visit rather than remembered: the stored family is whoever the
   score sheet was last used for, which is a good guess but not an answer — the
   page exists to look up families, including ones nobody is mid-game with. So the
   name is prefilled and the ask is a single keystroke to confirm. */
function FamilyNamePrompt({ storageKey, onSubmit }) {
  const [familyInput, setFamilyInput] = useState(
    () => localStorage.getItem(storageKey) ?? ''
  );

  const submit = (e) => {
    e.preventDefault();
    const name = familyInput.trim();
    if (!name) {
      return;
    }

    onSubmit(name);
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
        <button type="submit" disabled={!familyInput.trim()}>Load Games</button>
      </form>
    </section>
  );
}

export default FamilyNamePrompt
