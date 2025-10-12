import React, { useState } from 'react';
import MyModal from './MyModal';
// import UnknownCardSelector from './UnknownCardSelector';
import AllCardSelector from './AllCardSelector';

function AddLearnedCardModal ({ isOpen, title, onSubmit, onClose, playerNames }) {
  const [showValidation, setShowValidation] = useState(false);
  const playerOptions = playerNames.map(playerName => 
    <option key={playerName} value={playerName}>{playerName}</option>
  );

  const validateSubmit = (e) => {
    e.preventDefault();
    const player = e.target.player.value;
    const newLearned = e.target.learned.value;

    if (newLearned === "" || player === "") {
      setShowValidation(true);
    } else {
      onSubmit(newLearned, player);
      setShowValidation(false);
    }
  }

  const selectStyles = {
    margin: "0.5em",
    backgroundColor: "lightblue",
    padding: "0.5em",
    border: "none",
    borderRadius: "5px",
  };
  
  return (
    <MyModal 
      isOpen={isOpen}
      title={title}
      onSubmit={validateSubmit}
      onClose={onClose}
      formFields={
        <div>
          <div>
            <select name="player" id="player" style={selectStyles} >
              <option value="">--Player--</option>
              {playerOptions}
            </select>
            <AllCardSelector fieldName={"learned"} fieldId={"learned"} />
          </div>
          {showValidation ? 
            <span style={{ color: "red" }}>
              Select a learned card.
            </span> 
            : null
          }
        </div>
      }
    />
  );
}

export default AddLearnedCardModal;