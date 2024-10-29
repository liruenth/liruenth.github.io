import React from 'react';
import { ALL_CARDS } from "./Constants";
import AllCardSelector from './AllCardSelector';

function KnownCardSetup({setKnownData, numPlayers}) {

  const maxCardCount = ALL_CARDS.length - 3;
  const remainingCardCount = maxCardCount % numPlayers;

  let cardFields = [];
  for (let i = 0; i < remainingCardCount; i++) {
    cardFields.push(
      <React.Fragment>
        <AllCardSelector fieldName={`known-${i}`} fieldId={`known-${i}`} />
        <br />
      </React.Fragment>
    )
  }

  const handleSubmit = (e) => {
    e.preventDefault();

    let knownValues = [];
    for (let i = 0; i < remainingCardCount; i++) {
      knownValues.push({name: e.target[`known-${i}`].value})
    }
    
    setKnownData({
      knownCards: knownValues,
      cardsPerPlayer: Math.floor(maxCardCount / numPlayers),
    });
  };

  const formStyles = {
    textAlign: "center",
    width: "fit-content",
    backgroundColor: "ghostwhite",
    margin: "0.5em",
    padding: "0.5em",
  };

  const buttonStyles = {
    backgroundColor: "lawngreen",
    fontWeight: "bold",
    fontSize: "large",
    border: "none",
    borderRadius: "5px",
    padding: "0.5em",
    margin: "0.5em",
    cursor: 'pointer',
  };

  return (
    <div>
      <form onSubmit={handleSubmit} style={formStyles}>
        <h3>
          {remainingCardCount === 0 ?
            "No known cards." :
            "Enter the known cards."
          }
        </h3>
        { cardFields }
        <br />
        <input type="submit" value="Submit"  style={buttonStyles}/>
      </form>
    </div>
  );
}

export default KnownCardSetup;