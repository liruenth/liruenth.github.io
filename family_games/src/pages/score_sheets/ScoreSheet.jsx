import { useState, useEffect } from 'react'
import ContractRummy from './contract_rummy/ContractRummy';
import MormonBridge from './mormon_bridge/MormonBridge';
import StartNewGame from './common/StartNewGame';

function mapReplacer(key, value) {
  if (value instanceof Map) {
    return Object.fromEntries(value);
  }
  return value;
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
  const [players, setPlayers] = useState(() => {
    // A restored score sheet is keyed by player name, so the roster is its keys
    if (scoreData) {
      return [...scoreData.keys()];
    }

    return []
  });
  
  useEffect(() => {
    console.log('savingScoreData');
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
        <StartNewGame onConfirm={setPlayers}/>
      : gameType === "CR" ?
        <ContractRummy players={players} scoreData={scoreData} setScoreData={setScoreData}/>
      : <MormonBridge players={players} setScoreData={setScoreData}/>
    }
    </>
  )
}

export default ScoreSheet