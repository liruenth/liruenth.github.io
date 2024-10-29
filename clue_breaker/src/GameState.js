import React, { useEffect, useState } from 'react';
import KnownCards from './KnownCards';
import Solution from './Solution';
import Players from './Players';
import AddAccusationModal from './AddAccustionModal';
import AddLearnedCardModal from './AddLearnedCardModal';
import AccusationListModal from './AccusationListModal';
import Filter from './Filter';
// import Accusations from './Accusations';
import * as Solver from './Solver';
import { getAllKnownCards, getAllUnknownCards } from "./Helper";

function GameState({gameData}) {
  const [solution, setSolution] = useState({room: null, suspect: null, weapon: null});
  const [accusationId, setAccusationId] = useState(1);

  const [accusationModalIsOpen, setAccusationModalIsOpen] = useState(false);
  const [cardModalIsOpen, setCardModalIsOpen] = useState(false);
  const [accusationListModalIsOpen, setAccusationListModalIsOpen] = useState(false);

  //{player, suspect, weapon, room, stoppedBy, id}
  const [accusations, setAccusations] = useState([]);
  const [filters, setFilters] = useState({known: true, possible: true, impossible: true});

  //each array contains an object of {name, accusationIds[]?}
  const [playerCards, setPlayerCards] = useState({
    [gameData.players[0]]: {possible: [], impossible: [], known: []},
    [gameData.players[1]]: {possible: [], impossible: [], known: []},
    [gameData.players[2]]: {possible: [], impossible: [], known: []},
    [gameData.players[3]]: {possible: [], impossible: [], known: []},
    [gameData.players[4]]: {possible: [], impossible: [], known: []},
    [gameData.players[5]]: {possible: [], impossible: [], known: []},
  });

  useEffect(() => {
    //use logic to determine if any of solution can be deduced from updated cards
    const allKnowns = getAllKnownCards(playerCards, gameData.players, gameData.knownCards);
    const solvedData = Solver.getSolution(allKnowns);
    console.log("solvedData");
    console.log(solvedData);
    setSolution(solvedData);
  }, [playerCards]);

  console.log("gameData");
  console.log(gameData);
  console.log("accusations");
  console.log(accusations);
  console.log("playerCards");
  console.log(playerCards);

  const addLearnedCard = (card, player) => {
    setCardModalIsOpen(false);
    const newPlayerKnowns = [...playerCards[player].known, { name: card } ];

    const playerCardsCopy = {...playerCards, [player]: {...playerCards[player], known: newPlayerKnowns}};

    const allKnowns = getAllKnownCards(playerCardsCopy, gameData.players, gameData.knownCards);

    const newPlayerCards = Solver.updateCardsFromNewLearned(playerCardsCopy, gameData.players, allKnowns);
    setPlayerCards(newPlayerCards);
  }

  const makeAccusation = (accusationData) => {
    setAccusationModalIsOpen(false);
    accusationData = {...accusationData, id: accusationId};
    setAccusationId(accusationId + 1);

    const allKnowns = getAllKnownCards(playerCards, gameData.players, gameData.knownCards);

    setAccusations([...accusations, accusationData]);

    const newPlayerCards = Solver.updateCardsFromAccusation(accusationData, playerCards, gameData.players, allKnowns);
    setPlayerCards(newPlayerCards);
  }  

  const updateFilters = (type, newStatus) => {
    setFilters({...filters, [type]: newStatus});
  }

  const tableActionStyles = {
    display: 'flex',
    alignItems: "center",
    margin: "0.5em 1em",
  }

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

  const tableFilterStyles = {
    width: "fit-content",
    marginLeft: "auto",
    display: "inline-block",
  }

  return (
    <div>
      <Solution solutionData={solution} />
      {gameData.knownCards && <KnownCards cards={gameData.knownCards} />}

      <div style={tableActionStyles}>
        <div style={actionGroupStyles}>
          <button style={actionStyles} onClick={() => setAccusationModalIsOpen(true)}>
            Add Accusation
          </button>
          <button style={actionStyles} onClick={() => setCardModalIsOpen(true)}>
            Add Learned Card
          </button>
        </div>
        <div style={tableFilterStyles}>
          <label>Filter Cards: </label>
          <Filter type="Known" onFilterChanged={updateFilters}/>
          <Filter type="Possible" onFilterChanged={updateFilters} />
          <Filter type="Impossible" onFilterChanged={updateFilters} />
        </div>
      </div>
      <Players 
        players={gameData.players} 
        playerCards={playerCards} 
        filters={filters}
      />
      <button style={{...actionStyles, marginLeft: "1em"}} onClick={() => setAccusationListModalIsOpen(true)}>
        View Accusations
      </button>
        
      {accusationModalIsOpen &&
        <AddAccusationModal 
          isOpen={accusationModalIsOpen}
          title={`Add Accusation for a player`}
          onSubmit={makeAccusation}
          onClose={() => setAccusationModalIsOpen(false)}
          playerNames={gameData.players}
        />
      }
      {cardModalIsOpen && 
        <AddLearnedCardModal 
          isOpen={cardModalIsOpen}
          title={`Add Learned Card for a player`}
          onSubmit={addLearnedCard}
          onClose={() => setCardModalIsOpen(false)}
          playerNames={gameData.players}
          unknownCards={getAllUnknownCards(playerCards, gameData.players, gameData.knownCards)}
        />
      }
      {accusationListModalIsOpen && 
        <AccusationListModal 
          isOpen={accusationListModalIsOpen}
          title={`Accusation List`}
          onClose={() => setAccusationListModalIsOpen(false)}
          accusations={accusations}
        />
      }
    </div>
  );
}

export default GameState;