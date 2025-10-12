import React, { useState } from 'react';
import MyModal from './MyModal';
import AddAccusationModal from './AddAccustionModal';

function AccusationListModal ({ isOpen, title, onSubmit, onClose, accusations = [], playerNames, setGameData }) {
  const [editAccusationModalIsOpen, setEditAccusationModalIsOpen] = useState(null);

  const editAccusation = (accusationData) => {
    accusationData = {...accusationData, id: editAccusationModalIsOpen.id};
    setEditAccusationModalIsOpen(null);

    const gameDataAccusations = [...accusations];
    gameDataAccusations[accusationData.id - 1] = accusationData;

    setGameData(prevGameData => {
      return ({
        ...prevGameData,
        accusations: gameDataAccusations,
      });
    });
  }  

  const wrapperStyles = {
    height: '400px',
    overflow: 'auto',
  }

  const tableStyles = {
    margin: '1em',
    tableLayout: 'fixed',
    overflow: 'auto',
    borderCollapse: 'collapse',
    whiteSpace: "nowrap",
  }

  const accusationList = accusations.length > 0 ? accusations.map(accusation => 
    <tr className={"tableRow"} key={accusation.id}>
      <td className={"tableCell"}>{accusation.id}</td>
      <td className={"tableCell"}>{accusation.player}</td>
      <td className={"tableCell"}>{accusation.suspect}</td>
      <td className={"tableCell"}>{accusation.weapon}</td>
      <td className={"tableCell"}>{accusation.room}</td>
      <td className={"tableCell"}>{accusation.stoppedBy}</td>
      <td className={"tableCell"}>{accusation[accusation.shownCard]}</td>
      <td onClick={() => setEditAccusationModalIsOpen(accusation)}>✎</td>
    </tr>
  ) : null;
  
  return (
    <div>
      <MyModal 
        isOpen={isOpen}
        title={title}
        onSubmit={onSubmit}
        onClose={onClose}
        formFields={
          <div style={wrapperStyles}>
            {
              accusations.length > 0 ?
                <div>
                  <table style={tableStyles}>
                    <tbody>
                      <tr>
                        <th>#</th>
                        <th>Accuser</th>
                        <th>Suspect</th>
                        <th>Weapon</th>
                        <th>Room</th>
                        <th>Stopped By</th>
                        <th>shownCard</th>
                        <th>edit</th>
                      </tr>
                      {accusationList}
                    </tbody>
                  </table>
                </div>
                : "No Accusations Made"
            }
          </div>
        }
      />

      {!!editAccusationModalIsOpen &&
        <AddAccusationModal 
          isOpen={!!editAccusationModalIsOpen}
          title={`Edit Accusation for a player`}
          onSubmit={editAccusation}
          onClose={() => setEditAccusationModalIsOpen(null)}
          playerNames={playerNames}
          defaultValues={editAccusationModalIsOpen}
        />
      }
    </div>
  );
}

export default AccusationListModal;