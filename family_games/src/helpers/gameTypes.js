/*
The games this app knows how to keep score for. One definition, because three
places need it and they need it to agree: the score sheet picks a type to start,
the API stamps it onto every row it writes, and the stats page has to ask for
each type in turn — the read endpoint takes one type at a time — then label and
order what comes back.

`rounds` is the sheet's column list, and is also what puts the stats page's
columns in the order they were played rather than the order the API returns them.

`wins` is which end of the totals took it, and the games disagree — so it lives
here with the game rather than being assumed wherever a winner gets worked out.
*/

export const GAME_TYPES = [
  {
    id: 'CR',
    label: 'Contract Rummy',
    rounds: ['2S', '1S1R', '2R', '3S', '2S1R', '2R1S', '3R'],
    wins: 'low',
  },
  {
    // Nothing scores an MB game yet, so no rows of it can exist. Listed anyway
    // so it's one entry to fill in rather than a type the stats page can't name.
    id: 'MB',
    label: 'Mormon Bridge',
    rounds: [],
    wins: 'high',
  },
];

export const GAME_TYPE_IDS = GAME_TYPES.map((type) => type.id);

function gameType(id) {
  return GAME_TYPES.find((type) => type.id === id);
}

// Falls back to the id rather than nothing: a type that predates this list is
// still better shown as "XX" than as an empty label.
export function gameTypeLabel(id) {
  return gameType(id)?.label ?? id;
}

export function roundsFor(id) {
  return gameType(id)?.rounds ?? [];
}

// Low, for a type that hasn't said: it's what Contract Rummy does, and it's the
// only sheet there is, so it's the safer thing to guess for a type off this list.
export function winsWith(id) {
  return gameType(id)?.wins ?? 'low';
}
