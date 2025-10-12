import React, { useState } from 'react';
import PlayerSetup from './PlayerSetup';
import KnownCardSetup from './KnownCardSetup';

function GameSetup({setGameData}) {
  const [playerData, setPlayerData] = useState(null);

  return (
    <div>
      {!!playerData ? 
        <KnownCardSetup setKnownData={setGameData} playerData={playerData}/> :
        <PlayerSetup setPlayerData={setPlayerData}/>
      }
    </div>
  );
}

export default GameSetup;
