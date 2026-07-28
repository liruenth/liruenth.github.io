import { useState, useEffect } from 'react'
import SheetTable from '../common/FrozenTable'
import AGGrid from '../common/AGGrid'
import AddPlayerModal from '../common/AddPlayerModal'

let cols = ["2S", "1S1R", "2R", "3S", "2S1R", "2R1S", "3R"];
function ContractRummy({players, scoreData, setScoreData}) {
  // Built once per game so entered scores survive re-renders. A restored sheet
  // brings its own scores; a new game starts every player empty.
  const [scores, setScores] = useState(() => scoreData ??
    new Map(players.map(player => [player, new Map()]))
  );
  const [addingPlayer, setAddingPlayer] = useState(false);

  const addPlayer = (player) => {
    // A fresh Map so the grid sees the roster change; the copy is shallow, so
    // the inner per-player score Maps carry over untouched.
    const next = new Map(scores);
    next.set(player, new Map());
    setScores(next);
    setScoreData(next);
  };

  return (
    <>
      <div>
        <h1>Contract Rummy Coming Soon</h1>
      </div>
      {/* <SheetTable scoreData={scores} cols={cols} setScoreData={setScoreData}/> */}
      <AGGrid scoreData={scores} cols={cols} setScoreData={setScoreData}/>
      <div className="sheet-footer">
        <button type="button" onClick={() => setAddingPlayer(true)}>
          Add Player
        </button>
        {/* TODO: push the finished game to AWS (see README) */}
        <button type="button">
          Submit Game
        </button>
      </div>
      {addingPlayer &&
        <AddPlayerModal
          existingPlayers={[...scores.keys()]}
          onAdd={addPlayer}
          onClose={() => setAddingPlayer(false)}
        />
      }
    </>
  )
}

export default ContractRummy