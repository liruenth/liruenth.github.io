import { useState, useEffect } from 'react'
import MormonBridgeTable from './mormon_bridge_table'
import ActionsMenu from '../common/ActionsMenu'
import ConfirmModal from '../common/ConfirmModal'
import RemovePlayerModal from '../common/RemovePlayerModal'
import SubmitGame from '../common/SubmitGame'
import { emptySheet } from '../../../helpers/mormonBridge'
import { roundsFor } from '../../../helpers/gameTypes'

const cols = roundsFor('MB');

/* Who's been taken out of play. Kept here rather than up in ScoreSheet — it's the
   only game with the action — and so cleared here too, on the way into a new one.
   Saved, because a refresh part-way through restores the sheet, and a roster that
   quietly came back to life around the restored scores would be worse than not
   restoring at all. */
const REMOVED_KEY = 'mbRemovedPlayers';

function readRemoved() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(REMOVED_KEY) || '[]');
    return new Set(Array.isArray(saved) ? saved : []);
  } catch {
    return new Set();
  }
}

function MormonBridge({players, scoreData, setScoreData, onSubmitGame, onNewGame}) {
  /* Built once per game so entered scores survive re-renders. A restored sheet
     brings its own scores; a new game starts every round of every player blank.

     Never replaced, unlike Contract Rummy's: nothing here adds a player or
     re-ranks the rows, and the order they were entered in is the order they're
     sitting in, which is what the bidding follows. Cell edits mutate this Map in
     place and hand a copy of it up to be saved. */
  const [scores] = useState(() => scoreData ?? emptySheet(players));
  const [removed, setRemoved] = useState(readRemoved);
  const [removingPlayer, setRemovingPlayer] = useState(false);
  const [startingNewGame, setStartingNewGame] = useState(false);

  useEffect(() => {
    sessionStorage.setItem(REMOVED_KEY, JSON.stringify([...removed]));
  }, [removed]);

  // The removals belong to the game that's finishing, so they go with it. Cleared
  // here rather than in ScoreSheet, which doesn't know this key exists.
  const startNewGame = () => {
    sessionStorage.removeItem(REMOVED_KEY);
    onNewGame();
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
            {/* TODO: the bid-then-took modal specced in README.md. Closing the
                menu is all it does for now, so the action has its slot. */}
            <button
              type="button"
              className="actions-menu-item"
              onClick={closeMenu}
            >
              Auto Step
            </button>
            <button
              type="button"
              className="actions-menu-item"
              onClick={() => { setRemovingPlayer(true); closeMenu(); }}
            >
              Remove Player{removed.size ? ` (${removed.size})` : ''}
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
        <h1>Mormon Bridge</h1>
      </div>
      <MormonBridgeTable
        scoreData={scores}
        cols={cols}
        setScoreData={setScoreData}
        disabledPlayers={removed}
      />
      {removingPlayer &&
        <RemovePlayerModal
          players={[...scores.keys()]}
          removed={removed}
          onSave={setRemoved}
          onClose={() => setRemovingPlayer(false)}
        />
      }
      {startingNewGame &&
        <ConfirmModal
          heading="Start New Game"
          message="Do you want to start a new game?"
          confirmLabel="Start New Game"
          onConfirm={startNewGame}
          onClose={() => setStartingNewGame(false)}
        />
      }
    </>
  )
}

export default MormonBridge
