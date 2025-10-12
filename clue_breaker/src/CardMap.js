import { CARD_STATES, ALL_CARDS } from './Constants';

const ROWS = 21; // 21 Clue cards
const CardMap = {
  //setup default map
  setUpStartingMap: (playerCount, knownCards = [], myCards = []) => {
    const startingCardMap = {};

    const defaultPlayerArray = [];
    for (let i = 0; i < playerCount; i++) {
      defaultPlayerArray.push(i === 0 ? CARD_STATES.impossible : CARD_STATES.unknown);
    }

    const knownCardArray = Array(playerCount).fill(CARD_STATES.known);

    const myCardArray = [];
    for (let i = 0; i < playerCount; i++) {
      myCardArray.push(i === 0 ? CARD_STATES.known : CARD_STATES.impossible);
    }

    ALL_CARDS.forEach((card) => {
      let usingArray = defaultPlayerArray;
      if (knownCards.includes(card)) {
        usingArray = knownCardArray;
      } else if (myCards.includes(card)) {
        usingArray = myCardArray;
      }
      startingCardMap[card] =[...usingArray];
    });

    return startingCardMap;
  },

  //transform card map into an array that can be consumed by LogicGrid
  getCardMapArray: (cardMap, playerCount) => {
    let mapArray = Array(ROWS).fill({});
    let index = 0;
    
    Object.keys(cardMap).forEach(key => {
      mapArray[index] = {
        id: index,
        card: key,
      }
      for (let i = 0; i < playerCount; i++) {
        mapArray[index][`player${i}`] = cardMap[key][i];
      }
      index++;
    });
    return mapArray;
  },

  setCellValue: function(cardMap, card, playerIndex, cardState, override = false) {
    if (card === "Scarlet") {
      console.log("setCellValue cardMap");
      console.log(cardMap);
      console.log("setCellValue card");
      console.log(card);
      console.log("setCellValue playerIndex");
      console.log(playerIndex);
    }
    let newValue = cardState;
    let cellValue = cardMap[card][playerIndex];
    //only edit cellValues if they are unknown or possible
    if (cellValue === CARD_STATES.unknown || cellValue % 4 === CARD_STATES.possible || override) {
      //track duplicate possibles
      if ( cellValue % 4 === CARD_STATES.possible && cardState === CARD_STATES.possible) {
        newValue = cellValue + 4;
      }
      cardMap[card][playerIndex] = newValue;
    }
    return cardMap;
  },

  //mark stopper's cards as possible (assuming no one has a learned card) 
  //and mark any who couldn't stop as immpossible
  applyAccusation: function(cardMap, accusation, accuserIndex, stopperIndex, playerCount) {
    console.log("accusation");
    console.log(accusation);
    for (let i = (accuserIndex + 1) % playerCount; i !== stopperIndex; i = (i + 1) % playerCount) {
      cardMap = this.setCellValue(cardMap, accusation.suspect, i, CARD_STATES.impossible);
      cardMap = this.setCellValue(cardMap, accusation.weapon, i, CARD_STATES.impossible);
      cardMap = this.setCellValue(cardMap, accusation.room, i, CARD_STATES.impossible);
    }
    cardMap = this.setCellValue(cardMap, accusation.suspect, stopperIndex, CARD_STATES.possible);
    cardMap = this.setCellValue(cardMap, accusation.weapon, stopperIndex, CARD_STATES.possible);
    cardMap = this.setCellValue(cardMap, accusation.room, stopperIndex, CARD_STATES.possible);
    
    if (accusation.shownCard !== "") {
      const shownCardArray = [];
      for (let i = 0; i < playerCount; i++) {
        shownCardArray.push(i === stopperIndex ? CARD_STATES.known : CARD_STATES.impossible);
      }
      cardMap[accusation[accusation.shownCard]] = shownCardArray;
    }
    return cardMap;
  },

  addLearnedCard: function(cardMap, card, playerIndex, playerCount) {
    console.log("addLearnedCard cardMap");
    console.log(cardMap);
    for (let i = 0; i < playerCount; i++) {
      if (i === playerIndex) {
        cardMap = this.setCellValue(cardMap, card, i, CARD_STATES.known);
      } else {
        cardMap = this.setCellValue(cardMap, card, i, CARD_STATES.impossible);
      }
    }
    return cardMap;
  },
}

export default CardMap;