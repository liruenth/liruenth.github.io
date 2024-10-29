import React from 'react';
import Card from './Card';
import { CARD_STATUSES } from './Constants';

function Player ({playerName, playerCards, filters}) {
  
  const playerKnownCards = filters.known 
    ? playerCards.known.map((card => <Card cardName={card.name} status={CARD_STATUSES.known}/>)) 
    : [];
  const playerPossibleCards = filters.possible 
    ? playerCards.possible.map((card => <Card cardName={card.name} status={CARD_STATUSES.possible}/>)) 
    : [];
  const playerImpossibleCards = filters.impossible 
    ? playerCards.impossible.map((card => <Card cardName={card.name} status={CARD_STATUSES.impossible}/>)) 
    : [];
  const cards = playerKnownCards.concat(playerPossibleCards).concat(playerImpossibleCards);

  const playerStyles = {
    padding: '0.5em',
    margin: '0.5em',
    boxShadow: '0 4px 8px 0 rgba(0,0,0,0.2)',
    display: 'flex',
    alignItems: 'center',
  }

  const cardListStyles = {
    width: '85%',
    float: 'right',
  }

  return (
    <div style={playerStyles}>
      <label style={{textTransform: 'capitalize', fontSize: 'x-large', marginRight: '0.5em'}}><b>{playerName}</b></label>
      <div style={cardListStyles}>
        {cards}
      </div>
    </div>
  );
}

export default Player;