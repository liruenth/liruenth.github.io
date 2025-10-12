import React from 'react';
import { ALL_CARDS } from "./Constants";
import AllCardSelector from './AllCardSelector';

function KnownCardSetup({setKnownData, playerData}) {

  const maxCardCount = ALL_CARDS.length - 3;
  const remainingCardCount = maxCardCount % playerData.length;
  const cardsPerPlayer = Math.floor(maxCardCount / playerData.length)

  let knownCardFields = [];
  for (let i = 0; i < remainingCardCount; i++) {
    knownCardFields.push(
      <React.Fragment>
        <AllCardSelector fieldName={`known-${i}`} fieldId={`known-${i}`} />
        <br />
      </React.Fragment>
    )
  }
  
  let myCardFields = [];
  for (let i = 0; i < cardsPerPlayer; i++) {
    myCardFields.push(
      <React.Fragment>
        <AllCardSelector fieldName={`myCard-${i}`} fieldId={`myCard-${i}`} />
        <br />
      </React.Fragment>
    )
  }

  const handleSubmit = (e) => {
    e.preventDefault();

    let knownValues = [];
    for (let i = 0; i < remainingCardCount; i++) {
      knownValues.push(e.target[`known-${i}`].value);
    }

    let myCardValues = [];
    for (let i = 0; i < cardsPerPlayer; i++) {
      myCardValues.push(e.target[`myCard-${i}`].value);
    }
    
    setKnownData({
      knownCards: knownValues,
      myCards: myCardValues,
      cardsPerPlayer,
      playerData,
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
        { knownCardFields }
        <h3>Enter own cards.</h3>
        { myCardFields }
        <br />
        <input type="submit" value="Submit"  style={buttonStyles}/>
      </form>
    </div>
  );
}

export default KnownCardSetup;