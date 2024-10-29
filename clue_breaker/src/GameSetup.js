import React, { useState } from 'react';
import PlayerSetup from './PlayerSetup';
import KnownCardSetup from './KnownCardSetup';

function GameSetup({setGameData}) {
  const [playerData, setPlayerData] = useState(null);

  const handleSubmitKnownCards = (knownData) => {
    setGameData({
      players: playerData,
      ...knownData,
    })
  };

  return (
    <div>
      {!!playerData ? 
        <KnownCardSetup setKnownData={handleSubmitKnownCards} numPlayers={playerData.length}/> :
        <PlayerSetup setPlayerData={setPlayerData}/>
      }
    </div>
  );
}

export default GameSetup;