import React from 'react';
import Player from './Player';

function Players ({players, playerCards, ...props}) {
  const playerList = players.map((player => <Player playerName={player} playerCards={playerCards[player]} playerNames={players} {...props}/>));
  return (
    <div style={{margin: '0.5em'}}>
      { playerList }
    </div>
  );
}

export default Players;