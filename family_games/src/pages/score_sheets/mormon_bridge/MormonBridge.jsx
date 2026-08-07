import { useState } from 'react'
import MormonBridgeTable from './mormon_bridge_table'
import AutoStepModal from './AutoStepModal'
import ActionsMenu from '../common/ActionsMenu'
import ConfirmModal from '../common/ConfirmModal'
import RemovePlayerModal from '../common/RemovePlayerModal'
import SubmitGame from '../common/SubmitGame'
import { useRemovedPlayers } from '../common/removedPlayers'
import { emptySheet } from '../../../helpers/mormonBridge'
import { roundsFor } from '../../../helpers/gameTypes'

const cols = roundsFor('MB');

// This sheet's own key for who's out of play — see common/removedPlayers.js
const REMOVED_KEY = 'mbRemovedPlayers';

function MormonBridge({players, scoreData, setScoreData, onSubmitGame, onNewGame}) {
  /* Built once per game so entered scores survive re-renders. A restored sheet
     brings its own scores; a new game starts every round of every player blank.

     Its contents are mutated in place — that's what lets the grid keep drawing
     off the same cell objects it was handed — so the identity only moves when
     something outside the grid has written, which is Auto Step. Nothing here ever
     reorders it: the order the players were entered in is the order they're
     sitting in, and that's what the bidding follows. */
  const [scores, setScores] = useState(() => scoreData ?? emptySheet(players));
  const [removed, setRemoved, clearRemoved] = useRemovedPlayers(REMOVED_KEY);
  const [autoStepping, setAutoStepping] = useState(false);
  const [removingPlayer, setRemovingPlayer] = useState(false);
  const [startingNewGame, setStartingNewGame] = useState(false);

  /* Auto Step writes into the sheet from outside the grid, so the grid has to be
     handed a Map it can tell apart from the one it already has or it won't rebuild
     its rows. The same swap is what pushes the sheet up to ScoreSheet to be saved,
     so a run survives a refresh. */
  const scoresChanged = () => {
    const next = new Map(scores);
    setScores(next);
    setScoreData(next);
  };

  const startNewGame = () => {
    clearRemoved();
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
            <button
              type="button"
              className="actions-menu-item"
              onClick={() => { setAutoStepping(true); closeMenu(); }}
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
      {autoStepping &&
        <AutoStepModal
          scores={scores}
          cols={cols}
          removed={removed}
          onEntered={scoresChanged}
          onClose={() => setAutoStepping(false)}
        />
      }
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
