import { useState, useMemo } from 'react'
import './StatsTable.css'
import { titleCase } from '../../helpers/statsData'
import { gameTypeLabel, roundCellFor } from '../../helpers/gameTypes'

/* One game's board: a row per player, and what they have to show for every game
   of that type on screen.

   The five record columns are the ones worth looking at rather than only
   reading, so each is the way into the game it was set in — see RecordCell at
   the foot of this file.

   Which columns there are is the one thing the games don't share. A round that
   holds a bid and a took has two more records in it than a round that's a score
   on its own, so the same switch GameTable uses to draw a round decides here
   whether those columns exist at all.

   Every column can be sorted on. The order the rows arrive in — wins, then
   average, worked out in boardRows in helpers/statsData.js — is the one the
   board is for, so it's what a column sorted twice and then a third time comes
   back to, rather than a fourth state nobody asked for. */

/* What each column is worth sorting on, which is not always what it shows: Win %
   is a ratio rounded for display, and a record cell is an object with the number
   inside it.

   Null is a column a player has nothing in — no games, or no record — and is
   handled apart from the numbers below rather than read as a small one. Nought is
   not null: a hand bid at nothing is a real record, which is the same distinction
   RecordCell makes. */
const SORT_VALUES = {
  player: (row) => row.player,
  gamesPlayed: (row) => row.gamesPlayed,
  wins: (row) => row.wins,
  winRate: (row) => row.winRate,
  avgTotal: (row) => row.avgTotal,
  lowestGameTotal: (row) => row.records.lowestGameTotal.value,
  highestGameTotal: (row) => row.records.highestGameTotal.value,
  highestScore: (row) => row.records.highestScore.value,
  highestBid: (row) => row.records.highestBid.value,
  highestTook: (row) => row.records.highestTook.value,
};

/* Which way a column opens. Most of these are counts and records, where the
   interesting end is the big one; the names are a list to look somebody up in,
   which is A to Z. */
const OPENS_ASCENDING = new Set(['player']);

const missing = (value) => value === null || value === undefined;

/* Click through descending, ascending, and back to the board's own ranking. The
   third state is the point of the cycle: the default order says something the
   columns can't — it's the standings — so there has to be a way back to it that
   isn't reloading the page. */
function nextSort(sort, key) {
  const opening = OPENS_ASCENDING.has(key) ? 'asc' : 'desc';

  if (sort?.key !== key) {
    return { key, direction: opening };
  }

  if (sort.direction === opening) {
    return { key, direction: opening === 'asc' ? 'desc' : 'asc' };
  }

  return null;
}

/* Nothing to show sorts last whichever way the column points — an empty cell
   isn't a low number, it's a player who hasn't got one — which is the same rule
   the default ranking applies to players with no games.

   Ties fall back to the name so the order is the same every time a column is
   sorted on: Array.prototype.sort is stable, but the rows it's given have already
   been through a sort of their own, so "the same as last time" is only true if
   it's said here. */
function sortRows(rows, sort) {
  if (!sort) {
    return rows;
  }

  const valueOf = SORT_VALUES[sort.key];
  const direction = sort.direction === 'asc' ? 1 : -1;

  return [...rows].sort((a, b) => {
    const left = valueOf(a);
    const right = valueOf(b);

    if (missing(left) || missing(right)) {
      return (missing(left) ? 1 : 0) - (missing(right) ? 1 : 0);
    }

    const order = typeof left === 'string'
      ? left.localeCompare(right)
      : left - right;

    return direction * order || a.player.localeCompare(b.player);
  });
}

function PlayerBoard({ board, onRecord }) {
  const { type, rows } = board;
  const bidTook = roundCellFor(type) === 'bid-took';

  /* One sort per board, because there's a board per game type on the page and
     they're read one at a time — Contract Rummy's highest score and Mormon
     Bridge's are different questions.

     Null is the order boardRows built, which is the ranking. Held here rather
     than worked out from the rows, whose identity changes on every render of the
     page above (playerBoards is recomputed each time Stats filters). */
  const [sort, setSort] = useState(null);
  const sorted = useMemo(() => sortRows(rows, sort), [rows, sort]);

  const sortProps = { sort, onSort: setSort };

  return (
    <article className="game-block">
      <h2>{gameTypeLabel(type)}</h2>

      <div className="stats-table-scroll">
        <table className="stats-table">
          <thead>
            <tr>
              <SortHeader
                sortKey="player"
                label="Player"
                className="stats-table-name"
                {...sortProps}
              />
              <SortHeader sortKey="gamesPlayed" label="Played" {...sortProps} />
              <SortHeader sortKey="wins" label="Wins" {...sortProps} />
              <SortHeader
                sortKey="winRate"
                label="Win %"
                title="Games won as a share of games played"
                {...sortProps}
              />
              <SortHeader
                sortKey="avgTotal"
                label="Average"
                title="Average total across those games"
                {...sortProps}
              />
              <SortHeader
                sortKey="lowestGameTotal"
                label="Lowest Total"
                title="Their lowest total in a single game"
                {...sortProps}
              />
              <SortHeader
                sortKey="highestGameTotal"
                label="Highest Total"
                title="Their highest total in a single game"
                {...sortProps}
              />
              {/* Named for what it is rather than for whether it's good news:
                  the biggest round of Mormon Bridge is the best one, and the
                  biggest round of Contract Rummy is the worst. */}
              <SortHeader
                sortKey="highestScore"
                label="Highest Score"
                title="The most they ever scored in a single round"
                {...sortProps}
              />
              {bidTook && (
                <>
                  <SortHeader
                    sortKey="highestBid"
                    label="Highest Bid"
                    title="The most tricks they ever bid for in a round"
                    {...sortProps}
                  />
                  <SortHeader
                    sortKey="highestTook"
                    label="Highest Took"
                    title="The most tricks they ever took in a round"
                    {...sortProps}
                  />
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {sorted.map(({ player, gamesPlayed, wins, winRate, avgTotal, records }) => (
              <tr key={player}>
                <th scope="row" className="stats-table-name">{titleCase(player)}</th>
                <td>{gamesPlayed}</td>
                <td>{wins}</td>
                <td>{Math.round(winRate * 100)}%</td>
                <td>{avgTotal}</td>
                <RecordCell
                  record={records.lowestGameTotal}
                  player={player}
                  label="Lowest Total"
                  onRecord={onRecord}
                />
                <RecordCell
                  record={records.highestGameTotal}
                  player={player}
                  label="Highest Total"
                  onRecord={onRecord}
                />
                <RecordCell
                  record={records.highestScore}
                  player={player}
                  label="Highest Score"
                  onRecord={onRecord}
                />
                {bidTook && (
                  <>
                    <RecordCell
                      record={records.highestBid}
                      player={player}
                      label="Highest Bid"
                      onRecord={onRecord}
                    />
                    <RecordCell
                      record={records.highestTook}
                      player={player}
                      label="Highest Took"
                      onRecord={onRecord}
                    />
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

/* A column heading and the way to sort on it.

   The whole cell is the button, the same way a record cell is — a heading is a
   small target to begin with and half of them are two words, so anything less
   than the whole of it is a heading you have to aim at.

   aria-sort goes on the cell rather than the button because it's the column
   that's sorted, and the arrow is hidden from readers that have been told so
   already. The arrow's box is there whether or not it holds one, so a column
   doesn't change width as it's sorted and take the table's layout with it. */
function SortHeader({ sortKey, label, title, className, sort, onSort }) {
  const active = sort?.key === sortKey;
  const ascending = active && sort.direction === 'asc';

  return (
    <th
      scope="col"
      /* Its own class as well as whatever the column carries: the padding has to
         come off this cell and go onto the button inside it, and the same table
         is drawn by GameTable, whose headings are headings and nothing more. */
      className={className ? `stats-sort-cell ${className}` : 'stats-sort-cell'}
      title={title}
      aria-sort={active ? (ascending ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        className={active ? 'stats-sort is-sorted' : 'stats-sort'}
        onClick={() => onSort((previous) => nextSort(previous, sortKey))}
      >
        {label}
        <span className="stats-sort-arrow" aria-hidden="true">
          {active ? (ascending ? '▲' : '▼') : ''}
        </span>
      </button>
    </th>
  );
}

/* A record and the way to the games it was set in.

   Whose record it is and what it was travel with the games, because the sheet
   that opens can't say either: a rebuilt game marks the winner's row and nothing
   else, so a table of five players over ten rounds doesn't show which number was
   the one clicked. The heading is where that's said.

   A record of zero is a record — a hand bid at nothing, a round taken nothing in
   — so the cell asks whether there's a value, not whether the value is truthy. */
function RecordCell({ record, player, label, onRecord }) {
  if (record.value === null) {
    return <td />;
  }

  return (
    <td className="stats-record-cell">
      <button
        type="button"
        className="stats-record"
        onClick={() => onRecord({
          heading: `${titleCase(player)} · ${label} · ${record.value}`,
          games: record.games,
        })}
      >
        {record.value}
      </button>
    </td>
  );
}

export default PlayerBoard
