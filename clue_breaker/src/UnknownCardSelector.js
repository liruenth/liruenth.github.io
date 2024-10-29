import React from 'react';
import { WEAPONS, ROOMS, SUSPECTS, SUSPECT_COLOR } from "./Constants";

function AllCardSelector({fieldName, fieldId, unknownCards}) {
  const roomOptions = ROOMS
    .filter(room => unknownCards.includes(room))
    .map(room => {
      return(<option value={room}>{room}</option>);
    });

  const suspectOptions = SUSPECTS
    .filter(suspect => unknownCards.includes(suspect))
    .map(suspect => {
      return(<option value={suspect} style={{color: SUSPECT_COLOR[suspect]}}>{suspect}</option>);
    });

  const weaponOptions = WEAPONS
    .filter(weapon => unknownCards.includes(weapon))
    .map(weapon => {
      return(<option value={weapon}>{weapon}</option>);
    });

  const selectStyles = {
    margin: "0.5em",
    backgroundColor: "lightblue",
    padding: "0.5em",
    border: "none",
    borderRadius: "5px",
  };

  return(
    <select labelId={fieldName} id={fieldId} label="Known Card" style={selectStyles}>
      <option value="">--Select a Known Card--</option>
      {roomOptions}
      {suspectOptions}
      {weaponOptions}
    </select>
  )
}

export default AllCardSelector;