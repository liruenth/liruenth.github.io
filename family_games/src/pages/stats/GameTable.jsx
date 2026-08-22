import './StatsTable.css'
import { formatDate, titleCase } from '../../helpers/statsData'
import { gameTypeLabel, roundCellFor } from '../../helpers/gameTypes'
import { bidLean } from '../../helpers/mormonBridge'
import { runningTotals } from '../../helpers/scoring'
import RoundWedges from '../score_sheets/mormon_bridge/RoundWedges'
import RoundSplit from './RoundSplit'

/* The one glyph in the app that isn't a character. The house style is HTML
   entities — the actions menu's ellipsis, the sidebar's times — but a pencil
   isn't in a range that's universally fonted the way those are: U+270E falls back
   to a symbol face on Windows and gets substituted for an emoji on some phones, so
   neither its size nor its colour can be relied on next to the heading it sits in.
   Drawn instead, in the text's own colour, so it matches whatever it's beside. */
function PencilIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M11.5 1.9a1.4 1.4 0 0 1 2 2L5.4 12l-2.9.6.6-2.9z" />
      <path d="M10.3 3.1 12.9 5.7" />
    </svg>
  );
}

/* One finished game, as its sheet looked: a column per round and the total each
   player finished on. Read-only, so a plain table rather than the grid the sheet
   itself uses — none of what that carries for editing applies here, and a grid
   apiece would fight a page that's a stack of them.

   The round cell is the one thing the games don't share, and neither kind is a
   plain number in a box. Mormon Bridge's holds a bid and a took as well as the
   score, and it's drawn with the same three triangles the sheet draws — borrowed
   from that game's directory rather than redrawn here, since a stats table that
   read differently from the sheet would be a different game to look at. A game
   that scores a plain number gets the two-piece cell instead: the round's score
   above the diagonal and the total to that point below it, which is the one thing
   a finished game can say that its sheet couldn't. */
function GameTable({ game, onEdit }) {
  // Row order is the game's own: ranked, or the order it was played in
  const { date, gameNumber, type, rounds, scores, totals, order, winners, unfinished } = game;
  const bidTook = roundCellFor(type) === 'bid-took';
  /* Both kinds of round cell fill their cell to its edges, so both take the
     padding off it — but only the split one has a heading that isn't the cell
     shape, so the two are named apart rather than sharing the one class. */
  const headClass = bidTook ? 'stats-round-cell' : 'stats-split-head';
  const cellClass = bidTook ? 'stats-round-cell' : 'stats-split-cell';

  return (
    <article className="game-block">
      <h2>
        {formatDate(date)}{gameNumber ? ` · Game ${gameNumber}` : ''}
        <span className="game-type">{gameTypeLabel(type)}</span>
        {/* Nobody played the last round, so no row below is a winning one. Said
            here rather than left to be inferred from a table with nothing
            highlighted in it, which reads the same as a game that was drawn. */}
        {unfinished && <span className="game-unfinished">Unfinished</span>}
        {/* Shown on hover, and on focus so it can be reached without a pointer —
            see .game-edit in StatsTable.css. Inside the heading rather than beside
            it because that's what it names, which does mean its label is read as
            part of the heading: hence a short one that says which game. */}
        {onEdit && (
          <button
            type="button"
            className="game-edit"
            aria-label={`Edit ${formatDate(date)}${gameNumber ? ` game ${gameNumber}` : ''}`}
            onClick={() => onEdit(game)}
          >
            <PencilIcon />
          </button>
        )}
      </h2>

      <div className="stats-table-scroll">
        <table className="stats-table">
          <thead>
            <tr>
              <th scope="col" className="stats-table-name">Player</th>
              {rounds.map((round) => (
                <th scope="col" key={round} className={headClass}>
                  {/* The round number is coloured where the table didn't bid the
                      tricks that were on it — see bidLean. Every player is offered,
                      including any who was removed: a round they were already out
                      of was never written, so they hold no cell in it to count. */}
                  {bidTook
                    ? (
                      <RoundWedges
                        heading
                        bid="bid"
                        took="took"
                        score={round}
                        lean={bidLean(order, scores, round)}
                      />
                    )
                    : (
                      <>
                        {round}
                        {/* Which half of the cells below is which. On every column
                            rather than said once, the same as the bid and took
                            labels above: the table scrolls sideways, so a legend
                            stated in one column would scroll out of the game. */}
                        <span className="stats-split-legend">Score / Total</span>
                      </>
                    )}
                </th>
              ))}
              <th scope="col" className="stats-table-total">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.map((player) => {
              const played = scores.get(player);
              /* Where this player stood at the end of each round they played.
                 Worked out once per row rather than per cell, and over the game's
                 own round list so the rounds add up in the order they were played
                 — which for Mormon Bridge isn't the order the type lists them in.
                 Not needed there, though: its cell holds three numbers already,
                 and has no room for a fourth. */
              const running = bidTook ? null : runningTotals(played, rounds);

              return (
                <tr key={player} className={winners.includes(player) ? 'is-winner' : undefined}>
                  <th scope="row" className="stats-table-name">{titleCase(player)}</th>
                  {rounds.map((round) => {
                    // A round nobody reached was never written, and is blank on the
                    // sheet too — not a zero, which would read as having played it.
                    const cell = played.get(round);

                    if (bidTook) {
                      return (
                        <td key={round} className={cellClass}>
                          <RoundWedges bid={cell?.bid} took={cell?.took} score={cell?.score} />
                        </td>
                      );
                    }

                    return (
                      <td key={round} className={cellClass}>
                        <RoundSplit score={cell} total={running.get(round)} />
                      </td>
                    );
                  })}
                  <td className="stats-table-total">{totals.get(player)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </article>
  );
}

export default GameTable
