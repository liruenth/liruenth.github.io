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

`roundCell` is what one round of one player holds: a score on its own, or a bid
and a took with the score worked out from them. `rowOrder` is the order a
finished game's rows are read back in — ranked, or the order they were played in.
Both are the same kind of fact as `wins`: something the games disagree about that
several places downstream have to agree on.
*/

export const GAME_TYPES = [
  {
    id: 'CR',
    label: 'Contract Rummy',
    rounds: ['2S', '1S1R', '2R', '3S', '2S1R', '2R1S', '3R'],
    wins: 'low',
    roundCell: 'score',
    rowOrder: 'rank',
    setupNotice: 'Add players by group',
    // The table can be split into groups, which is a thing the sheet offers and
    // the roster screen asks for up front. Mormon Bridge doesn't say it, so it
    // isn't asked there — see hasGroups below.
    groups: true,
  },
  {
    id: 'MB',
    label: 'Mormon Bridge',
    // Counts down, ten cards dealt to one. The round is also how many tricks are
    // on the table, which is what the bonus for taking the lot is checked
    // against — see helpers/mormonBridge.js.
    rounds: ['10', '9', '8', '7', '6', '5', '4', '3', '2', '1'],
    wins: 'high',
    roundCell: 'bid-took',
    // Who deals and who bids first moves round the table, so the rows are the
    // seating — which is why they're picked in that order to start with, and why
    // a finished game is read back in it rather than ranked.
    rowOrder: 'seat',
    setupNotice: 'Add players in turn order starting with the first to bid',
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

// Whether this game splits its table into groups. No, for a type that hasn't
// said: groups are one game's idea, so a type off this list isn't asked to
// account for them.
export function hasGroups(id) {
  return gameType(id)?.groups === true;
}

// Anything the roster screen has to say about how this game wants its players
// entered, or null where it doesn't care. Kept here with the game's other facts
// so that screen stays one screen rather than one per type.
export function setupNoticeFor(id) {
  return gameType(id)?.setupNotice ?? null;
}

// A bare score, for a type that hasn't said — it's the simpler of the two, and
// it's what every row written before there was a second kind holds.
export function roundCellFor(id) {
  return gameType(id)?.roundCell ?? 'score';
}

// Ranked, for a type that hasn't said: a game with nothing to say about the order
// it was played in is one there's no reason to show in anything but its result.
export function rowOrderFor(id) {
  return gameType(id)?.rowOrder ?? 'rank';
}
