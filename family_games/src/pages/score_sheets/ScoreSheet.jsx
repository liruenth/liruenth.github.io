import { useState, useEffect } from 'react'
import ContractRummy from './contract_rummy/ContractRummy';
import MormonBridge from './mormon_bridge/MormonBridge';
import StartNewGame from './common/StartNewGame';
import { submitScores } from '../../api/routes';

function mapReplacer(key, value) {
  if (value instanceof Map) {
    return Object.fromEntries(value);
  }
  return value;
}

const GAME_ID_KEY = 'nextGameId';

// Every row of a submitted game shares this id, so it doubles as the id of the
// game itself. Kept in sessionStorage rather than a module variable so a refresh
// mid-game doesn't reset it and file the next game under one already used.
function currentGameId() {
  const saved = Number(sessionStorage.getItem(GAME_ID_KEY));
  return Number.isInteger(saved) && saved > 0 ? saved : 1;
}

// Counted on when the next game starts rather than when a submit lands, so a
// failed attempt can be retried under the same id rather than burning one.
function bumpGameId() {
  sessionStorage.setItem(GAME_ID_KEY, String(currentGameId() + 1));
}

function ScoreSheet() {
  const [scoreData, setScoreData] = useState(() => {
    let savedScoreData = sessionStorage.getItem('scoreData');
    if (!!savedScoreData) {
      const parsedFromObj = JSON.parse(savedScoreData, (key, value) => {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          return new Map(Object.entries(value));
        }
        return value;
      });
      return parsedFromObj;
    }

    return null
  });
  const [familyName, setFamilyName] = useState(() => {
    let savedFamilyName = sessionStorage.getItem('familyName');
    if (!!savedFamilyName) {
      return savedFamilyName;
    }

    return ''
  });

  // Cleared as well as saved, unlike the others: changing family resets this to
  // empty, and a stale name left behind would come back on the next refresh.
  useEffect(() => {
    if (!!familyName) {
      sessionStorage.setItem('familyName', familyName);
    } else {
      sessionStorage.removeItem('familyName');
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
      sessionStorage.setItem('scoreData', JSON.stringify(scoreData, mapReplacer));
    }
  }, [scoreData]);
  
  const [gameType, setGameType] = useState(() => {
    let savedGameType = sessionStorage.getItem('gameType');
    if (!!savedGameType) {
      return savedGameType;
    }

    return null
  });
  
  useEffect(() => {
    if (!!gameType) {
      sessionStorage.setItem('gameType', gameType);
    }
  }, [gameType]);

  // Sends the finished game to DynamoDB. The sheet is passed in rather than read
  // from state: the game holds the live copy, and ours only catches up once a
  // cell edit pushes it back here. Errors are left to the caller to show.
  const submitGame = (sheet) =>
    submitScores(familyName, gameType, sheet ?? scoreData, currentGameId());

  // Back to choosing a game, with the family kept so the next sheet doesn't ask
  // for it again. The effects above only write when their value is truthy, so
  // they leave the old sheet in sessionStorage rather than clearing it — hence
  // removing it here. Players aren't stored under a key of their own; they're
  // read back off the sheet, so they're cleared with it.
  const startNewGame = () => {
    sessionStorage.removeItem('scoreData');
    sessionStorage.removeItem('gameType');
    bumpGameId();

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
        <StartNewGame familyName={familyName} setFamilyName={setFamilyName} onConfirm={setPlayers}/>
      : gameType === "CR" ?
        <ContractRummy players={players} scoreData={scoreData} setScoreData={setScoreData} onSubmitGame={submitGame} onNewGame={startNewGame}/>
      : <MormonBridge players={players} setScoreData={setScoreData}/>
    }
    </>
  )
}

export default ScoreSheet