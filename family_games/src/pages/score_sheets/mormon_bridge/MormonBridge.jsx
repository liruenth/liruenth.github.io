import { useState } from 'react'
import MormonBridgeTable from './mormon_bridge_table'
import AutoStepModal from './AutoStepModal'
import ActionsMenu from '../common/ActionsMenu'
import AddPlayerModal from '../common/AddPlayerModal'
import ConfirmModal from '../common/ConfirmModal'
import PlayersModal from '../common/PlayersModal'
import RemovePlayerModal from '../common/RemovePlayerModal'
import SubmitGame from '../common/SubmitGame'
import { useRemovedPlayers, MB_REMOVED_KEY } from '../common/removedPlayers'
import {
  blankRounds,
  emptySheet,
  mbColumnComplete,
  sheetRounds
} from '../../../helpers/mormonBridge'
import { renamePlayers, renameRemoved } from '../../../helpers/roster'
import { readStartingRound } from '../../../helpers/startingRound'

function MormonBridge({players, scoreData, setScoreData, onSubmitGame, onSubmitted, onNewGame}) {
  /* Built once per game so entered scores survive re-renders. A restored sheet
     brings its own scores; a new game starts every round of every player blank.

     Its contents are mutated in place — that's what lets the grid keep drawing
     off the same cell objects it was handed — so the identity only moves when
     something outside the grid has written: Auto Step, or one of the roster edits
     below.

     Its order is the seating, and the bidding goes round it. Nothing reorders it
     on its own — no ranking, no sorting — so the only thing that ever moves a row
     is somebody saying outright in the Players modal that the seat has changed. */
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
  const [addingPlayer, setAddingPlayer] = useState(false);
  const [editingPlayers, setEditingPlayers] = useState(false);
  const [removingPlayer, setRemovingPlayer] = useState(false);
  const [startingNewGame, setStartingNewGame] = useState(false);

  /* A sheet the grid can tell apart from the one it already has, which is what
     makes it rebuild its rows — and the same swap is what pushes the sheet up to
     ScoreSheet to be saved, so the change survives a refresh.

     Two ways to ask for it, because there are two kinds of change. Auto Step
     writes into the cells the sheet already holds, so it only needs the identity
     moved; the roster edits below build a new Map of their own and hand it over. */
  const replaceScores = (next) => {
    setScores(next);
    setScoreData(next);
  };

  const scoresChanged = () => replaceScores(new Map(scores));

  const startNewGame = () => {
    clearRemoved();
    onNewGame();
  };

  /* Someone who sat down after the game started. Their row is seeded with every
     round of it blank, the same as everyone else's — see the note on emptySheet
     in helpers/mormonBridge.js for why a row is filled in up front — and the
     rounds played before they arrived stay that way, which is what the stats page
     and the API already read as rounds nobody played.

     No catch-up total, unlike Contract Rummy's late joiner: a round here is a bid
     and a took, and there is no pair of those to invent that would be true.

     Appended, so they take the last seat. Where they're actually sitting is then
     a move away in the Players modal below, which is the one thing that can say
     it — the sheet's row order is the seating, and the bidding goes round it. */
  const addPlayer = (player) => {
    const next = new Map(scores);
    next.set(player, blankRounds(cols));
    replaceScores(next);
  };

  /* Renaming and reseating, which on a sheet keyed by player name are one edit of
     the Map — see helpers/roster.js. The removals go through the same list, being
     held by name too, or a renamed player would quietly come back into play. */
  const savePlayers = (entries) => {
    replaceScores(renamePlayers(scores, entries));
    setRemoved(renameRemoved(removed, entries));
  };

  /* The last round is in, bid and took, for everyone still playing — which is the
     game over. The submit item takes it and asks, once; see SubmitGame.jsx.

     Worked out on each render rather than watched for: committing a cell hands a
     new Map up to ScoreSheet, which renders this again, so there's nothing to
     subscribe to that isn't already happening. */
  const finished = mbColumnComplete(scores, cols[cols.length - 1], removed);

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
              onClick={() => { setAddingPlayer(true); closeMenu(); }}
            >
              Add Player
            </button>
            <button
              type="button"
              className="actions-menu-item"
              onClick={() => { setEditingPlayers(true); closeMenu(); }}
            >
              Edit Players
            </button>
            <button
              type="button"
              className="actions-menu-item"
              onClick={() => { setRemovingPlayer(true); closeMenu(); }}
            >
              Remove Player{removed.size ? ` (${removed.size})` : ''}
            </button>
            <SubmitGame
              scores={scores}
              onSubmit={onSubmitGame}
              onSubmitted={onSubmitted}
              onSelect={closeMenu}
              autoPrompt={finished}
            />
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
      {addingPlayer &&
        <AddPlayerModal
          existingPlayers={[...scores.keys()]}
          onAdd={addPlayer}
          onClose={() => setAddingPlayer(false)}
        />
      }
      {editingPlayers &&
        <PlayersModal
          players={[...scores.keys()]}
          reorderable
          onSave={savePlayers}
          onClose={() => setEditingPlayers(false)}
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
