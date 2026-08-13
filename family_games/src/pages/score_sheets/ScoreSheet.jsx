import { useState, useEffect } from 'react'
import ContractRummy from './contract_rummy/ContractRummy';
import MormonBridge from './mormon_bridge/MormonBridge';
import StartNewGame from './common/StartNewGame';
import { submitScores } from '../../api/routes';
import {
  currentGameId,
  bumpGameId,
  gameSubmitted,
  markGameSubmitted
} from '../../helpers/gameId';
import { GROUPS_KEY } from '../../helpers/groups';

/* A sheet is Maps inside Maps, which JSON has no notion of, so each one is
   written out marked as what it is and read back by that mark.

   Marked rather than guessed at: a Mormon Bridge round is an object of its own —
   a bid, a took and a score — and a reviver that turned every object it met into
   a Map would swallow it along with the two it's meant to catch. */
const MAP_MARK = '__map';

function mapReplacer(key, value) {
  return value instanceof Map ? { [MAP_MARK]: [...value] } : value;
}

function mapReviver(key, value) {
  return value && Array.isArray(value[MAP_MARK]) ? new Map(value[MAP_MARK]) : value;
}

/* A sheet saved before the marks above were written is unreadable now. There's
   nothing to migrate — it's a game in progress, not history, and history lives in
   DynamoDB — so it's dropped and the sheet starts over rather than restoring
   something it can't use. */
function restoreScoreData() {
  const saved = localStorage.getItem('scoreData');
  if (!saved) {
    return null;
  }

  try {
    const parsed = JSON.parse(saved, mapReviver);
    return parsed instanceof Map ? parsed : null;
  } catch {
    return null;
  }
}

function ScoreSheet() {
  const [scoreData, setScoreData] = useState(restoreScoreData);
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
      localStorage.setItem('scoreData', JSON.stringify(scoreData, mapReplacer));
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

  // Sends the finished game to DynamoDB. The sheet is passed in rather than read
  // from state: the game holds the live copy, and ours only catches up once a
  // cell edit pushes it back here. Errors are left to the caller to show — the
  // rejection carries through, so a failed submit leaves the id unclaimed.
  const submitGame = async (sheet) => {
    await submitScores(familyName, gameType, sheet ?? scoreData, currentGameId());
    markGameSubmitted();
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
    localStorage.removeItem('scoreData');
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
        <ContractRummy players={players} scoreData={scoreData} setScoreData={setScoreData} onSubmitGame={submitGame} onNewGame={startNewGame}/>
      : <MormonBridge players={players} scoreData={scoreData} setScoreData={setScoreData} onSubmitGame={submitGame} onNewGame={startNewGame}/>
    }
    </>
  )
}

export default ScoreSheet