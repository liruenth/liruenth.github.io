import React from 'react';
import DataTable from 'react-data-table-component';
import { WEAPONS, SUSPECTS, SUSPECT_COLOR } from './Constants';
import CardMap from './CardMap';

const COLOR_STATES = [
  'white',
  'black',
  'yellow',
  'rgba(0, 255, 42, 1'
];

// The main component for the interactive grid application.
const LogicGrid = ({gameData, setGameData}) => {
  const cardMap = gameData.cardMap;
  const players = gameData.players;

  const cardMapArray = CardMap.getCardMapArray(cardMap, players.length);

  const cellButtonStyles = {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  }

  const suspectStyles = [];
  for (let i = 0; i < SUSPECTS.length; i++) {
    suspectStyles.push({
      when: row => row.card === SUSPECTS[i],
      style: {
        color: SUSPECT_COLOR[SUSPECTS[i]],
        WebkitTextStroke: 'black 2px',
        WebkitTextStrokeWidth: 'thin',
      },
    })
  }

  const columns = [
    {
      name: 'Card',
      selector: row => row.card,
      center: 'true',
      compact: 'true',
      maxwidth: '100px',
      style: {
        backgroundColor: 'rgba(226, 226, 226, 0.5)', 
        fontWeight: 900,
        fontSize: 'large',
      },
      conditionalCellStyles: suspectStyles,
    }
  ]
  for (let i = 0; i < players.length; i++) {
    columns.push({
      name: players[i],
      selector: row => row[`player${i}`],
      width: '50px',
      center: 'true',
      compact: 'true',
      conditionalCellStyles: [
        {
          when: row => row[`player${i}`] === 0,
          style: {backgroundColor: COLOR_STATES[0]},
        },
        {
          when: row => row[`player${i}`] === 1,
          style: {backgroundColor: COLOR_STATES[1]},
        },
        {
          when: row => row[`player${i}`] % 4 === 2,
          style: {backgroundColor: COLOR_STATES[2]},
        },
        {
          when: row => row[`player${i}`] === 3,
          style: {backgroundColor: COLOR_STATES[3]},
        },
      ],
      cell: (row, index, column, id) => {
        const cellValue = row[`player${column.id - 2}`];
        return (
          <button style={{...cellButtonStyles, color: cellValue % 4 === 2 ? 'black' : 'transparent'}}
            onClick={() => {
              setGameData({
                ...gameData,
                cardMap: CardMap.setCellValue(
                  cardMap, 
                  row.card, 
                  column.id - 2, 
                  (cellValue + 1) % 4,
                  true
                )
              })
            }}
          >{Math.ceil(cellValue / 4)}</button>
        )
      }
    })
  }

  const categoryStyles = [
    {
      when: row => WEAPONS.includes(row.card),
      style: {
        backgroundColor: 'rgb(107, 107, 107)',
      }
    },
  ];

  const cellStyles = {
    boxShadow: '0 6px 8px 0 rgba(0,0,0,0.5)',
    display: 'inline-block',
    lineHeight: '20px',
    margin: '3px',
    textAlign: 'center',
  };
  const customStyles = {
    headCells: {
      style: {
        ...cellStyles,
        backgroundColor: 'rgba(182, 182, 182, 0.5)',
      }
    },
    cells: {
      style: cellStyles
    },
    rows: {
      style: {
        height: '5px',
        minHeight: '5px',
      }
    },
  }

  const gridContainerStyles = {
    width: `${players.length * 58 + 180}px`,
    marginLeft: 'auto',
    marginRight: 'auto',
  }

  return (
    <div style={gridContainerStyles}>
      <DataTable
        columns={columns}
        data={cardMapArray}
        striped={true}
        responsive={true}
        highlightOnHover={true}
        customStyles={customStyles}
        conditionalRowStyles={categoryStyles}
        dense={true}
      />
    </div>
  );
};

export default LogicGrid;
