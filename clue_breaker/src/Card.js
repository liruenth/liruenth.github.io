import React from 'react';
import { CARD_STATUSES } from './Constants';
const statusColor = {
  [CARD_STATUSES.known]: 'lawngreen',
  [CARD_STATUSES.possible]: 'yellow',
  [CARD_STATUSES.impossible]: 'lightgray',
}

function Card({cardName, status}) {

  const cardStyles = {
    backgroundColor: statusColor[status],
    boxShadow: '0 4px 8px 0 rgba(0,0,0,0.2)',
    display: 'inline-block',
    borderRadius: '25px',
    padding: '0 25px',
    fontSize: '16px',
    height: '32px',
    lineHeight: '32px',
    margin: '5px',
  }

  return (
    <div style={cardStyles}>
      {cardName}
    </div>
  );
}

export default Card;