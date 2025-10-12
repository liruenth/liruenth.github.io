import React from 'react';
import { WEAPONS, ROOMS, SUSPECTS, SUSPECT_COLOR } from "./Constants";

function AllCardSelector({fieldName, fieldId}) {
  const roomOptions = ROOMS.map(room => {
    return(<option key={room} value={room}>{room}</option>);
  });

  const suspectOptions = SUSPECTS.map(suspect => {
    return(<option key={suspect} value={suspect} style={{color: SUSPECT_COLOR[suspect]}}>{suspect}</option>);
  });

  const weaponOptions = WEAPONS.map(weapon => {
    return(<option key={weapon} value={weapon}>{weapon}</option>);
  });

  const selectStyles = {
    margin: "0.5em",
    backgroundColor: "lightblue",
    padding: "0.5em",
    border: "none",
    borderRadius: "5px",
  };

  return(
    <select name={fieldName} id={fieldId} label="Known Card" style={selectStyles}>
      <option value="">--Select a Known Card--</option>
      {roomOptions}
      {suspectOptions}
      {weaponOptions}
    </select>
  )
}

export default AllCardSelector;