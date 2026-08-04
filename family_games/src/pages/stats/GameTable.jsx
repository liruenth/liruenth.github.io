import './StatsTable.css'
import { formatDate, titleCase } from '../../helpers/statsData'
import { gameTypeLabel } from '../../helpers/gameTypes'

/* One finished game, as its sheet looked: players ranked, a column per round, and
   the total each finished on. Read-only, so a plain table rather than the grid the
   sheet itself uses — none of what that carries for editing applies here, and a
   grid apiece would fight a page that's a stack of them. */
function GameTable({ game }) {
  // Ranked winner first, whichever end of the totals this game counts from
  const { date, gameNumber, type, rounds, scores, totals, ranked, winners } = game;

  return (
    <article className="game-block">
      <h2>
        {formatDate(date)}{gameNumber ? ` · Game ${gameNumber}` : ''}
        <span className="game-type">{gameTypeLabel(type)}</span>
      </h2>

      <div className="stats-table-scroll">
        <table className="stats-table">
          <thead>
            <tr>
              <th scope="col" className="stats-table-name">Player</th>
              {rounds.map((round) => <th scope="col" key={round}>{round}</th>)}
              <th scope="col" className="stats-table-total">Total</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((player) => (
              <tr key={player} className={winners.includes(player) ? 'is-winner' : undefined}>
                <th scope="row" className="stats-table-name">{titleCase(player)}</th>
                {rounds.map((round) => {
                  // A round nobody reached was never written, and is blank on the
                  // sheet too — not a zero, which would read as having played it.
                  const score = scores.get(player).get(round);
                  return <td key={round}>{Number.isFinite(score) ? score : ''}</td>;
                })}
                <td className="stats-table-total">{totals.get(player)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

export default GameTable
