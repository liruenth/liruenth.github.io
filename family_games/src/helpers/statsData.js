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
import { mbRowTotal, mbRounds, mbStartingRound } from './mormonBridge';
import { roundsFor, winsWith, roundCellFor, rowOrderFor, GAME_TYPE_IDS } from './gameTypes';

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

// A number the row didn't carry reads back blank, not zero — a round nobody bid
// in isn't a round somebody bid nothing in.
function storedNumber(value) {
  return value === undefined || value === null || value === '' || !Number.isFinite(Number(value))
    ? ''
    : Number(value);
}

/* What a game is read out of: what each player scored in each round, where they
   sat, and the rounds the game actually touched.

   `players` is a list rather than an object keyed by name so that its order
   survives being stored: it is the order the rows used to arrive in back when a
   game was rows, and a game written before seats were stored has nothing else to
   say where its players sat — which for Mormon Bridge is the order the bidding
   went round. */
function foldPlayers(players, bidTook) {
  const scores = new Map();
  const seats = new Map();
  const seenRounds = [];

  for (const entry of players ?? []) {
    const played = new Map();

    for (const [round, cell] of Object.entries(entry.rounds ?? {})) {
      played.set(round, bidTook
        ? { bid: storedNumber(cell.bid), took: storedNumber(cell.took), score: Number(cell.score) }
        : Number(cell.score));

      if (!seenRounds.includes(round)) {
        seenRounds.push(round);
      }
    }

    scores.set(entry.player, played);

    // Absent on a game folded from rows that predate seats, and left absent here
    // rather than counted from the list — a position in the list is where the
    // player is read back in, not a seat the game ever recorded.
    if (storedNumber(entry.seat) !== '') {
      seats.set(entry.player, Number(entry.seat));
    }
  }

  return { scores, seats, seenRounds };
}

/* Who played the game out: everyone with a score in its last round.

   The last round of the game's own list, not the last one anybody got to. Those
   are the same thing in a game that was played out, and in one that was abandoned
   they are the difference between the game having a winner and not having one —
   whoever got furthest into a game everybody walked away from didn't win it.

   Read off what's stored, which holds only the rounds that were played: a round
   left blank on the sheet is never written, so having a score in a round and
   having played it are the same thing.

   Nobody, and the game was never finished — see `unfinished` below. */
function finishersOf(rounds, scores) {
  const last = rounds[rounds.length - 1];

  return new Set(
    last === undefined
      ? []
      : [...scores.keys()].filter((player) => scores.get(player).has(last))
  );
}

/* A game into the sheet that was played, plus what the stats page sorts and
   filters on. Every round the game was played over gets a column, reached or not,
   so games stacked one under another line up rather than each being its own width
   — a game that ended early is blank in the rounds it never got to, exactly as its
   sheet looked. Rounds that list doesn't hold are appended, so data written before
   a round list changed still renders in full.

   A cell is whatever that type's round holds — a score, or the bid and took with
   the score worked out from them — so a rebuilt game is the same shape the sheet
   works in either way, and totalled the way that sheet totals it.


   `game` is the stored item: the game, with its players and their rounds. */
function buildGame(gameId, type, game) {
  const bidTook = roundCellFor(type) === 'bid-took';
  const total = bidTook ? mbRowTotal : rowTotal;

  const { scores, seats, seenRounds } = foldPlayers(game.players, bidTook);

  /* Which rounds this game gets a column for. Not simply the type's list, because
     a Mormon Bridge game's rounds depend on where it opened: a table too big to be
     dealt ten cards each opens on nine or eight and repeats that round to keep the
     game ten long. Nothing stores which — the round names carry it, `8+` being a
     round only a game that opened on eight has — so it's read back off the rounds
     the game holds. That is also what puts the repeats at the front where they were
     played rather than appended below as rounds the type doesn't list. */
  const known = bidTook ? mbRounds(mbStartingRound(seenRounds)) : roundsFor(type);
  const rounds = [...known, ...seenRounds.filter((round) => !known.includes(round))];

  const totals = new Map(
    [...scores].map(([player, playerScores]) => [player, total(playerScores, rounds)])
  );

  /* Who was still at the table at the end, and whether anybody was.

     A player who left part-way has only the rounds they played to total, and in a
     game the low score takes that is a shorter total than anyone who stayed — so
     left alone it hands the win to whoever quit earliest, which is the one way a
     game cannot be won. The win goes to the best total among those who saw the
     last round out, and the rest rank below them however they totalled. That is
     what the sheet already does with a player who's been removed mid-game; the
     difference here is that being removed isn't stored, so a finished game has to
     read it off who has a score in the last round.

     `known` rather than `rounds`, so a round the type doesn't list — appended at
     the end for a game written under an older list — can't stand in as the round
     the game had to reach.

     Nobody at all, and the game was abandoned rather than won. It keeps its scores
     and its totals, and it is left without a winner. Worked out here rather than
     stored, because the rounds already say it. */
  const finishers = finishersOf(known, scores);
  const unfinished = finishers.size === 0;

  /* The ends of the game, over the players who played it out — so the winning
     total is one of them, and a total nobody could have won on is neither.

     A game nobody finished has no such end, and falls back to the whole table:
     the two total sorts still have to be able to order it against everything else.
     See sortGames. */
  const played = [...totals].filter(([player]) => finishers.has(player)).map(([, sum]) => sum);
  const spread = played.length ? played : [...totals.values()];
  const lowestTotal = spread.length ? Math.min(...spread) : null;
  const highestTotal = spread.length ? Math.max(...spread) : null;

  /* The sheet ranks low total first, which is Contract Rummy's order but the
     wrong way round for a game high score takes — so it's reversed for those,
     leaving the winner the top row of either. Everyone level with the winning
     total won it: a tie is a tie, not whichever of them the sort put first. */
  const high = winsWith(type) === 'high';
  const ascending = [...sortedByTotal(scores, rounds, null, total).keys()];
  const byTotal = high ? [...ascending].reverse() : ascending;

  /* Players who didn't finish sink, and are sunk after the reverse rather than by
     handing sortedByTotal the set: it sinks to the end of the ascending order,
     which is the end a high-score game then reverses to the front. Partitioned
     instead, so they land below the players who finished whichever way round the
     game is read — and in an unfinished game nobody finished, so the partition is
     every player and the order comes out untouched. */
  const ranked = [
    ...byTotal.filter((player) => finishers.has(player)),
    ...byTotal.filter((player) => !finishers.has(player)),
  ];

  const winningTotal = unfinished ? null : (high ? highestTotal : lowestTotal);
  const winners = unfinished
    ? []
    : ranked.filter((player) => finishers.has(player) && totals.get(player) === winningTotal);

  /* The order the game was actually played in, where the rows say. Mormon Bridge
     is played round the table and its rows are the seating, so a finished game
     read back ranked isn't the sheet that was played — the bidding no longer goes
     down the page. Falls back to the order the rows arrived in if any player is
     missing a seat, which is a game written before seats were stored: a partly
     seated order would be neither one thing nor the other. */
  const players = [...scores.keys()];
  const seated = seats.size === players.length
    ? [...players].sort((a, b) => seats.get(a) - seats.get(b))
    : players;

  const order = rowOrderFor(type) === 'seat' ? seated : ranked;
  /* A day's games are told apart by the counter the id ends in — which is the
     number the game was known by while it was on. An id with no counter is one
     this app didn't write, so there's no number to show and the heading says the
     day alone rather than inventing one. */
  const counter = gameId.lastIndexOf('_');

  return {
    key: `${gameId}#${type}`,
    gameId,
    gameNumber: counter === -1 ? null : gameId.slice(counter + 1),
    date: game.date ?? (counter === -1 ? gameId : gameId.slice(0, counter)),
    /* Whose game it is. The id is built from the family, the date and the number
       together, so all three have to go back to file an edit under the game it
       came from — and this is the one of them that isn't otherwise on the sheet. */
    family: game.family ?? null,
    type,
    players,
    rounds,
    scores,
    totals,
    ranked,
    // What the game's table puts its rows in, which isn't always the ranking
    order,
    /* Seat order on its own, as well as inside `order` where the type asks for
       it. An edit is written back with the seats worked out from the row order,
       so a sheet opened in the ranking would file the ranking as the seating —
       see helpers/editGame.js. */
    seated,
    winners,
    /* Nobody played the last round, so nobody won it. It still shows on the page
       with everything that was scored in it — it just isn't a result, so it's kept
       out of what the player boards count and can be filtered for on its own. */
    unfinished,
    playerCount: scores.size,
    lowestTotal,
    highestTotal,
  };
}

/* The history into a flat list of games, newest first.

   Keyed from what each game carries rather than from the keys the response
   arrived under. Every game names itself, and taking the id from the game is what
   makes this independent of how the endpoint chose to group — a handler grouping
   on an attribute the games don't carry answers one bucket called "undefined",
   and the whole history would read as a single game.

   Keyed by type as well as by id, because the id doesn't carry the type — it's
   the date and a counter within it — so the same id can come back from two types
   and mean two different games. Left merged they'd share a table and the rounds
   of one would read as blanks in the other.

   Anything without a list of players is passed over rather than rendered as an
   empty game. The store held one row per player per round until it was
   backfilled, and the odd row that predates even that convention is still in
   there — unreachable, since its family and type were never stored in the case
   the query asks for, but better skipped here than trusted. */
export function toGames(grouped) {
  const byGame = new Map();

  for (const answered of Object.values(grouped ?? {})) {
    for (const game of answered ?? []) {
      if (!Array.isArray(game.players)) {
        continue;
      }

      // A game with no id at all can't be told from the day's others, so the
      // date is as far apart as those can be pulled.
      const gameId = game.id ?? game.date;
      byGame.set(`${gameId}#${game.type}`, { gameId, type: game.type, game });
    }
  }

  const games = [...byGame.values()]
    .map(({ gameId, type, game }) => buildGame(gameId, type, game));

  return sortGames(games, 'date-desc');
}

/* Whether a finished game can be opened on the sheet and written back.

   Two things it needs. A counter, because the edit is filed under the id it came
   from and an id that never carried one has no number to send back — it would be
   written as a new game and leave the original where it was. And a type the sheet
   knows, because the sheet falls through to Mormon Bridge for anything it doesn't
   recognise, and a Mormon Bridge cell is an object where Contract Rummy's is a
   number: the first keystroke would be written into a number and throw. */
export function canEdit(game) {
  return !!game.gameNumber && GAME_TYPE_IDS.includes(game.type);
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

/* ---------------------------------------------------------------------------
   The player boards: what each player has to show, a board per game type.

   Split by type because almost nothing here compares across them. A total means
   a different thing in each game, the low one wins Contract Rummy and the high
   one takes Mormon Bridge, and a bid is a thing only one of them has — so a
   single board over both would be stating half its columns in two units at once.
   One board per type is what lets the columns mean what they say.
   --------------------------------------------------------------------------- */

/* A record is a number and the games it was set in — the games rather than a
   count, because the board makes each one a way into the sheet it happened on.

   Beaten, it starts again on the new game; equalled, the game joins the ones
   already holding it: a record two games are level on belongs to both, and
   showing one of them would be picking. A game is only added once however many
   of its rounds hit the mark, which is why the guard is on the key rather than
   on the value. */
function emptyRecord() {
  return { value: null, games: [] };
}

function record(current, value, game, better) {
  // Blank rounds read back as '' — a bid nobody entered, which Math.max would
  // quietly count as a zero rather than skip.
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return;
  }

  if (current.value === null || better(value, current.value) === value) {
    if (value !== current.value) {
      current.value = value;
      current.games = [];
    }
    if (!current.games.some((held) => held.key === game.key)) {
      current.games.push(game);
    }
  }
}

/* Every value one player has on the board of one game, in the order the columns
   want them. Read off the player's own row of the sheet rather than by walking
   the type's round list, since that lists every round of the game whether it was
   reached or not — a game that ended early would be read as rounds of undefined. */
function addGame(stats, game, player, bidTook) {
  /* A game nobody finished is no result, so it counts for nothing that reads as
     one: not as a game played, not against the win rate, and not as a total. A
     total from a game that was abandoned isn't a low total, it's a short one, and
     it would take the Lowest Total column off whoever really holds it.

     The rounds are a different matter. They were played, whatever became of the
     game around them, so a score, a bid or a took set in one still stands as the
     best somebody has managed. */
  if (!game.unfinished) {
    const total = game.totals.get(player);

    stats.gamesPlayed += 1;
    stats.totalPoints += total;
    if (game.winners.includes(player)) {
      stats.wins += 1;
    }

    record(stats.records.lowestGameTotal, total, game, Math.min);
    record(stats.records.highestGameTotal, total, game, Math.max);
  }

  for (const cell of game.scores.get(player).values()) {
    if (bidTook) {
      record(stats.records.highestScore, cell.score, game, Math.max);
      record(stats.records.highestBid, cell.bid, game, Math.max);
      record(stats.records.highestTook, cell.took, game, Math.max);
    } else {
      record(stats.records.highestScore, cell, game, Math.max);
    }
  }
}

function emptyStats(player) {
  return {
    player,
    gamesPlayed: 0,
    wins: 0,
    totalPoints: 0,
    records: {
      lowestGameTotal: emptyRecord(),
      highestGameTotal: emptyRecord(),
      highestScore: emptyRecord(),
      // Only a game whose round holds a bid and a took has these to record. The
      // keys are here either way so the board reads them the same on both.
      highestBid: emptyRecord(),
      highestTook: emptyRecord(),
    },
  };
}

/* One board per type, ordered as GAME_TYPES lists them with anything unlisted
   after — a type written before this app knew about it still gets a board, since
   everything the board needs of a type falls back rather than failing.

   Recomputed from the filtered list, so a board answers for what's on screen
   rather than for all time. */
export function playerBoards(games) {
  const boards = new Map();

  for (const game of games) {
    if (!boards.has(game.type)) {
      boards.set(game.type, new Map());
    }

    const byPlayer = boards.get(game.type);
    const bidTook = roundCellFor(game.type) === 'bid-took';

    for (const player of game.players) {
      if (!byPlayer.has(player)) {
        byPlayer.set(player, emptyStats(player));
      }
      addGame(byPlayer.get(player), game, player, bidTook);
    }
  }

  const order = (type) => {
    const index = GAME_TYPE_IDS.indexOf(type);
    return index === -1 ? GAME_TYPE_IDS.length : index;
  };

  return [...boards.entries()]
    .sort(([a], [b]) => order(a) - order(b) || String(a).localeCompare(String(b)))
    .map(([type, byPlayer]) => ({ type, rows: boardRows(type, byPlayer) }));
}

/* Most wins leads; level on wins, the better average is ahead — which way that
   is being the type's own, now there's a board per type to ask.

   The win rate is kept as the ratio it is and turned into a percentage where
   it's shown: rounded here it would be a coarser number than the one it came
   from, and two players a game apart would read as level. */
function boardRows(type, byPlayer) {
  const ahead = winsWith(type) === 'high' ? -1 : 1;

  /* A player can be on the board having played nothing that counted: every game
     they were in was abandoned, and they're here for a round record set in one of
     them. Neither rate means anything over no games, so the average is left blank
     rather than worked out of nought — see PlayerBoard, which renders it as the
     empty cell a record with no value gets. */
  return [...byPlayer.values()]
    .map(({ totalPoints, ...stats }) => ({
      ...stats,
      winRate: stats.gamesPlayed ? stats.wins / stats.gamesPlayed : 0,
      avgTotal: stats.gamesPlayed ? Math.round(totalPoints / stats.gamesPlayed) : null,
    }))
    // And they sort last, below everyone with a game to be ranked on: an average
    // there is no average sits at neither end of the order, it sits outside it.
    .sort((a, b) => (
      (b.gamesPlayed ? 1 : 0) - (a.gamesPlayed ? 1 : 0)
      || b.wins - a.wins
      || ahead * ((a.avgTotal ?? 0) - (b.avgTotal ?? 0))
    ));
}

export const EMPTY_FILTERS = {
  players: [],
  dateFrom: '',
  dateTo: '',
  type: '',
  // Empty for both, which is the page as it opens: an abandoned game is still a
  // game that was played, so it's listed with the rest until it's asked about.
  status: '',
};

/* Dates compare as strings: they're stored YYYY-MM-DD, which sorts the same way
   it reads, and is the format the date inputs hand back too.

   A player filter passes a game any of the chosen players were in, rather than
   only games all of them were in — picking two people asks for their games, not
   just the ones they both sat at. */
export function applyFilters(games, filters) {
  const { players, dateFrom, dateTo, type, status } = { ...EMPTY_FILTERS, ...filters };

  return games.filter((game) => {
    if (type && game.type !== type) {
      return false;
    }
    if (status === 'finished' && game.unfinished) {
      return false;
    }
    if (status === 'unfinished' && !game.unfinished) {
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
    // total anyone finished on, and the winning one. Both read over the players
    // who played it out, so neither is a total somebody left the table holding.
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
