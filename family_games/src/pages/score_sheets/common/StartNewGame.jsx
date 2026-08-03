/*
- prompt user for `family name`
- grab list of players from api request using `family name` (stub url for now)
- populate an interface for selecting players from the list grabbed
- Allow users to select, deselect, and add new players
- On confirmation return the selected players as an array
*/
import { useState, useEffect } from 'react'
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

// Both ways in — the form below and the mount effect — go through here, so the
// fallback applies to either. Returns rather than sets, since the two callers
// are in a different position to say what should happen while it's in flight.
async function loadFamilyRoster(familyName) {
  try {
    return { roster: await fetchFamilyPlayers(familyName), usingStub: false };
  } catch {
    // The stub URL never resolves, so fall back to a local roster.
    return { roster: STUB_PLAYERS, usingStub: true };
  }
}

function StartNewGame({ familyName, setFamilyName, onConfirm }) {
  const [familyInput, setFamilyInput] = useState('');
  const [players, setPlayers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [newPlayer, setNewPlayer] = useState('');
  // Arriving with a family already set means the effect below is about to
  // fetch, so open in the loading state rather than flashing an empty roster.
  const [loading, setLoading] = useState(() => !!familyName);
  const [error, setError] = useState(null);
  const [usingStub, setUsingStub] = useState(false);

  const applyRoster = ({ roster, usingStub: fellBack }) => {
    setPlayers(roster);
    setUsingStub(fellBack);
    setSelected([]);
    setLoading(false);
  };

  // The family is set last so the form keeps showing its loading state rather
  // than handing over to a roster that hasn't arrived.
  const loadPlayers = async (e) => {
    e.preventDefault();
    const name = familyInput.trim();
    if (!name) {
      return;
    }

    setLoading(true);
    setError(null);
    applyRoster(await loadFamilyRoster(name));
    setFamilyName(name);
  };

  // Mounting with a family already set — a refresh part-way through setup, or a
  // new game carrying the family over — skips the form that would have fetched
  // the roster, so fetch it here instead. Without this the list renders empty
  // with no way to fill it but adding everyone by hand.
  //
  // Mount only. The obvious dependency is the roster being empty, but that's
  // also what a family with no players back from the API looks like, which
  // would leave it refetching forever. Listing familyName instead would refetch
  // the roster the form has just fetched, the moment it sets the family.
  useEffect(() => {
    if (!familyName) {
      return;
    }

    let cancelled = false;
    loadFamilyRoster(familyName).then((result) => {
      if (!cancelled) {
        applyRoster(result);
      }
    });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    // The roster can still be on its way in — changing family before it lands
    // would otherwise leave the form's button stuck on "Loading Players...".
    setLoading(false);
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

      {loading && <p className="notice">Loading players...</p>}
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
