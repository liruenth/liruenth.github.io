/*
- prompt user for `family name` (every visit, prefilled from the last one used)
- pull that family's whole history from the API, one request per game type
- pivot each game back into the sheet it was played on and stack them, newest first
- filter and order the stack from the header, or switch to per-player totals
*/
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Stats.css'
import FamilyNamePrompt from './FamilyNamePrompt'
import StatsHeader from './StatsHeader'
import GameTable from './GameTable'
import PlayerTotals from './PlayerTotals'
import ConfirmModal from '../score_sheets/common/ConfirmModal'
import { fetchFamilyGames } from '../../api/routes'
import { restoreSheet } from '../../helpers/sheetStorage'
import { startEditing, editingGame } from '../../helpers/editGame'
import {
  toGames,
  canEdit,
  allPlayers,
  applyFilters,
  sortGames,
  playerBoards,
  titleCase,
  EMPTY_FILTERS,
  DEFAULT_SORT,
} from '../../helpers/statsData'

// The same key the score sheet keeps its family under, so the two agree on which
// family is being looked at and neither asks for a name the other already has.
const FAMILY_KEY = 'familyName';

function Stats() {
  const navigate = useNavigate();
  const [familyName, setFamilyName] = useState('');
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sort, setSort] = useState(DEFAULT_SORT);
  const [view, setView] = useState('games');
  // The game waiting on the reader saying the sheet can be cleared, or null when
  // there was nothing on it to ask about
  const [replacing, setReplacing] = useState(null);

  const resetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setSort(DEFAULT_SORT);
  };

  /* The family is set before the request rather than after it, so the header is
     already up to say whose games are loading — and to offer the way back out if
     the request is the thing that fails. */
  const loadGames = async (name) => {
    localStorage.setItem(FAMILY_KEY, name);
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

  /* Opens a finished game on the score sheet. The sheet holds one game at a time,
     so a game already on it has to go — which is worth asking about first, since
     an unfinished game isn't anywhere else. Asked only when there's something
     readable there: a sheet saved before the current format can't be restored
     either way, so offering to discard it would be offering to discard nothing.

     Everything the handoff writes is written by startEditing, so this is only the
     asking and the going. */
  const editGame = (game) => {
    if (restoreSheet()) {
      setReplacing(game);
      return;
    }

    openForEditing(game);
  };

  const openForEditing = (game) => {
    startEditing(game);
    navigate('/score-sheet');
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
              {/* A game the sheet couldn't write back is shown without the way in,
                  rather than with one that would file it somewhere else */}
              {visible.map((game) => (
                <GameTable
                  key={game.key}
                  game={game}
                  onEdit={canEdit(game) ? editGame : undefined}
                />
              ))}
            </div>
          )
          // Built here rather than beside `visible`, so the stack of games isn't
          // walked round by round for a table it isn't showing.
          : <PlayerTotals boards={playerBoards(visible)} />
      )}

      {replacing && (
        <ConfirmModal
          heading="Discard Current Sheet"
          message={editingGame()
            ? 'The edit already open on the score sheet has not been submitted. Opening this game will discard it.'
            : 'There is a game in progress on the score sheet. Opening this game will discard it.'}
          confirmLabel="Discard and Edit"
          onConfirm={() => openForEditing(replacing)}
          onClose={() => setReplacing(null)}
        />
      )}
    </section>
  )
}

export default Stats
