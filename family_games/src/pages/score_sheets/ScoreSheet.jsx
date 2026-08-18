import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom';
import ContractRummy from './contract_rummy/ContractRummy';
import MormonBridge from './mormon_bridge/MormonBridge';
import StartNewGame from './common/StartNewGame';
import EditingBanner from './common/EditingBanner';
import { submitScores } from '../../api/routes';
import {
  currentGameId,
  bumpGameId,
  gameSubmitted,
  markGameSubmitted
} from '../../helpers/gameId';
import { GROUPS_KEY } from '../../helpers/groups';
import { saveSheet, restoreSheet, clearSheet } from '../../helpers/sheetStorage';
import { editingGame, stopEditing, finishEditing } from '../../helpers/editGame';

function ScoreSheet() {
  const navigate = useNavigate();
  const [scoreData, setScoreData] = useState(restoreSheet);

  /* Whether what's on the sheet is a finished game opened back up — and if it is,
     the id and date it has to be written back under. Handed over by the stats page
     through storage, so a refresh mid-edit is still an edit.

     Only ever an edit of the sheet that's actually here. A session left behind
     without one would otherwise be picked up by whatever game got started next,
     and that game would be filed on top of the one this names. */
  const [editing, setEditing] = useState(() => {
    if (scoreData) {
      return editingGame();
    }

    stopEditing();
    return null;
  });
  const [familyName, setFamilyName] = useState(() => {
    let savedFamilyName = localStorage.getItem('familyName');
    if (!!savedFamilyName) {
      return savedFamilyName;
    }

    return ''
  });

  // Cleared as well as saved, unlike the others: changing family resets this to
  // empty, and a stale name left behind would come back on the next refresh.
  useEffect(() => {
    if (!!familyName) {
      localStorage.setItem('familyName', familyName);
    } else {
      localStorage.removeItem('familyName');
    }
  }, [familyName]);

  const [players, setPlayers] = useState(() => {
    // A restored score sheet is keyed by player name, so the roster is its keys
    if (scoreData) {
      return [...scoreData.keys()];
    }

    return []
  });
  
  useEffect(() => {
    if (!!scoreData) {
      saveSheet(scoreData);
    }
  }, [scoreData]);
  
  const [gameType, setGameType] = useState(() => {
    let savedGameType = localStorage.getItem('gameType');
    if (!!savedGameType) {
      return savedGameType;
    }

    return null
  });
  
  useEffect(() => {
    if (!!gameType) {
      localStorage.setItem('gameType', gameType);
    }
  }, [gameType]);

  /* Sends the finished game to DynamoDB. The sheet is passed in rather than read
     from state: the game holds the live copy, and ours only catches up once a
     cell edit pushes it back here. Errors are left to the caller to show — the
     rejection carries through, so a failed submit leaves the id unclaimed.

     An edit goes back to where it came from: the id and date it was filed under
     rather than the ones the day is counting, and replacing what is there rather
     than only writing over the rows it happens to share — a round cleared on the
     sheet has to be a round cleared in the history, or the two disagree.

     The day's id isn't marked as used by an edit, because nothing has been filed
     under it: marking it would have the next new game skip a number for a game
     that was never played. */
  const submitGame = async (sheet) => {
    const scores = sheet ?? scoreData;

    if (editing) {
      await submitScores(editing.family, gameType, scores, editing.number, {
        date: editing.date,
      });
      return;
    }

    await submitScores(familyName, gameType, scores, currentGameId());
    markGameSubmitted();
  };

  // The edit is filed. Clearing the desk here rather than leaving it is what makes
  // the sheet open on a new game next time instead of on one already written back.
  const finishEdit = () => {
    finishEditing();
    navigate('/stats');
  };

  // Back to choosing a game, with the family kept so the next sheet doesn't ask
  // for it again. The effects above only write when their value is truthy, so
  // they leave the old sheet in storage rather than clearing it — hence
  // removing it here. Players aren't stored under a key of their own; they're
  // read back off the sheet, so they're cleared with it. Groups are written by the
  // roster screen and by Contract Rummy but cleared here with everything else, so
  // the next game doesn't inherit the last one's split.
  //
  // The id is only counted on if something was filed under it. A game abandoned
  // without being submitted leaves it free, so the next one takes it rather than
  // opening a gap in the day's numbering.
  const startNewGame = () => {
    // Whatever was open stops being an edit of anything: what follows is a game of
    // its own and is filed under the day's own id.
    stopEditing();
    setEditing(null);

    clearSheet();
    localStorage.removeItem('gameType');
    localStorage.removeItem(GROUPS_KEY);

    if (gameSubmitted()) {
      bumpGameId();
    }

    setScoreData(null);
    setGameType(null);
    setPlayers([]);
  };

   return (

    <>
    {/* Ahead of the sheet rather than inside either game's own screen: what it
        says is true of both, and the grid measures where it starts on the first
        render either way. */}
    {editing && players.length > 0 &&
      <EditingBanner game={editing}/>
    }
    {
      !gameType ?
        <section id="center">
          <div>
            <h1>Choose Game</h1>
          </div>
          <button
            type="button"
            className="rummy"
            onClick={() => setGameType("CR")}
          >
            Contract Rummy
          </button>
          <button
            type="button"
            className="rummy"
            onClick={() => setGameType("MB")}
          >
            Mormon Bridge
          </button>
        </section>
      : players.length === 0 ?
        <StartNewGame gameType={gameType} familyName={familyName} setFamilyName={setFamilyName} onConfirm={setPlayers}/>
      : gameType === "CR" ?
        <ContractRummy players={players} scoreData={scoreData} setScoreData={setScoreData} onSubmitGame={submitGame} onSubmitted={editing ? finishEdit : undefined} onNewGame={startNewGame}/>
      : <MormonBridge players={players} scoreData={scoreData} setScoreData={setScoreData} onSubmitGame={submitGame} onSubmitted={editing ? finishEdit : undefined} onNewGame={startNewGame}/>
    }
    </>
  )
}

export default ScoreSheet