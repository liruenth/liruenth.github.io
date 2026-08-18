import { useState, useEffect } from 'react'
import ContractRummyTable from './contract_rummy_table'
import ActionsMenu from '../common/ActionsMenu'
import AddPlayerModal from '../common/AddPlayerModal'
import ConfirmModal from '../common/ConfirmModal'
import GroupsModal from '../common/GroupsModal'
import RemovePlayerModal from '../common/RemovePlayerModal'
import SubmitGame from '../common/SubmitGame'
import { useRemovedPlayers, CR_REMOVED_KEY } from '../common/removedPlayers'
import { lastCompleteCol, averageTotal, sortedByTotal } from '../../../helpers/scoring'
import { readGroups, saveGroups } from '../../../helpers/groups'
import { roundsFor } from '../../../helpers/gameTypes'

const cols = roundsFor('CR');

function ContractRummy({players, scoreData, setScoreData, onSubmitGame, onSubmitted, onNewGame}) {
  // Built once per game so entered scores survive re-renders. A restored sheet
  // brings its own scores; a new game starts every player empty.
  const [scores, setScores] = useState(() => scoreData ??
    new Map(players.map(player => [player, new Map()]))
  );
  const [removed, setRemoved, clearRemoved] = useRemovedPlayers(CR_REMOVED_KEY);
  const [addingPlayer, setAddingPlayer] = useState(false);
  const [changingGroups, setChangingGroups] = useState(false);
  const [removingPlayer, setRemovingPlayer] = useState(false);
  const [startingNewGame, setStartingNewGame] = useState(false);

  /* One group per player is as far as splitting them can go — counting only the ones
     still in the game, since a removed row sits below the groups rather than in one.
     An existing count that this drops below is left alone rather than lowered: putting
     the player back would have no way to restore it. It's clamped again on the next
     save, and a count past the rows just splits them as far as they'll go. */
  const maxGroups = Math.max(1, scores.size - removed.size);

  /* Kept with the sheet, so a refresh brings the groups back along with the scores
     it restores — and so the count picked on the roster screen before the game is
     the one this opens on. Both ends go through helpers/groups.js, which is where
     the clamp everything shares lives. */
  const [numGroups, setNumGroups] = useState(() => readGroups(maxGroups));

  useEffect(() => {
    saveGroups(numGroups);
  }, [numGroups]);

  /* Keep the sheet ranked by total, with anyone out of play below the field — but only
     while it's split into groups, since where the boundaries fall is the whole reason
     the rows need ordering. On a single group the sheet is read as one list and the
     order is the players' own, so it's left the way they arranged it. One flag for
     every place the ranking applies: the grid re-ranks as rounds finish, and adding or
     removing a player re-ranks here. */
  const autoSort = numGroups > 1;

  // Swapping the Map for a new one is what lets the grid see a change to the
  // roster or to the row order — cell edits mutate it in place instead. Held here
  // as well as in ScoreSheet so the grid gets the new one as a prop.
  const replaceScores = (next) => {
    setScores(next);
    setScoreData(next);
  };

  /* Being taken out of play is itself a move in the ranking — it sends the row to the
     bottom — so the sheet is re-ranked every time the list changes rather than only
     when a round finishes. Which is also how a player put back rejoins it, on the
     total they kept while they were out.

     It covers the round finishing on the removal, too: if theirs was the last blank in
     it, the round closes the moment they're out of play, with no edit left to come and
     notice. */
  const saveRemoved = (next) => {
    setRemoved(next);

    if (autoSort) {
      replaceScores(sortedByTotal(scores, cols, next));
    }
  };

  // The removals belong to the game that's finishing, so they go with it rather
  // than carrying into the next one.
  const startNewGame = () => {
    clearRemoved();
    onNewGame();
  };

  const addPlayer = (player) => {
    // Shallow copy, so the inner per-player score Maps carry over untouched
    const next = new Map(scores);
    const startingScores = new Map();

    // Someone joining part-way starts level with the field rather than on zero,
    // banked against the last round everyone still playing has finished. The rounds
    // they were never there for stay blank, so that round is the only one they're
    // credited.
    const joinedAt = lastCompleteCol(scores, cols, removed);
    if (joinedAt) {
      startingScores.set(joinedAt, averageTotal(scores, cols));
    }

    next.set(player, startingScores);
    // Their starting score is a real total, so slot them into the ranking rather
    // than leaving them on the bottom row until the next round finishes.
    replaceScores(autoSort ? sortedByTotal(next, cols, removed) : next);
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
        <h1>Contract Rummy</h1>
      </div>
      <ContractRummyTable
        scoreData={scores}
        cols={cols}
        setScoreData={setScoreData}
        autoSortTable={autoSort}
        onReorder={replaceScores}
        numGroups={numGroups}
        removedPlayers={removed}
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
      {removingPlayer &&
        <RemovePlayerModal
          players={[...scores.keys()]}
          removed={removed}
          onSave={saveRemoved}
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

export default ContractRummy