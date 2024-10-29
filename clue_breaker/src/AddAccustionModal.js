import React, { useState } from 'react';
import MyModal from './MyModal';
import { SUSPECTS, WEAPONS, ROOMS } from './Constants';

function AddAccusationModal ({isOpen, title, onSubmit, onClose, playerNames}) {
  const [showValidation, setShowValidation] = useState(false);

  const suspectOptions = SUSPECTS.map(suspect => <option value={suspect}>{suspect}</option>);
  const weaponOptions = WEAPONS.map(weapon => <option value={weapon}>{weapon}</option>);
  const roomOptions = ROOMS.map(room => <option value={room}>{room}</option>);
  const playerOptions = playerNames.map(playerName => <option value={playerName}>{playerName}</option>);

  const selectStyles = {
    margin: "0.5em",
    backgroundColor: "lightblue",
    padding: "0.5em",
    border: "none",
    borderRadius: "5px",
  };

  const validateSubmit = (e) => {
    e.preventDefault();
    const accuser = e.target.accuser.value;
    const suspect = e.target.suspects.value;
    const weapon = e.target.weapons.value;
    const room = e.target.rooms.value;
    const stoppedBy = e.target.stoppedBy.value;
    if (accuser === "" ||
      suspect === "" ||
      weapon === "" ||
      room === "" ||
      stoppedBy === ""
    ) {
      setShowValidation(true);
    } else {
      onSubmit({player: accuser, suspect, weapon, room, stoppedBy});
      setShowValidation(false);
    }
  }
  
  return (
    <MyModal 
      isOpen={isOpen}
      title={title}
      onSubmit={validateSubmit}
      onClose={onClose}
      formFields={
        <div>
          <div>
            <select name="accuser" id="accuser" style={selectStyles} >
              <option value="">--Accuser--</option>
              {playerOptions}
            </select>
            <select name="suspects" id="suspects" style={selectStyles}>
              <option value="">--Suspect--</option>
              {suspectOptions}
            </select>
            <select name="weapons" id="weapons" style={selectStyles} >
              <option value="">--Weapon--</option>
              {weaponOptions}
            </select>
            <select name="rooms" id="rooms" style={selectStyles} >
              <option value="">--Room--</option>
              {roomOptions}
            </select>
            <select name="stopped-by" id="stoppedBy" style={selectStyles} >
              <option value="">--Stopped By--</option>
              {playerOptions}
            </select>
          </div>
          {showValidation ? 
            <span style={{color: "red"}}>
              All fields need a value.
              <br />
              <i>Stopped By</i> should be accuser's name if not stopped.
            </span> 
            : null
          }
        </div>
      }
    />
  );
}

export default AddAccusationModal;