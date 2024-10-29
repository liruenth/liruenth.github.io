import React from 'react';
import Card from './Card';
import { CARD_STATUSES } from './Constants';

function KnownCards({cards}) {
  if (cards.length === 0) {
    return;
  }
  const cardList = cards.map((card => <Card cardName={card.name} status={CARD_STATUSES.known} />));

  const knownStyles = {
    display: 'inline-block',
    textAlign: 'center',
    margin: '0.5em',
  }
  return (
    <div style={{margin: '0.5em'}}>
      <span><b>Known Cards: </b></span>
      <div style={knownStyles}>
        { cardList }
      </div>
    </div>
  );
}

export default KnownCards;