import './StatsTable.css'
import { titleCase } from '../../helpers/statsData'

/* What each player has to show across every game currently on screen. Built from
   the filtered list, so narrowing to a date range answers for that range rather
   than quietly for all time.

   Best and worst are whichever way the game counts — the low total wins Contract
   Rummy, the high one takes Mormon Bridge — so a board covering both states them
   in two units at once. Wins are the column that holds either way. */
function PlayerTotals({ totals }) {
  return (
    <article className="game-block">
      <h2>Player Totals</h2>

      <div className="stats-table-scroll">
        <table className="stats-table">
          <thead>
            <tr>
              <th scope="col" className="stats-table-name">Player</th>
              <th scope="col">Games</th>
              <th scope="col">Wins</th>
              <th scope="col">Average</th>
              <th scope="col" title="Best total, whichever way the game counts">Best</th>
              <th scope="col" title="Worst total, whichever way the game counts">Worst</th>
              <th scope="col" className="stats-table-total">Points</th>
            </tr>
          </thead>
          <tbody>
            {totals.map((stats) => (
              <tr key={stats.player}>
                <th scope="row" className="stats-table-name">{titleCase(stats.player)}</th>
                <td>{stats.gamesPlayed}</td>
                <td>{stats.wins}</td>
                <td>{stats.avgTotal}</td>
                <td>{stats.bestGame}</td>
                <td>{stats.worstGame}</td>
                <td className="stats-table-total">{stats.totalPoints}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

export default PlayerTotals
