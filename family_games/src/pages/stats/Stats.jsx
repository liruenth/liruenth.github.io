/*
- prompt user for `family name` (every visit, prefilled from the last one used)
- pull that family's whole history from the API, one request per game type
- pivot each game back into the sheet it was played on and stack them, newest first
- filter and order the stack from the header, or switch to per-player totals
*/
import { useState } from 'react'
import './Stats.css'
import FamilyNamePrompt from './FamilyNamePrompt'
import StatsHeader from './StatsHeader'
import GameTable from './GameTable'
import PlayerTotals from './PlayerTotals'
import { fetchFamilyGames } from '../../api/routes'
import {
  toGames,
  allPlayers,
  applyFilters,
  sortGames,
  careerTotals,
  titleCase,
  EMPTY_FILTERS,
  DEFAULT_SORT,
} from '../../helpers/statsData'

// The same key the score sheet keeps its family under, so the two agree on which
// family is being looked at and neither asks for a name the other already has.
const FAMILY_KEY = 'familyName';

function Stats() {
  const [familyName, setFamilyName] = useState('');
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sort, setSort] = useState(DEFAULT_SORT);
  const [view, setView] = useState('games');

  const resetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setSort(DEFAULT_SORT);
  };

  /* The family is set before the request rather than after it, so the header is
     already up to say whose games are loading — and to offer the way back out if
     the request is the thing that fails. */
  const loadGames = async (name) => {
    sessionStorage.setItem(FAMILY_KEY, name);
    setFamilyName(name);
    setLoading(true);
    setError(null);
    resetFilters();

    try {
      setGames(toGames(await fetchFamilyGames(name)));
    } catch (err) {
      setError(err.message);
      setGames([]);
    } finally {
      setLoading(false);
    }
  };

  const changeFamily = () => {
    setFamilyName('');
    setGames([]);
    setError(null);
    // The request can still be on its way in — clearing the family before it
    // lands would otherwise leave the form behind a loading notice it can't clear.
    setLoading(false);
  };

  if (!familyName) {
    return <FamilyNamePrompt storageKey={FAMILY_KEY} onSubmit={loadGames} />;
  }

  /* Filtering first, then ordering what survived: the busiest-day order counts
     the games on screen, so it has to see the filtered list. The totals are built
     from the same list, so they answer for what's shown rather than for all time.
     The filter's own player list comes from every game, though — filtering to one
     player shouldn't take everyone else out of the picker. */
  const visible = sortGames(applyFilters(games, filters), sort);
  const loaded = !loading && !error;

  return (
    <section id="center" className="stats">
      <StatsHeader
        familyName={familyName}
        players={allPlayers(games)}
        filters={filters}
        setFilters={setFilters}
        sort={sort}
        setSort={setSort}
        view={view}
        setView={setView}
        shown={visible.length}
        total={games.length}
        onChangeFamily={changeFamily}
        onReset={resetFilters}
      />

      {loading && <p className="notice">Loading games...</p>}
      {error && <p className="notice">{error}</p>}
      {loaded && games.length === 0 &&
        <p className="notice">No games found for the {titleCase(familyName)} family.</p>
      }
      {loaded && games.length > 0 && visible.length === 0 &&
        <p className="notice">No games match these filters.</p>
      }

      {loaded && visible.length > 0 && (
        view === 'games'
          ? (
            <div className="game-list">
              {visible.map((game) => <GameTable key={game.key} game={game} />)}
            </div>
          )
          : <PlayerTotals totals={careerTotals(visible)} />
      )}
    </section>
  )
}

export default Stats
