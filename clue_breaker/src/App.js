import React, { useState, useEffect } from 'react';
import './App.css';
import GameSetup from './GameSetup';
import GameState from './GameState';
import LogicGrid from './LogicGrid';
import AddAccusationModal from './AddAccustionModal';
import AccusationListModal from './AccusationListModal';
import CardMap from './CardMap';
// import AddLearnedCardModal from './AddLearnedCardModal';

function App() {
  const [gameData, setGameData] = useState(() => {
    let savedGameData = sessionStorage.getItem('gameData');
    if (!!savedGameData) {
      savedGameData = JSON.parse(savedGameData);
      return savedGameData;
    }
    
    // const knownCards = [
    //   'Ballroom',
    //   'Billiard Room',
    // ];
    // const myCards = [
    //   'Miss Scarlet',
    //   'Rope',
    //   'Library',
    //   'Lounge',
    // ];
    // return {
    //   cardsPerPlayer: 4,
    //   knownCards,
    //   myCards,
    //   players: ['Me', 'West', 'Test', 'Best'],
    //   accusations: [{
    //     id: 1,
    //     player: "Me",
    //     suspect: "Mr. Green",
    //     weapon: "Revolver",
    //     room: "Conservatory",
    //     stoppedBy: "Test",
    //     shownCard: "weapon",
    //   },{
    //     id: 2,
    //     player: "West",
    //     suspect: "Miss Scarlet",
    //     weapon: "Rope",
    //     room: "Lounge",
    //     stoppedBy: "Me",
    //     shownCard: "room",
    //   },{
    //     id: 3,
    //     player: "Test",
    //     suspect: "Professor Plum",
    //     weapon: "Wrench",
    //     room: "Kitchen",
    //     stoppedBy: "West",
    //     shownCard: "",
    //   },{
    //     id: 4,
    //     player: "Best",
    //     suspect: "Professor Plum",
    //     weapon: "Candlestick",
    //     room: "Study",
    //     stoppedBy: "West",
    //     shownCard: "",
    //   }],
    //   cardMap: CardMap.setUpStartingMap(
    //     4, 
    //     knownCards,
    //     myCards
    //   ),
      // cardMap: {
      //   "ballroom":[3,3,3,3,3,3],
      //   "billiard_room":[3,3,3,3,3,3],
      //   "conservatory":[1,0,0,0,0,0],
      //   "dining_room":[1,0,0,0,0,0],
      //   "hall":[1,0,0,0,0,0],
      //   "kitchen":[1,0,0,0,0,0],
      //   "library":[3,1,1,1,1,1],
      //   "lounge":[3,1,1,1,1,1],
      //   "study":[1,0,0,0,0,0],
      //   "mustard":[1,0,0,0,0,0],
      //   "scarlet":[3,1,1,1,1,1],
      //   "green":[1,0,0,0,0,0],
      //   "white":[1,0,0,0,0,0],
      //   "peacock":[1,0,0,0,0,0],
      //   "plum":[1,0,0,0,0,0],
      //   "candlestick":[1,0,0,0,0,0],
      //   "dagger":[1,0,0,0,0,0],
      //   "lead_pipe":[1,0,0,0,0,0],
      //   "revolver":[1,0,0,0,0,0],
      //   "rope":[3,1,1,1,1,1],
      //   "wrench":[1,0,0,0,0,0],
      // }
    // }

    return null
  });
  
  useEffect(() => {
    if (!!gameData) {
      sessionStorage.setItem('gameData', JSON.stringify(gameData));
    }
  }, [gameData]);

  const [accusationModalIsOpen, setAccusationModalIsOpen] = useState(false);
  const [accusationListModalIsOpen, setAccusationListModalIsOpen] = useState(false);
  // const [addLearnedCardModalIsOpen, setAddLearnedCardModalIsOpen] = useState(false);

  
  const handleSubmitKnownCards = ({knownCards, myCards, cardsPerPlayer, playerData}) => {
    setGameData({
      players: playerData,
      accusations: [],
      knownCards,
      myCards,
      cardsPerPlayer,
      cardMap: CardMap.setUpStartingMap(playerData.length, knownCards, myCards)
    })
  };

  //{player, suspect, weapon, room, stoppedBy, id}
  const makeAccusation = (accusationData) => {
    setAccusationModalIsOpen(false);
    accusationData = {...accusationData, id: gameData.accusations.length + 1};

    const newAccusationList = [...gameData.accusations, accusationData];

    const accuserIndex = gameData.players.indexOf(accusationData.player);
    const stopperIndex = gameData.players.indexOf(accusationData.stoppedBy);

    setGameData({
      ...gameData,
      cardMap: CardMap.applyAccusation(
        gameData.cardMap, 
        accusationData, 
        accuserIndex, 
        stopperIndex, 
        gameData.players.length
      ),
      accusations: newAccusationList,
    });
  }  

  const reapplyAccusations = () => {
    let cardMap = CardMap.setUpStartingMap(
      gameData.players.length, 
      gameData.knownCards,
      gameData.myCards
    );
    let accusationList = gameData.accusations;

    for (let i = 0; i < accusationList.length; i++) {
      const accuserIndex = gameData.players.indexOf(accusationList[i].player);
      const stopperIndex = gameData.players.indexOf(accusationList[i].stoppedBy);

      cardMap = CardMap.applyAccusation(
        cardMap, 
        accusationList[i], 
        accuserIndex, 
        stopperIndex, 
        gameData.players.length
      );
    }

    setGameData({
      ...gameData,
      cardMap,
    });
  }

  // const addLearnedCard = (card, player) => {
  //   setAddLearnedCardModalIsOpen(false);
  //   const playerIndex = gameData.players.indexOf(player);

  //   setGameData({
  //     ...gameData,
  //     learnedCards: [...gameData.learnedCards, {player, card}],
  //     cardMap: CardMap.addLearnedCard(
  //       gameData.cardMap, 
  //       card,
  //       playerIndex,
  //       gameData.players.length
  //     ),
  //   });
  // }

  const actionGroupStyles = {
    display: 'inline-flex',
    alignItems: 'center',
  }

  const actionStyles = {
    width: '7em',
    height: '4em',
    marginRight: '0.5em',
    marginBottom: '0.5em',
    boxShadow: '0 4px 8px 0 rgba(0,0,0,0.2)',
    borderRadius: '10px',
    backgroundColor: 'aliceblue',
    borderColor: 'skyblue',
    fontWeight: 'bold',
  }
  
  let gridView = true;
  return (
    <div>    
      {
        !!gameData ?
          <div className={"logicGridActions"}>
            <div style={actionGroupStyles}>
              <button style={actionStyles} onClick={() => setAccusationModalIsOpen(true)}>
                Add Accusation
              </button>
              <button style={actionStyles} onClick={() => setAccusationListModalIsOpen(true)}>
                View Accusations
              </button>
              <button style={actionStyles} onClick={() => reapplyAccusations()}>
                Reapply Accusations
              </button>
              {/* <button style={actionStyles} onClick={() => setAddLearnedCardModalIsOpen(true)}>
                Add Learned Card
              </button> */}
            </div>
          </div>
        : null
      }
      {
        !!gameData 
          ? gridView
            ? <LogicGrid gameData={gameData} setGameData={setGameData} />
            : <GameState gameData={gameData}/>
          : <GameSetup setGameData={handleSubmitKnownCards} /> 
      }
         
      {accusationModalIsOpen &&
        <AddAccusationModal 
          isOpen={accusationModalIsOpen}
          title={`Add Accusation for a player`}
          onSubmit={makeAccusation}
          onClose={() => setAccusationModalIsOpen(false)}
          playerNames={gameData.players}
        />
      }
      {accusationListModalIsOpen && 
        <AccusationListModal 
          isOpen={accusationListModalIsOpen}
          title={`Accusation List`}
          onClose={() => setAccusationListModalIsOpen(false)}
          accusations={gameData.accusations}
          playerNames={gameData.players}
          setGameData={setGameData}
        />
      }
      {/* {addLearnedCardModalIsOpen && 
        <AddLearnedCardModal 
          isOpen={addLearnedCardModalIsOpen}
          title={`Add Learned Card for a player`}
          onSubmit={addLearnedCard}
          onClose={() => setAddLearnedCardModalIsOpen(false)}
          playerNames={gameData.players}
        />
      } */}
    </div>
  );
}

export default App;
