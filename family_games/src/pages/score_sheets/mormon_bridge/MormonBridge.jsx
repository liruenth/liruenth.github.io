import { useState } from 'react'
import MormonBridgeTable from './mormon_bridge_table'
import AutoStepModal from './AutoStepModal'
import ActionsMenu from '../common/ActionsMenu'
import ConfirmModal from '../common/ConfirmModal'
import RemovePlayerModal from '../common/RemovePlayerModal'
import SubmitGame from '../common/SubmitGame'
import { useRemovedPlayers, MB_REMOVED_KEY } from '../common/removedPlayers'
import { emptySheet, sheetRounds } from '../../../helpers/mormonBridge'
import { readStartingRound } from '../../../helpers/startingRound'

function MormonBridge({players, scoreData, setScoreData, onSubmitGame, onSubmitted, onNewGame}) {
  /* Built once per game so entered scores survive re-renders. A restored sheet
     brings its own scores; a new game starts every round of every player blank.

     Its contents are mutated in place — that's what lets the grid keep drawing
     off the same cell objects it was handed — so the identity only moves when
     something outside the grid has written, which is Auto Step. Nothing here ever
     reorders it: the order the players were entered in is the order they're
     sitting in, and that's what the bidding follows. */
  const [scores, setScores] = useState(() => scoreData ?? emptySheet(players, readStartingRound()));

  /* The rounds this game is played over, read off the sheet rather than asked of
     the game type — where a Mormon Bridge game opens is a choice made per game,
     and a big table opens lower and repeats that round to keep the game ten long.

     Off the sheet rather than from the stored choice, because the sheet is the one
     that answers for all three ways of arriving here: a new game seeded above, a
     game restored from storage mid-play, and a finished game opened back up for
     editing — the last of which brings its own rounds and never picked a start at
     all.

     In state so its identity holds for the life of the sheet. The grid rebuilds
     every column when this changes, and Auto Step hands up a new Map on every
     entry — so deriving it on each render would rebuild the columns under the
     cell being typed into. */
  const [cols] = useState(() => sheetRounds(scores));
  const [removed, setRemoved, clearRemoved] = useRemovedPlayers(MB_REMOVED_KEY);
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
            <SubmitGame scores={scores} onSubmit={onSubmitGame} onSubmitted={onSubmitted} onSelect={closeMenu}/>
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
