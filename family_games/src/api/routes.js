/*
Single source of truth for API endpoints, plus the calls that use them.
*/

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

const GAME_ID_KEY = 'nextGameId';

// Every row of a submitted game shares this id, so it doubles as the id of the
// game itself. Kept in sessionStorage rather than a module variable so a refresh
// mid-game doesn't reset it and file the next game under one already used.
export function currentGameId() {
  const saved = Number(sessionStorage.getItem(GAME_ID_KEY));
  return Number.isInteger(saved) && saved > 0 ? saved : 1;
}

// Bumped once the submit lands, so a failed attempt can be retried under the
// same id rather than burning one.
function bumpGameId() {
  sessionStorage.setItem(GAME_ID_KEY, String(currentGameId() + 1));
}

// Local date, not toISOString() — that reports UTC, which rolls the date over
// early or late for anyone not on it.
function today() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/* A sheet is a Map of player name to a Map of round to score, so one DynamoDB
   row per player per round they actually played. Rounds nobody reached are left
   blank on the sheet and are skipped here rather than written as zeros. */
export function buildScoreRows(familyName, gameType, scoreData) {
  if (!scoreData) {
    return [];
  }

  // Read once, so every row of the game carries the same id even if a submit
  // lands in between
  const id = currentGameId();
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
        id,
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
export async function submitScores(familyName, gameType, scoreData) {
  const rows = buildScoreRows(familyName, gameType, scoreData);
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

  bumpGameId();
  return rows;
}
