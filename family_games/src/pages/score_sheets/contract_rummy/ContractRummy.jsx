import { useState, useEffect } from 'react'
import SheetTable from '../common/FrozenTable'
import AGGrid from '../common/AGGrid'
import AddPlayerModal from '../common/AddPlayerModal'
import { lastCompleteCol, averageTotal, sortedByTotal } from '../common/scoring'

let cols = ["2S", "1S1R", "2R", "3S", "2S1R", "2R1S", "3R"];

// Keep the sheet ranked by total. One flag for both places it applies: the grid
// re-ranks as rounds finish, and adding a player re-ranks here.
const AUTO_SORT = true;
function ContractRummy({players, scoreData, setScoreData}) {
  // Built once per game so entered scores survive re-renders. A restored sheet
  // brings its own scores; a new game starts every player empty.
  const [scores, setScores] = useState(() => scoreData ??
    new Map(players.map(player => [player, new Map()]))
  );
  const [addingPlayer, setAddingPlayer] = useState(false);
  const [numGroups, setNumGroups] = useState(1);

  // One group per player is as far as splitting them can go
  const maxGroups = Math.max(1, scores.size);

  const changeGroups = (event) => {
    // Clamped here as well as on the input, since typing into a number field can
    // put values outside min/max — and clearing it reads back as an empty string.
    const value = Math.floor(Number(event.target.value));
    setNumGroups(Number.isFinite(value) && value >= 1 ? Math.min(value, maxGroups) : 1);
  };

  // Swapping the Map for a new one is what lets the grid see a change to the
  // roster or to the row order — cell edits mutate it in place instead. Held here
  // as well as in ScoreSheet so the grid gets the new one as a prop.
  const replaceScores = (next) => {
    setScores(next);
    setScoreData(next);
  };

  const addPlayer = (player) => {
    // Shallow copy, so the inner per-player score Maps carry over untouched
    const next = new Map(scores);
    const startingScores = new Map();

    // Someone joining part-way starts level with the field rather than on zero,
    // banked against the last round everyone has finished. The rounds they were
    // never there for stay blank, so that round is the only one they're credited.
    const joinedAt = lastCompleteCol(scores, cols);
    if (joinedAt) {
      startingScores.set(joinedAt, averageTotal(scores, cols));
    }

    next.set(player, startingScores);
    // Their starting score is a real total, so slot them into the ranking rather
    // than leaving them on the bottom row until the next round finishes.
    replaceScores(AUTO_SORT ? sortedByTotal(next, cols) : next);
  };

  return (
    <>
      <div>
        <h1>Contract Rummy Coming Soon</h1>
      </div>
      {/* <SheetTable scoreData={scores} cols={cols} setScoreData={setScoreData}/> */}
      <AGGrid
        scoreData={scores}
        cols={cols}
        setScoreData={setScoreData}
        autoSortTable={AUTO_SORT}
        onReorder={replaceScores}
      />
      <div className="sheet-footer">
        <button type="button" onClick={() => setAddingPlayer(true)}>
          Add Player
        </button>
        <label className="groups-field">
          Groups
          <input
            type="number"
            min="1"
            max={maxGroups}
            step="1"
            value={numGroups}
            onChange={changeGroups}
          />
        </label>
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