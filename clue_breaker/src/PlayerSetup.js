import React from 'react';

function PlayerSetup({setPlayerData}) {

  const handleSubmit = (e) => {
    e.preventDefault();
    const playerValues = [
      e.target.player1.value,
      e.target.player2.value,
      e.target.player3.value,
      e.target.player4.value,
      e.target.player5.value,
      e.target.player6.value,
    ];
    
    setPlayerData(playerValues.filter(player => player !== ''));
  };

  const nameInputStyles = {
    border: "1px solid #ccc",
    padding: "0.3em",
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

  const playerNameFields = [1,2,3,4,5,6].map(id => {
    return (
      <div style={{marginBottom: "0.5em"}}>
        <label style={{marginRight: "0.5em"}}>Player {id}</label>
        <input name={`player${id}`} type="text" className="player-entry" style={nameInputStyles}/>
      </div>
    )
  })

  return (
    <div>
      <form onSubmit={handleSubmit} style={formStyles}>
        <h3>
          Enter the names of each player <br/>
          in turn order.
        </h3>
        { playerNameFields }
        <input type="submit" value="Submit" style={buttonStyles}/>
      </form>
    </div>
  );
}

export default PlayerSetup;