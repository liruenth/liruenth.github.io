import React, { useState } from 'react';
import './App.css';
import GameSetup from './GameSetup';
import GameState from './GameState';

function App() {
  //{players, knownCards, cardsPerPlayer}
  const [gameData, setGameData] = useState(
    // {
    //   cardsPerPlayer: 4,
    //   knownCards: [
    //     {name: 'Ballroom'},
    //     {name: 'Billiard Room'},
    //   ],
    //   players: ['jim', 'west', 'test', 'best'],
    // }
    null
  );

  return (
    !!gameData 
      ? <GameState gameData={gameData}/>
      : <GameSetup setGameData={setGameData} /> 
  );
}

export default App;
