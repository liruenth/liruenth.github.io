/*
Single source of truth for API endpoints, plus the calls that use them.
*/
import { today } from '../helpers/gameId';
import { GAME_TYPE_IDS } from '../helpers/gameTypes';

export const API_BASE_URL = 'https://chiaq8el1b.execute-api.us-west-1.amazonaws.com';

// Path builders — relative to API_BASE_URL, no leading base included.
export const routes = {
  // Every player of the family, whatever they played — so no type, unlike the
  // reads below. The handler answers 400 without the family.
  familyPlayers: (familyName) =>
    `/players?${new URLSearchParams({ family: familyName })}`,
  scores: () => '/games',
  // Same path as scores() — the handler dispatches on the method, so the history
  // is a GET of the collection the games are POSTed to. Both params are required
  // by the handler, which answers 400 without them.
  games: (familyName, type) =>
    `/games?${new URLSearchParams({ familyName, type })}`,
};

// Joins a route path onto the base URL.
export function apiUrl(path) {
  return `${API_BASE_URL}${path}`;
}

/* The handler explains itself in the body — a bad row says which one and why —
   so surface that rather than just the status the caller can't act on. Falls back
   to the status when there's nothing to explain, which is what a failure from in
   front of the handler (a gateway, a proxy) looks like. */
async function failureReason(res, fallback) {
  const detail = await res.json().catch(() => null);
  const reason = [detail?.error, detail?.details?.join('; ')].filter(Boolean).join(': ');
  return reason || `${fallback} failed with ${res.status}`;
}

/* A sheet is a Map of player name to a Map of round to score, so one DynamoDB
   row per player per round they actually played. Rounds nobody reached are left
   blank on the sheet and are skipped here rather than written as zeros.

   Every row of a game carries the same gameId, so it doubles as the id of the
   game itself — the caller owns it and is what counts it on. */
export function buildScoreRows(familyName, gameType, scoreData, gameId) {
  if (!scoreData) {
    return [];
  }

  const date = today();
  const rows = [];

  for (const [player, playerScores] of scoreData) {
    for (const [round, rawScore] of playerScores) {
      const score = Number(rawScore);
      // Editors hand back strings, and an empty one is an unplayed round
      if (rawScore === '' || rawScore === null || !Number.isFinite(score)) {
        continue;
      }

      rows.push({
        id: gameId,
        date,
        player_name: player,
        family_name: familyName,
        round,
        score,
        type: gameType,
      });
    }
  }

  return rows;
}

// Sends a finished game to the Lambda that writes it to DynamoDB.
export async function submitScores(familyName, gameType, scoreData, gameId) {
  const rows = buildScoreRows(familyName, gameType, scoreData, gameId);
  if (rows.length === 0) {
    throw new Error('No scores to submit');
  }

  const res = await fetch(apiUrl(routes.scores()), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rows),
  });

  if (!res.ok) {
    throw new Error(await failureReason(res, 'Submit'));
  }

  return rows;
}

/* The family's roster, as an array of names: everyone a game has been scored for
   under that family name. Uppercase, because that's how the writer stores them —
   the same reason a lookup doesn't have to match how a name was typed. */
export async function fetchFamilyPlayers(familyName) {
  const res = await fetch(apiUrl(routes.familyPlayers(familyName)));

  if (!res.ok) {
    throw new Error(await failureReason(res, 'Loading players'));
  }

  return res.json();
}

/* A family's finished games of one type, as the handler groups them: an object
   keyed by game id, each one holding that game's rows. One type per call, because
   that's all the query the handler runs can ask for — its index is partitioned on
   family and type together. */
export async function fetchGames(familyName, type) {
  const res = await fetch(apiUrl(routes.games(familyName, type)));

  if (!res.ok) {
    throw new Error(await failureReason(res, 'Loading games'));
  }

  return res.json();
}

/* Everything a family has played, which is every type asked for in turn and the
   answers merged. Game ids carry the date and a counter within it but not the
   type, so two types could in principle answer for the same id — the rows are
   concatenated rather than one replacing the other, and the pivot downstream
   splits them back out.

   Settled rather than all: one type failing shouldn't cost the page the types
   that answered, so a rejection is dropped and only a clean sweep of them throws. */
export async function fetchFamilyGames(familyName, types = GAME_TYPE_IDS) {
  const results = await Promise.allSettled(
    types.map((type) => fetchGames(familyName, type))
  );

  const answered = results.filter((result) => result.status === 'fulfilled');
  if (answered.length === 0) {
    throw new Error(results[0]?.reason?.message || 'Loading games failed');
  }

  const games = {};
  for (const { value } of answered) {
    for (const [gameId, rows] of Object.entries(value ?? {})) {
      games[gameId] = [...(games[gameId] ?? []), ...rows];
    }
  }

  return games;
}
