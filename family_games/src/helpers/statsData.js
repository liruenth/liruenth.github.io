/*
Turning game history back into score sheets.

The API stores one row per player per round, and hands the history back grouped
by game id but otherwise flat — there is no game object, no roster, no totals.
What the sheet works in is a Map of player to a Map of round to score, so that's
what a game is pivoted into here: the shape helpers/scoring.js already ranks and
totals, so ranking and totalling a finished game is the same code that ranked it
while it was being played.

Two things the store does on the way in that have to be undone on the way out:
every string is uppercased, and the fields are renamed (`player`, not
`player_name`). The renaming is why the rows are read by their stored names below.
*/
import { rowTotal, sortedByTotal } from './scoring';
import { roundsFor, winsWith } from './gameTypes';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Names are stored shouting, which is not how anyone wants to read a roster.
export function titleCase(name) {
  return String(name ?? '').toLowerCase().replace(/\b\p{L}/gu, (c) => c.toUpperCase());
}

/* Split on the parts rather than handing the string to Date, which reads a
   bare YYYY-MM-DD as UTC and so names the day before for anyone behind it —
   the same trap that keeps helpers/gameId.js off toISOString(). */
export function formatDate(date) {
  const [year, month, day] = String(date ?? '').split('-');
  const name = MONTHS[Number(month) - 1];

  // A date the store shouldn't hold but might is better shown raw than dropped
  return name && year && day ? `${name} ${Number(day)}, ${year}` : String(date ?? '');
}

/* A game's rows into the sheet that was played, plus what the stats page sorts
   and filters on. Every round of the type gets a column, played or not, so games
   stacked one under another line up rather than each being its own width — a game
   that ended early is blank in the rounds it never reached, exactly as its sheet
   looked. Rounds the type doesn't list are appended, so data written before a
   round list changed still renders in full. */
function buildGame(gameId, type, rows) {
  const scores = new Map();
  const seenRounds = [];

  for (const row of rows) {
    if (!scores.has(row.player)) {
      scores.set(row.player, new Map());
    }
    scores.get(row.player).set(row.round, Number(row.score));

    if (!seenRounds.includes(row.round)) {
      seenRounds.push(row.round);
    }
  }

  const known = roundsFor(type);
  const rounds = [...known, ...seenRounds.filter((round) => !known.includes(round))];

  const totals = new Map(
    [...scores].map(([player, playerScores]) => [player, rowTotal(playerScores, rounds)])
  );
  const scoreList = [...totals.values()];
  const lowestTotal = scoreList.length ? Math.min(...scoreList) : null;
  const highestTotal = scoreList.length ? Math.max(...scoreList) : null;

  /* The sheet ranks low total first, which is Contract Rummy's order but the
     wrong way round for a game high score takes — so it's reversed for those,
     leaving the winner the top row of either. Everyone level with the winning
     total won it: a tie is a tie, not whichever of them the sort put first. */
  const high = winsWith(type) === 'high';
  const ascending = [...sortedByTotal(scores, rounds).keys()];
  const ranked = high ? ascending.reverse() : ascending;
  const winningTotal = high ? highestTotal : lowestTotal;
  const winners = ranked.filter((player) => totals.get(player) === winningTotal);

  /* The id is unique per day, and a day's games are told apart by the counter the
     id ends in — which is the number the game was known by while it was on. An id
     that's only a date is one the rows never carried, so there's no number to show
     and the heading says the day alone rather than inventing one. */
  const counter = gameId.lastIndexOf('_');

  return {
    key: `${gameId}#${type}`,
    gameId,
    gameNumber: counter === -1 ? null : gameId.slice(counter + 1),
    date: rows[0]?.date ?? (counter === -1 ? gameId : gameId.slice(0, counter)),
    type,
    players: [...scores.keys()],
    rounds,
    scores,
    totals,
    ranked,
    winners,
    playerCount: scores.size,
    lowestTotal,
    highestTotal,
  };
}

/* The history into a flat list of games, newest first.

   Grouped from the rows rather than from the keys the response arrived under. Each
   row names its own game, and taking the id from the row is what makes this
   independent of how the endpoint chose to group — a handler grouping on an
   attribute the rows don't carry answers one bucket called "undefined", and the
   whole history would read as a single game.

   Split by type as well as by id, because the id doesn't carry the type — it's
   the date and a counter within it — so the same id can come back from two types
   and mean two different games. Left merged they'd share a table and the rounds
   of one would read as blanks in the other. */
export function toGames(grouped) {
  const byGame = new Map();

  for (const rows of Object.values(grouped ?? {})) {
    for (const row of rows ?? []) {
      // A row with no id at all can't be told from the day's other games, so the
      // date is as far apart as those can be pulled.
      const gameId = row.id ?? row.date;
      const key = `${gameId}#${row.type}`;

      if (!byGame.has(key)) {
        byGame.set(key, { gameId, type: row.type, rows: [] });
      }
      byGame.get(key).rows.push(row);
    }
  }

  const games = [...byGame.values()]
    .map(({ gameId, type, rows }) => buildGame(gameId, type, rows));

  return sortGames(games, 'date-desc');
}

// Every player who appears anywhere in the list, for the filter to offer.
export function allPlayers(games) {
  return [...new Set(games.flatMap((game) => game.players))].sort();
}

/* How many games each date holds. Counted over whatever list it's given rather
   than the whole history, so filtering to one player answers how many games that
   player played in a day rather than how many were played around them. */
export function gamesPerDay(games) {
  const perDay = new Map();

  for (const game of games) {
    perDay.set(game.date, (perDay.get(game.date) ?? 0) + 1);
  }

  return perDay;
}

/* What each player has to show for every game in the list. Recomputed from the
   filtered list, so it answers for what's on screen rather than for all time.

   Only the wins compare across types. A total means something different in each
   game — and best and worst are which way its own type counts, so a board over
   two of them is stating them in two units at once. That board is read by
   filtering to one type; wins are the column that holds either way. */
export function careerTotals(games) {
  const byPlayer = new Map();

  for (const game of games) {
    const better = winsWith(game.type) === 'high' ? Math.max : Math.min;
    const worse = better === Math.max ? Math.min : Math.max;

    for (const player of game.players) {
      const total = game.totals.get(player);

      if (!byPlayer.has(player)) {
        byPlayer.set(player, {
          player,
          gamesPlayed: 0,
          wins: 0,
          totalPoints: 0,
          bestGame: total,
          worstGame: total,
        });
      }

      const stats = byPlayer.get(player);
      stats.gamesPlayed += 1;
      stats.totalPoints += total;
      stats.bestGame = better(stats.bestGame, total);
      stats.worstGame = worse(stats.worstGame, total);

      if (game.winners.includes(player)) {
        stats.wins += 1;
      }
    }
  }

  return [...byPlayer.values()]
    .map((stats) => ({
      ...stats,
      avgTotal: Math.round(stats.totalPoints / stats.gamesPlayed),
    }))
    // Most wins leads; level on wins, the lower average is ahead.
    .sort((a, b) => b.wins - a.wins || a.avgTotal - b.avgTotal);
}

export const EMPTY_FILTERS = {
  players: [],
  dateFrom: '',
  dateTo: '',
  type: '',
};

/* Dates compare as strings: they're stored YYYY-MM-DD, which sorts the same way
   it reads, and is the format the date inputs hand back too.

   A player filter passes a game any of the chosen players were in, rather than
   only games all of them were in — picking two people asks for their games, not
   just the ones they both sat at. */
export function applyFilters(games, filters) {
  const { players, dateFrom, dateTo, type } = { ...EMPTY_FILTERS, ...filters };

  return games.filter((game) => {
    if (type && game.type !== type) {
      return false;
    }
    if (dateFrom && game.date < dateFrom) {
      return false;
    }
    if (dateTo && game.date > dateTo) {
      return false;
    }
    if (players.length && !players.some((player) => game.players.includes(player))) {
      return false;
    }

    return true;
  });
}

export const SORT_OPTIONS = [
  { id: 'date-desc', label: 'Newest first' },
  { id: 'date-asc', label: 'Oldest first' },
  { id: 'total-desc', label: 'Highest total' },
  { id: 'total-asc', label: 'Lowest total' },
  { id: 'players-desc', label: 'Most players' },
  { id: 'day-games-desc', label: 'Most games in a day' },
];

export const DEFAULT_SORT = 'date-desc';

/* Newest first, and within a date the last game played first. Both halves of the
   id are ordered, so this is also the tie-break every other sort falls back on —
   which is why it settles the type as well. Two types can share an id, and a
   comparator that called them equal would leave their order to be whatever the
   API happened to answer in, so re-sorting the same games could reorder them. */
function byNewest(a, b) {
  return b.date.localeCompare(a.date)
    || Number(b.gameNumber) - Number(a.gameNumber)
    || a.type.localeCompare(b.type);
}

/* Sorting is on a copy — the list handed in is the one filtering produced, and
   for the default sort that's already the order wanted. */
export function sortGames(games, sortKey = DEFAULT_SORT) {
  const sorted = [...games];

  if (sortKey === 'day-games-desc') {
    // The busiest days first, with each day's own games kept in order under it,
    // so the day reads as the run of games it was.
    const perDay = gamesPerDay(games);
    return sorted.sort((a, b) =>
      (perDay.get(b.date) ?? 0) - (perDay.get(a.date) ?? 0) || byNewest(a, b)
    );
  }

  switch (sortKey) {
    case 'date-asc':
      return sorted.sort((a, b) => -byNewest(a, b));
    // The highest and lowest of a game are the ends of its ranking: the worst
    // total anyone finished on, and the winning one.
    case 'total-desc':
      return sorted.sort((a, b) => b.highestTotal - a.highestTotal || byNewest(a, b));
    case 'total-asc':
      return sorted.sort((a, b) => a.lowestTotal - b.lowestTotal || byNewest(a, b));
    case 'players-desc':
      return sorted.sort((a, b) => b.playerCount - a.playerCount || byNewest(a, b));
    default:
      return sorted.sort(byNewest);
  }
}
