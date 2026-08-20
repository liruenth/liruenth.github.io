/*
- prompt user for `family name`
- grab list of players from api request using `family name` (stub url for now)
- populate an interface for selecting players from the list grabbed
- Allow users to select, deselect, and add new players
- On confirmation return the selected players as an array
*/
import { useState, useEffect } from 'react'
import { fetchFamilyPlayers } from '../../../api/routes'
import { setupNoticeFor, hasGroups, startingRoundsFor } from '../../../helpers/gameTypes'
import { clampGroups, saveGroups } from '../../../helpers/groups'
import { saveStartingRound } from '../../../helpers/startingRound'
import './StartNewGame.css'

// Used when the roster can't be read, so the flow stays usable. Not used for a
// family that just hasn't played yet: an empty list is a roster the Add Player
// form below can fill, and inventing a dozen names for a real family is worse
// than handing back none.
const STUB_PLAYERS = ["Jim", "Joe", "Jay", "Sal", "Gpa", "Gma", "Mike", "Cry", "Rex", "Johnny", "Cami", "Emily"];

// Both ways in — the form below and the mount effect — go through here, so the
// fallback applies to either. Returns rather than sets, since the two callers
// are in a different position to say what should happen while it's in flight.
async function loadFamilyRoster(familyName) {
  try {
    return { roster: await fetchFamilyPlayers(familyName), usingStub: false };
  } catch {
    return { roster: STUB_PLAYERS, usingStub: true };
  }
}

function StartNewGame({ gameType, familyName, setFamilyName, onConfirm }) {
  // Whatever this game wants said about how its players are entered — Mormon
  // Bridge is played round the table, so the order they're picked in is the
  // order they'll bid in. Asked of the game rather than branched on here, so
  // this screen stays one screen however many games there end up being.
  const setupNotice = setupNoticeFor(gameType);

  /* Whether this game splits its table, asked of the game for the same reason as
     the notice above. The sheet can still change the count once it's open — this
     is so the table opens split rather than being split after the fact. */
  const splitsIntoGroups = hasGroups(gameType);

  /* Which rounds this game can open on, or nothing where it only opens the one
     way. Asked of the game for the same reason as the two above. Mormon Bridge is
     the one that answers: ten cards each is more than the deck holds once there
     are six playing, so a big table opens lower and repeats its opening round to
     keep the game ten rounds long. */
  const startingRounds = startingRoundsFor(gameType);

  const [familyInput, setFamilyInput] = useState('');
  const [players, setPlayers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [newPlayer, setNewPlayer] = useState('');
  /* Held as what was typed rather than as a number, and clamped on the way out —
     the same reason GroupsModal does: correcting it on every keystroke would take
     the first digit of a two-digit count away before the second one arrived. */
  const [groups, setGroups] = useState('1');
  /* The ordinary game, which the list names first. Held as the option's string
     because that's what a select hands back, and clamped to a number on the way
     into storage — see helpers/startingRound.js. */
  const [startingRound, setStartingRound] = useState(() => String(startingRounds?.[0] ?? ''));
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

  /* One group per player is as far as splitting them can go, which here is the
     players picked so far — the roster is everyone who could play, not everyone
     who is. It's the same ceiling the sheet applies, counted off the same rows. */
  const maxGroups = Math.max(1, selected.length);

  /* The count is handed over in storage rather than through onConfirm: it's read
     back by the sheet from there anyway, so passing it as well would leave two
     paths to the same number and a chance for them to disagree. Written only for
     a game that splits — nothing else looks at it, but a stale count is what
     ScoreSheet clears between games and there's no reason to write one back. */
  const startGame = () => {
    if (splitsIntoGroups) {
      saveGroups(clampGroups(groups, maxGroups));
    }

    // Handed over the same way and for the same reason. Only the sheet's seeding
    // reads it, and after that the sheet holds its own rounds.
    if (startingRounds) {
      saveStartingRound(startingRound);
    }

    onConfirm(selected);
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

      {setupNotice && <p className="notice is-important">{setupNotice}</p>}
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

      {/* Asked here rather than on the sheet because it decides what columns the
          sheet has: the opening round is played more than once to make the game
          up to ten, so picking it after the fact would be rewriting the rounds
          under whatever had already been entered. */}
      {startingRounds && (
        <label className="starting-round-field" htmlFor="start-round">
          Starting Round
          <select
            id="start-round"
            value={startingRound}
            onChange={(e) => setStartingRound(e.target.value)}
          >
            {startingRounds.map((round) => (
              <option key={round} value={round}>{round}</option>
            ))}
          </select>
        </label>
      )}

      {/* .groups-field is the modal's own field, shared the way .modal-actions
          already is — the sheet asks this same question mid-game, and the two
          should look like the one question they are. */}
      {splitsIntoGroups && (
        <label className="groups-field" htmlFor="start-groups">
          Groups
          <input
            id="start-groups"
            type="number"
            min="1"
            max={maxGroups}
            step="1"
            value={groups}
            onChange={(e) => setGroups(e.target.value)}
          />
        </label>
      )}

      <button
        type="button"
        className="rummy"
        disabled={selected.length === 0}
        onClick={startGame}
      >
        Start Game ({selected.length})
      </button>
    </section>
  );
}

export default StartNewGame
