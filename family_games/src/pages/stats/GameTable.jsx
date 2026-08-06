import './StatsTable.css'
import { formatDate, titleCase } from '../../helpers/statsData'
import { gameTypeLabel, roundCellFor } from '../../helpers/gameTypes'
import RoundWedges from '../score_sheets/mormon_bridge/RoundWedges'

/* One finished game, as its sheet looked: a column per round and the total each
   player finished on. Read-only, so a plain table rather than the grid the sheet
   itself uses — none of what that carries for editing applies here, and a grid
   apiece would fight a page that's a stack of them.

   The round cell is the one thing the games don't share. Mormon Bridge's holds a
   bid and a took as well as the score, and it's drawn with the same three
   triangles the sheet draws — borrowed from that game's directory rather than
   redrawn here, since a stats table that read differently from the sheet would be
   a different game to look at. */
function GameTable({ game }) {
  // Row order is the game's own: ranked, or the order it was played in
  const { date, gameNumber, type, rounds, scores, totals, order, winners } = game;
  const bidTook = roundCellFor(type) === 'bid-took';
  const roundCellClass = bidTook ? 'stats-round-cell' : undefined;

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
              {rounds.map((round) => (
                <th scope="col" key={round} className={roundCellClass}>
                  {bidTook
                    ? <RoundWedges heading bid="bid" took="took" score={round} />
                    : round}
                </th>
              ))}
              <th scope="col" className="stats-table-total">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.map((player) => (
              <tr key={player} className={winners.includes(player) ? 'is-winner' : undefined}>
                <th scope="row" className="stats-table-name">{titleCase(player)}</th>
                {rounds.map((round) => {
                  // A round nobody reached was never written, and is blank on the
                  // sheet too — not a zero, which would read as having played it.
                  const cell = scores.get(player).get(round);

                  if (bidTook) {
                    return (
                      <td key={round} className={roundCellClass}>
                        <RoundWedges bid={cell?.bid} took={cell?.took} score={cell?.score} />
                      </td>
                    );
                  }

                  return <td key={round}>{Number.isFinite(cell) ? cell : ''}</td>;
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
