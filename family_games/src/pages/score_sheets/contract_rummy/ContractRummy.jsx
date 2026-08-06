import { useState } from 'react'
import ContractRummyTable from './contract_rummy_table'
import ActionsMenu from '../common/ActionsMenu'
import AddPlayerModal from '../common/AddPlayerModal'
import ConfirmModal from '../common/ConfirmModal'
import GroupsModal from '../common/GroupsModal'
import SubmitGame from '../common/SubmitGame'
import { lastCompleteCol, averageTotal, sortedByTotal } from '../../../helpers/scoring'
import { roundsFor } from '../../../helpers/gameTypes'

const cols = roundsFor('CR');

// Keep the sheet ranked by total. One flag for both places it applies: the grid
// re-ranks as rounds finish, and adding a player re-ranks here.
const AUTO_SORT = true;
function ContractRummy({players, scoreData, setScoreData, onSubmitGame, onNewGame}) {
  // Built once per game so entered scores survive re-renders. A restored sheet
  // brings its own scores; a new game starts every player empty.
  const [scores, setScores] = useState(() => scoreData ??
    new Map(players.map(player => [player, new Map()]))
  );
  const [addingPlayer, setAddingPlayer] = useState(false);
  const [changingGroups, setChangingGroups] = useState(false);
  const [startingNewGame, setStartingNewGame] = useState(false);
  const [numGroups, setNumGroups] = useState(1);

  // One group per player is as far as splitting them can go
  const maxGroups = Math.max(1, scores.size);

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
      {/* Children get the closer so picking an item dismisses the menu. Submit
          is passed the live `scores` rather than the copy up in ScoreSheet,
          since cell edits mutate this one in place and it's the only one
          guaranteed current. */}
      <ActionsMenu>
        {(closeMenu) => (
          <>
            <button
              type="button"
              className="actions-menu-item"
              onClick={() => { setAddingPlayer(true); closeMenu(); }}
            >
              Add Player
            </button>
            <button
              type="button"
              className="actions-menu-item"
              onClick={() => { setChangingGroups(true); closeMenu(); }}
            >
              Groups ({numGroups})
            </button>
            <SubmitGame scores={scores} onSubmit={onSubmitGame} onSelect={closeMenu}/>
            <button
              type="button"
              className="actions-menu-item is-destructive"
              onClick={() => { setStartingNewGame(true); closeMenu(); }}
            >
              New Game
            </button>
          </>
        )}
      </ActionsMenu>

      <div>
        <h1>Contract Rummy</h1>
      </div>
      <ContractRummyTable
        scoreData={scores}
        cols={cols}
        setScoreData={setScoreData}
        autoSortTable={AUTO_SORT}
        onReorder={replaceScores}
      />
      {addingPlayer &&
        <AddPlayerModal
          existingPlayers={[...scores.keys()]}
          onAdd={addPlayer}
          onClose={() => setAddingPlayer(false)}
        />
      }
      {changingGroups &&
        <GroupsModal
          value={numGroups}
          maxGroups={maxGroups}
          onSave={setNumGroups}
          onClose={() => setChangingGroups(false)}
        />
      }
      {startingNewGame &&
        <ConfirmModal
          heading="Start New Game"
          message="Do you want to start a new game?"
          confirmLabel="Start New Game"
          onConfirm={onNewGame}
          onClose={() => setStartingNewGame(false)}
        />
      }
    </>
  )
}

export default ContractRummy