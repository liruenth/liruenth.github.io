export const ROOMS = [
  "Ballroom",
  "Billiard Room",
  "Conservatory",
  "Dining Room",
  "Hall",
  "Kitchen",
  "Library",
  "Lounge",
  "Study",
];

export const ROOM_KEYS = [
  "ballroom",
  "billiard_room",
  "conservatory",
  "dining_room",
  "hall",
  "kitchen",
  "library",
  "lounge",
  "study",
];

export const SUSPECTS = [
  "Colonel Mustard",
  "Miss Scarlet",
  "Mr. Green",
  "Mrs. White",
  "Mrs. Peacock",
  "Professor Plum",
];

export const SUSPECT_KEYS = [
  "mustard",
  "scarlet",
  "green",
  "white",
  "peacock",
  "plum",
];

export const SUSPECT_COLOR = {
  [SUSPECTS[0]]: "orange",
  [SUSPECTS[1]]: "red",
  [SUSPECTS[2]]: "green",
  [SUSPECTS[3]]: "rgba(255, 255, 255, 1)",
  [SUSPECTS[4]]: "blue",
  [SUSPECTS[5]]: "purple",
};

export const WEAPONS = [
  "Candlestick",
  "Dagger",
  "Lead pipe",
  "Revolver",
  "Rope",
  "Wrench"
];

export const WEAPON_KEYS = [
  "candlestick",
  "dagger",
  "lead_pipe",
  "revolver",
  "rope",
  "wrench"
];

export const ALL_CARDS = SUSPECTS.concat(WEAPONS).concat(ROOMS);
export const ALL_CARD_KEYS = SUSPECT_KEYS.concat(WEAPON_KEYS).concat(ROOM_KEYS);

const cardsByKey = {};
for (let i = 0; i < ALL_CARDS.length; i++) {
  cardsByKey[ALL_CARD_KEYS[i]] = ALL_CARDS[i];
}
export const CARDS_BY_KEY = cardsByKey;

const keysByCard = {};
for (let i = 0; i < ALL_CARDS.length; i++) {
  keysByCard[ALL_CARDS[i]] = ALL_CARD_KEYS[i];
}
export const KEYS_BY_CARD = keysByCard;

export const CARD_STATUSES = {
  known: "known",
  possible: "possible",
  impossible: "impossible",
  unknown: "unknown",
}

export const CARD_STATES = {
  known: 3,
  possible: 2,
  impossible: 1,
  unknown: 0,
}