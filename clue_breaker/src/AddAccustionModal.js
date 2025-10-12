import React, { useState } from 'react';
import MyModal from './MyModal';
import { SUSPECTS, WEAPONS, ROOMS } from './Constants';

function AddAccusationModal ({isOpen, title, onSubmit, onClose, playerNames, defaultValues = {}}) {
  const [showValidation, setShowValidation] = useState(false);

  const suspectOptions = SUSPECTS.map(suspect => 
    <option key={suspect} value={suspect}>{suspect}</option>
  );
  const weaponOptions = WEAPONS.map(weapon => 
    <option key={weapon} value={weapon}>{weapon}</option>
  );
  const roomOptions = ROOMS.map(room => 
    <option key={room} value={room}>{room}</option>
  );
  const playerOptions = playerNames.map(playerName => 
    <option key={playerName} value={playerName}>{playerName}</option>
  );
  const cardTypes = ["suspect", "weapon", "room"];
  const shownCardOptions = cardTypes.map(type =>
    <option key={type} value={type}>{type}</option>
  );

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
    const shownCard = e.target.shownCard.value;
    if (accuser === "" ||
      suspect === "" ||
      weapon === "" ||
      room === "" ||
      stoppedBy === ""
    ) {
      setShowValidation(true);
    } else {
      console.log("submitAddModal");
      console.log(defaultValues);
      onSubmit({player: accuser, suspect, weapon, room, stoppedBy, shownCard});
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
            <select name="accuser" id="accuser" style={selectStyles} defaultValue={defaultValues.player || ""} >
              <option value="">--Accuser--</option>
              {playerOptions}
            </select>
            <select name="suspects" id="suspects" style={selectStyles} defaultValue={defaultValues.suspect || ""} >
              <option value="">--Suspect--</option>
              {suspectOptions}
            </select>
            <select name="weapons" id="weapons" style={selectStyles} defaultValue={defaultValues.weapon || ""} >
              <option value="">--Weapon--</option>
              {weaponOptions}
            </select>
            <select name="rooms" id="rooms" style={selectStyles} defaultValue={defaultValues.room || ""} >
              <option value="">--Room--</option>
              {roomOptions}
            </select>
            <select name="stopped-by" id="stoppedBy" style={selectStyles} defaultValue={defaultValues.stoppedBy || ""} >
              <option value="">--Stopped By--</option>
              {playerOptions}
            </select>
            <select name="shown-card" id="shownCard" style={selectStyles} defaultValue={defaultValues.shownCard || ""} >
              <option value="">--Shown--</option>
              {shownCardOptions}
            </select>
          </div>
          {showValidation ? 
            <span style={{color: "red"}}>
              All fields except shown card need a value.
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