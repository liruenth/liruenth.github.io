import { WEAPONS, ROOMS, SUSPECTS } from "./Constants";
import { mergeCards } from "./Helper";

const mergeAccusationIds = (possibleCards) => {
  if (!possibleCards || possibleCards.length < 1) {
    return [];
  }

  for (let i = 0; i < possibleCards.length; i++) {
    const other = possibleCards.find(possible => {
      return (
        possible.name === possibleCards[i].name && 
        !possible.accusationIds.every(id => possibleCards[i].accusationIds.includes(id))
      )
    });
    possibleCards[i].accusationIds = possibleCards[i].accusationIds.concat(other ? other.accusationIds : []);
  }
 
  possibleCards = mergeCards([], possibleCards);
  return possibleCards;
}

const resolvePossibilities = (possibleCards, impossibleCards, allKnowns) => {
  //combine possibles together to get a new array of accusationIds

  const invalidCards = impossibleCards.concat(allKnowns);
  let newPossibles = possibleCards.filter(possible => !invalidCards.find(invalid => invalid.name === possible.name));

  //find the possible cards that no longer have an any other cards with the same accusation id

  /*newPossibles = [
    --{name: 'green', accusationIds[1,3]}-- //green is now impossible
    --{name: 'gun', accusationIds[1,2,3]}-- //gun is now impossible
    {name: 'ballroom', accusationIds[1,2]}
    {name: 'hall', accusationIds[3]}
    {name: 'plum', accusationIds[2]}
  ]

  accusations = [
    {suspect: 'green', room: 'ballroom', weapon: 'gun'}
    {suspect: 'plum', room: 'ballroom', weapon: 'gun'}
    {suspect: 'green', room: 'hall', weapon: 'gun'}
  ]

  possible = {name: 'hall', accusationIds[3]}
  other = {name: 'ballroom', accusationIds[1,2]} || {name: 'plum', accusationIds[2]} || {name: 'hall', accusationIds[3]}
  if other.name !== possible.name && possible.accusationIds.every(id => !other.accusationIds.includes(id)) 
  */
  const newKnowns = newPossibles.filter(
    possible => !newPossibles.find(other => 
    {
      return (
        possible.name !== other.name && 
        possible.accusationIds.every(id => other.accusationIds.includes(id))
      );
    }
    )
  );

  //remove new knowns from newPossibles
  newPossibles = newPossibles.filter(possible => !newKnowns.find(known => known.name === possible.name));

  return {
    possible: newPossibles,
    impossible: impossibleCards,
    known: newKnowns,
  }
};

export function updateCardsFromAccusation(accusation, playerCards, players, allKnowns) {
  const accuserIndex = players.indexOf(accusation.player);
  const newPlayerCards = {...playerCards};
  const accusationCards = [
    {name: accusation.suspect, accusationIds: [accusation.id]}, 
    {name: accusation.weapon, accusationIds: [accusation.id]}, 
    {name: accusation.room, accusationIds: [accusation.id]},
  ];

  //ensure this works properly for when i === accuserIndex meaning no one stopped the accusation
  let accusationStopped = false;
  for (let i = (accuserIndex + 1) % players.length; !accusationStopped; i = (i + 1) % players.length) {
    const playerPossibles = newPlayerCards[players[i]].possible;
    const playerImpossibles = newPlayerCards[players[i]].impossible;

    let newPossibleData;

    console.log("Updating Cards for: ", players[i]);
    if(accusation.stoppedBy === players[i]) {
      newPossibleData = resolvePossibilities(
        mergeAccusationIds([...playerPossibles, ...accusationCards]), 
        playerImpossibles, 
        allKnowns
      );
      newPossibleData.known.push(...newPlayerCards[players[i]].known);
      newPlayerCards[players[i]] = newPossibleData;
      accusationStopped = true;
    } else {
      newPossibleData = resolvePossibilities(
        playerPossibles, 
        mergeCards(playerImpossibles, accusationCards), 
        allKnowns
      );
      newPossibleData.known.push(...newPlayerCards[players[i]].known);
      newPlayerCards[players[i]] = newPossibleData;
    }
  }
  return newPlayerCards;
};

export function updateCardsFromNewLearned(playerCards, players, allKnowns) {
  const newPlayerCards = {...playerCards};

  let newPossibleData;
  for (let i = 0; i < players.length; i++) {
    newPossibleData = resolvePossibilities(playerCards[players[i]].possible, playerCards[players[i]].impossible, allKnowns);
    newPossibleData.known.push(...newPlayerCards[players[i]].known);
    newPlayerCards[players[i]] = newPossibleData;
  }
  return newPlayerCards;
}

export function getSolution(allKnowns) {
  
  const remainingRooms = ROOMS.filter(room => !allKnowns.some(known => known.name === room));
  const remainingSuspects = SUSPECTS.filter(suspect => !allKnowns.some(known => known.name === suspect));
  const remainingWeapons = WEAPONS.filter(weapon => !allKnowns.some(known => known.name === weapon));

  const room = remainingRooms.length === 1 ? remainingRooms[0] : null;
  const suspect = remainingSuspects.length === 1 ? remainingSuspects[0] : null;
  const weapon = remainingWeapons.length === 1 ? remainingWeapons[0] : null;

  return {
    room,
    suspect,
    weapon,
  };
};