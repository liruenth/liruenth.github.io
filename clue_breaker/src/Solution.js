import React from 'react';
import Card from './Card';
import { CARD_STATUSES } from './Constants';

function Solution({solutionData}) {
  const solutionStyles = {
    display: 'inline-block',
    textAlign: 'center',
  }
  return (
    <div style={{margin: '0.5em'}}>
        <span><b>Solution:</b></span>
        <div style={{display:'inline-block'}}>
          <label style={solutionStyles}>
            <b>Suspect</b>
            <br />
            <Card 
              cardName={solutionData.suspect ? solutionData.suspect : "Uknown"} 
              status={solutionData.suspect ? CARD_STATUSES.known : CARD_STATUSES.possible} 
            />
          </label>
          <label style={solutionStyles}>
            <b>Weapon</b>
            <br />
            <Card 
              cardName={solutionData.weapon ? solutionData.weapon : "Uknown"} 
              status={solutionData.weapon ? CARD_STATUSES.known : CARD_STATUSES.possible} 
            />
          </label>
          <label style={solutionStyles}>
            <b>Room</b>
            <br />
            <Card 
              cardName={solutionData.room ? solutionData.room : "Uknown"} 
              status={solutionData.room ? CARD_STATUSES.known : CARD_STATUSES.possible} 
            />
          </label>
        </div>
    </div>
  );
}

export default Solution;