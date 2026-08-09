import './StatsTable.css'
import { titleCase } from '../../helpers/statsData'
import { gameTypeLabel, roundCellFor } from '../../helpers/gameTypes'

/* One game's board: a row per player, and what they have to show for every game
   of that type on screen.

   The five record columns are the ones worth looking at rather than only
   reading, so each is the way into the game it was set in — see RecordCell at
   the foot of this file.

   Which columns there are is the one thing the games don't share. A round that
   holds a bid and a took has two more records in it than a round that's a score
   on its own, so the same switch GameTable uses to draw a round decides here
   whether those columns exist at all. */
function PlayerBoard({ board, onRecord }) {
  const { type, rows } = board;
  const bidTook = roundCellFor(type) === 'bid-took';

  return (
    <article className="game-block">
      <h2>{gameTypeLabel(type)}</h2>

      <div className="stats-table-scroll">
        <table className="stats-table">
          <thead>
            <tr>
              <th scope="col" className="stats-table-name">Player</th>
              <th scope="col">Played</th>
              <th scope="col">Wins</th>
              <th scope="col" title="Games won as a share of games played">Win %</th>
              <th scope="col" title="Average total across those games">Average</th>
              <th scope="col" title="Their lowest total in a single game">Lowest Total</th>
              <th scope="col" title="Their highest total in a single game">Highest Total</th>
              {/* Named for what it is rather than for whether it's good news:
                  the biggest round of Mormon Bridge is the best one, and the
                  biggest round of Contract Rummy is the worst. */}
              <th scope="col" title="The most they ever scored in a single round">
                Highest Score
              </th>
              {bidTook && (
                <>
                  <th scope="col" title="The most tricks they ever bid for in a round">
                    Highest Bid
                  </th>
                  <th scope="col" title="The most tricks they ever took in a round">
                    Highest Took
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ player, gamesPlayed, wins, winRate, avgTotal, records }) => (
              <tr key={player}>
                <th scope="row" className="stats-table-name">{titleCase(player)}</th>
                <td>{gamesPlayed}</td>
                <td>{wins}</td>
                <td>{Math.round(winRate * 100)}%</td>
                <td>{avgTotal}</td>
                <RecordCell
                  record={records.lowestGameTotal}
                  player={player}
                  label="Lowest Total"
                  onRecord={onRecord}
                />
                <RecordCell
                  record={records.highestGameTotal}
                  player={player}
                  label="Highest Total"
                  onRecord={onRecord}
                />
                <RecordCell
                  record={records.highestScore}
                  player={player}
                  label="Highest Score"
                  onRecord={onRecord}
                />
                {bidTook && (
                  <>
                    <RecordCell
                      record={records.highestBid}
                      player={player}
                      label="Highest Bid"
                      onRecord={onRecord}
                    />
                    <RecordCell
                      record={records.highestTook}
                      player={player}
                      label="Highest Took"
                      onRecord={onRecord}
                    />
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

/* A record and the way to the games it was set in.

   Whose record it is and what it was travel with the games, because the sheet
   that opens can't say either: a rebuilt game marks the winner's row and nothing
   else, so a table of five players over ten rounds doesn't show which number was
   the one clicked. The heading is where that's said.

   A record of zero is a record — a hand bid at nothing, a round taken nothing in
   — so the cell asks whether there's a value, not whether the value is truthy. */
function RecordCell({ record, player, label, onRecord }) {
  if (record.value === null) {
    return <td />;
  }

  return (
    <td className="stats-record-cell">
      <button
        type="button"
        className="stats-record"
        onClick={() => onRecord({
          heading: `${titleCase(player)} · ${label} · ${record.value}`,
          games: record.games,
        })}
      >
        {record.value}
      </button>
    </td>
  );
}

export default PlayerBoard
