import React from 'react';
import MyModal from './MyModal';
import ReactScrollableList from "react-scrollable-list";

function AccusationListModal ({ isOpen, title, onSubmit, onClose, accusations }) {

  const wrapperStyles = {
    height: '400px',
    overflow: 'scroll',
  }

  const tableStyles = {
    margin: '1em',
    tableLayout: 'fixed',
    overflow: 'auto',
    borderCollapse: 'collapse',
  }
 
  const accusationListStyles = {
    margin: "0.5em",
    backgroundColor: "lightblue",
    padding: "0.5em",
    border: "none",
    borderRadius: "5px",
    border: '4px solid black',
  };

  const accusationStyles = {
    textAlign: 'center',
    backgroundColor: "yellow",
    // boxShadow: '0 4px 8px 0 rgba(0,0,0,0.2)',
    padding: '0 25px',
    fontSize: '16px',
    height: '32px',
    lineHeight: '32px',
    margin: '5px',
  };

  const accusationList = accusations.map(accusation => 
    <tr style={accusationListStyles}>
      <td style={accusationStyles}>{accusation.id}</td>
      <td style={accusationStyles}>{accusation.player}</td>
      <td style={accusationStyles}>{accusation.suspect}</td>
      <td style={accusationStyles}>{accusation.weapon}</td>
      <td style={accusationStyles}>{accusation.room}</td>
      <td style={accusationStyles}>{accusation.stoppedBy}</td>
    </tr>
  );
  
  return (
    <MyModal 
      isOpen={isOpen}
      title={title}
      onSubmit={onSubmit}
      onClose={onClose}
      formFields={
        <div style={wrapperStyles}>
          <table style={tableStyles}>
            <tbody>
              <tr>
                <th>#</th>
                <th>Accuser</th>
                <th>Suspect</th>
                <th>Weapon</th>
                <th>Room</th>
                <th>Stopped By</th>
              </tr>
              {accusationList}
            </tbody>
          </table>
        </div>
      }
    />
  );
}

export default AccusationListModal;