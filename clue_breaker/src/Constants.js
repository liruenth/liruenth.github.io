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

export const SUSPECTS = [
  "Colonel Mustard",
  "Miss Scarlet",
  "Mr. Green",
  "Mrs. White",
  "Mrs. Peacock",
  "Professor Plum",
];

export const SUSPECT_COLOR = {
  [SUSPECTS[0]]: "yellow",
  [SUSPECTS[1]]: "red",
  [SUSPECTS[2]]: "green",
  [SUSPECTS[3]]: "white",
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

export const CARD_STATUSES = {
  known: "known",
  possible: "possible",
  impossible: "impossible",
}

export const ALL_CARDS = ROOMS.concat(SUSPECTS).concat(WEAPONS);