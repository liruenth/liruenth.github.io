/*
- prompt user for `family name`
- grab list of players from api request using `family name` (stub url for now)
- populate an interface for selecting players from the list grabbed
- Allow users to select, deselect, and add new players
- On confirmation return the selected players as an array
*/
import { useState } from 'react'
import './StartNewGame.css'

// TODO: point at the real AWS endpoint once it exists (see README)
const PLAYERS_URL = 'https://stub.family-games.invalid/api/families';

// Used when the stub endpoint is unreachable so the flow stays usable pre-backend.
const STUB_PLAYERS = ["Jim", "Joe", "Jay", "Sal", "Gpa", "Gma", "Mike", "Cry", "Rex", "Johnny", "Cami", "Emily"];

async function fetchFamilyPlayers(familyName) {
  const res = await fetch(`${PLAYERS_URL}/${encodeURIComponent(familyName)}/players`);
  if (!res.ok) {
    throw new Error(`Request failed with ${res.status}`);
  }
  return res.json();
}

function StartNewGame({ familyName, setFamilyName, onConfirm }) {
  const [familyInput, setFamilyInput] = useState('');
  const [players, setPlayers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [newPlayer, setNewPlayer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [usingStub, setUsingStub] = useState(false);

  const loadPlayers = async (e) => {
    e.preventDefault();
    const name = familyInput.trim();
    if (!name) {
      return;
    }

    setLoading(true);
    setError(null);
    setUsingStub(false);

    try {
      const roster = await fetchFamilyPlayers(name);
      setPlayers(roster);
    } catch {
      // The stub URL never resolves, so fall back to a local roster.
      setPlayers(STUB_PLAYERS);
      setUsingStub(true);
    }

    setFamilyName(name);
    setSelected([]);
    setLoading(false);
  };

  const togglePlayer = (player) => {
    setSelected((prev) =>
      prev.includes(player)
        ? prev.filter((p) => p !== player)
        : [...prev, player]
    );
  };

  const addPlayer = (e) => {
    e.preventDefault();
    const name = newPlayer.trim();
    if (!name) {
      return;
    }

    const duplicate = players.some((p) => p.toLowerCase() === name.toLowerCase());
    if (duplicate) {
      setError(`${name} is already on the list`);
      return;
    }

    // TODO: persist new players to the family roster once the API is live
    setPlayers((prev) => [...prev, name]);
    setSelected((prev) => [...prev, name]);
    setNewPlayer('');
    setError(null);
  };

  const changeFamily = () => {
    setFamilyName('');
    setPlayers([]);
    setSelected([]);
    setNewPlayer('');
    setError(null);
    setUsingStub(false);
  };

  if (!familyName) {
    return (
      <section id="center">
        <div>
          <h1>New Game</h1>
        </div>
        <form className="start-new-game" onSubmit={loadPlayers}>
          <label htmlFor="family-name">Family Name</label>
          <input
            id="family-name"
            type="text"
            value={familyInput}
            autoFocus
            onChange={(e) => setFamilyInput(e.target.value)}
          />
          <button type="submit" disabled={!familyInput.trim() || loading}>
            {loading ? 'Loading Players...' : 'Find Players'}
          </button>
        </form>
      </section>
    );
  }

  return (
    <section id="center">
      <div>
        <h1>Who's Playing?</h1>
        <p>
          {familyName} family
          <button type="button" className="link-button" onClick={changeFamily}>
            change
          </button>
        </p>
      </div>

      {usingStub && <p className="notice">Roster unavailable — showing stub players.</p>}
      {error && <p className="notice">{error}</p>}

      <ul className="player-list">
        {players.map((player) => (
          <li key={player}>
            <label className={selected.includes(player) ? 'player selected' : 'player'}>
              <input
                type="checkbox"
                checked={selected.includes(player)}
                onChange={() => togglePlayer(player)}
              />
              {player}
            </label>
          </li>
        ))}
      </ul>

      <form className="start-new-game" onSubmit={addPlayer}>
        <label htmlFor="new-player">Add Player</label>
        <input
          id="new-player"
          type="text"
          value={newPlayer}
          onChange={(e) => setNewPlayer(e.target.value)}
        />
        <button type="submit" disabled={!newPlayer.trim()}>Add</button>
      </form>

      <button
        type="button"
        className="rummy"
        disabled={selected.length === 0}
        onClick={() => onConfirm(selected)}
      >
        Start Game ({selected.length})
      </button>
    </section>
  );
}

export default StartNewGame
