import React from 'react';

function AccusationItem({accusation}) {

  return (
    <div>
      <div>{accusation.accuser}</div>
      <div>{accusation.suspect}</div>
      <div>{accusation.room}</div>
      <div>{accusation.weapon}</div>
      <div>{accusation.stoppedBy}</div>
    </div>
  );
}

export default AccusationItem;