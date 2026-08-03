/*
Single source of truth for API endpoints, plus the calls that use them.
*/
import { today } from '../helpers/gameId';

export const API_BASE_URL = 'https://chiaq8el1b.execute-api.us-west-1.amazonaws.com';

// Path builders — relative to API_BASE_URL, no leading base included.
export const routes = {
  familyPlayers: (familyName) =>
    `/families/${encodeURIComponent(familyName)}/players`,
  scores: () => '/games',
};

// Joins a route path onto the base URL.
export function apiUrl(path) {
  return `${API_BASE_URL}${path}`;
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
    // The handler explains itself in the body — a bad row says which one and
    // why — so surface that rather than just the status the user can't act on.
    const detail = await res.json().catch(() => null);
    const reason = [detail?.error, detail?.details?.join('; ')].filter(Boolean).join(': ');
    throw new Error(reason || `Submit failed with ${res.status}`);
  }

  return rows;
}
