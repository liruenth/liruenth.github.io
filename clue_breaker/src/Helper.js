import { ALL_CARDS } from "./Constants";

export const getAllKnownCards = (playerCards, players, knownCards) => {
  const allKnowns = [];
  for (let i = 0; i < players.length; i++) {
    allKnowns.push(...playerCards[players[i]].known)
  }
  allKnowns.push(...knownCards);
  return allKnowns;
}

export const getAllUnknownCards = (playerCards, players, knownCards) => {
  const allKnowns = getAllKnownCards(playerCards, players, knownCards);
  const unknowns = ALL_CARDS.filter(card => !allKnowns.some(known => known.name === card))
  return unknowns;
}

export const mergeCards = (a, b, predicate = (a, b) => a.name === b.name) => {
  console.log("mergeCards a");
  console.log(a);
  console.log("mergeCards b");
  console.log(b);
  const c = [...a]; // copy to avoid side effects
  // add all items from B to copy C if they're not already present
  b.forEach((bItem) => (c.some((cItem) => predicate(bItem, cItem)) ? null : c.push(bItem)))
  return c;
}