import React from 'react';
import './Table.css'; // See the CSS required below

const FrozenTable = ({scoreData, cols, setScoreData}) => {
  const rows = [...scoreData.keys()];
  

  const handleChange = (e, rIdx, cIdx) => {
    const { value } = e.target;
    scoreData.get(rows[rIdx]).set(cols[cIdx], value);
    setScoreData(new Map(scoreData));
  };

  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            {/* The top-left corner cell must freeze both top and left */}
            <th className="frozen-corner"></th>
            {cols.map((col, cIdx) => (
              <th key={cIdx} className="frozen-row">{col}</th>
            ))}
            <th className="frozen-corner">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rIdx) => (
            <tr key={rIdx}>
              {/* First column cell freezes to the left */}
              <td className="frozen-col">{row}</td>
              {cols.map((_, cIdx) => (
                <td key={cIdx}>
                  <input 
                    type="number"
                    value={scoreData.get(rows[rIdx])[cIdx] || null}
                    onChange={(e) => handleChange(e, rIdx, cIdx)}
                  />
                </td>
                //<td key={cIdx}>Data {rIdx + 1}-{cIdx + 1}</td>
              ))}
              <td className="frozen-col">Total</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default FrozenTable