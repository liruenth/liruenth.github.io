import { useEffect, useRef, useState } from 'react'
import './StatsHeader.css'
import { GAME_TYPES } from '../../helpers/gameTypes'
import { SORT_OPTIONS, titleCase } from '../../helpers/statsData'

/* Everything that decides which games are shown and in what order. The controls
   are native — a disclosure for the player checkboxes, selects for the single
   choices — so keyboard, screen readers and the phone's own pickers come for free
   rather than being rebuilt. */
function StatsHeader({
  familyName, players, filters, setFilters, sort, setSort,
  view, setView, shown, total, onChangeFamily, onReset,
}) {
  /* A disclosure opens and shuts on its summary and nothing else, so dismissing
     the roster by clicking past it is wired up here — same as the sheet's actions
     menu, and for the same reason: a panel over the page that only closes from the
     control that opened it is one the reader has to go back and put away. Held in
     state rather than left on the element, so the two can't disagree about it. */
  const [playersOpen, setPlayersOpen] = useState(false);
  const playerFilter = useRef(null);

  useEffect(() => {
    if (!playersOpen) return;

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setPlayersOpen(false);
    };

    // mousedown rather than click, matching ActionsMenu: a checkbox re-rendered
    // out from under the click would leave it landing on nothing, reading as
    // outside and shutting the list mid-selection.
    const closeOnOutsideClick = (event) => {
      if (!playerFilter.current.contains(event.target)) setPlayersOpen(false);
    };

    window.addEventListener('keydown', closeOnEscape);
    window.addEventListener('mousedown', closeOnOutsideClick);
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('mousedown', closeOnOutsideClick);
    };
  }, [playersOpen]);

  const update = (key) => (e) =>
    setFilters((prev) => ({ ...prev, [key]: e.target.value }));

  const togglePlayer = (player) => {
    setFilters((prev) => ({
      ...prev,
      players: prev.players.includes(player)
        ? prev.players.filter((p) => p !== player)
        : [...prev.players, player],
    }));
  };

  const filtered = filters.players.length > 0 ||
    !!filters.dateFrom || !!filters.dateTo || !!filters.type || !!filters.status;

  return (
    <div className="stats-header">
      <div>
        <h1>Stats</h1>
        <p>
          {titleCase(familyName)} family
          <button type="button" className="link-button" onClick={onChangeFamily}>
            change
          </button>
        </p>
      </div>

      <div className="stats-views" role="group" aria-label="View">
        <button
          type="button"
          className={view === 'games' ? 'stats-view is-active' : 'stats-view'}
          aria-pressed={view === 'games'}
          onClick={() => setView('games')}
        >
          Games
        </button>
        <button
          type="button"
          className={view === 'players' ? 'stats-view is-active' : 'stats-view'}
          aria-pressed={view === 'players'}
          onClick={() => setView('players')}
        >
          Players
        </button>
      </div>

      <div className="stats-filters">
        {/* Closed by default — a family of a dozen would otherwise be the whole
            header. The count on the summary is what's picked while it's shut. */}
        <details
          ref={playerFilter}
          className="stats-filter stats-player-filter"
          open={playersOpen}
          // Fires whichever way it was opened, so a click on the summary is what
          // keeps the state above in step with the element.
          onToggle={(e) => setPlayersOpen(e.currentTarget.open)}
        >
          <summary>
            Players{filters.players.length > 0 && ` (${filters.players.length})`}
          </summary>
          <ul className="player-list">
            {players.map((player) => {
              const selected = filters.players.includes(player);
              return (
                <li key={player}>
                  <label className={selected ? 'player selected' : 'player'}>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => togglePlayer(player)}
                    />
                    {titleCase(player)}
                  </label>
                </li>
              );
            })}
          </ul>
        </details>

        <label className="stats-filter">
          From
          <input type="date" value={filters.dateFrom} onChange={update('dateFrom')} />
        </label>

        <label className="stats-filter">
          To
          <input type="date" value={filters.dateTo} onChange={update('dateTo')} />
        </label>

        <label className="stats-filter">
          Game
          <select value={filters.type} onChange={update('type')}>
            <option value="">All games</option>
            {GAME_TYPES.map((type) => (
              <option key={type.id} value={type.id}>{type.label}</option>
            ))}
          </select>
        </label>

        {/* A game nobody played the last round of has no winner, and is kept out
            of everything the player boards count — so being able to pick them out
            is how you see what the boards are leaving alone. */}
        <label className="stats-filter">
          Status
          <select value={filters.status} onChange={update('status')}>
            <option value="">All games</option>
            <option value="finished">Finished</option>
            <option value="unfinished">Unfinished</option>
          </select>
        </label>

        {/* Ordering the stack of games says nothing about a table of players,
            which is ranked by wins on its own. */}
        {view === 'games' && (
          <label className="stats-filter">
            Order
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              {SORT_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </label>
        )}

        <button
          type="button"
          className="link-button"
          disabled={!filtered}
          onClick={onReset}
        >
          reset
        </button>
      </div>

      {/* "3 of 12" only once a filter is hiding something — an unfiltered count
          of itself reads as though something were being held back. */}
      <p className="notice">
        {shown === total ? `${total} games` : `${shown} of ${total} games`}
      </p>
    </div>
  );
}

export default StatsHeader
