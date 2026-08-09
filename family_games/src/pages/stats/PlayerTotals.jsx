import { useState } from 'react'
import PlayerBoard from './PlayerBoard'
import RecordModal from './RecordModal'

/* What each player has to show across every game currently on screen. Built from
   the filtered list, so narrowing to a date range answers for that range rather
   than quietly for all time.

   A board per game type, because that's the only way its columns can mean one
   thing each — see playerBoards in helpers/statsData.js.

   The record a reader opened is held here rather than in the board that raised
   it, so there's one dialog over the page however many boards are under it. */
function PlayerTotals({ boards }) {
  const [record, setRecord] = useState(null);

  return (
    <>
      {/* The same wrapper the stack of games uses, so two boards are spaced the
          way two games are — left bare they'd take the page's own gap as well. */}
      <div className="game-list">
        {boards.map((board) => (
          <PlayerBoard key={board.type} board={board} onRecord={setRecord} />
        ))}
      </div>

      {record && (
        <RecordModal
          heading={record.heading}
          games={record.games}
          onClose={() => setRecord(null)}
        />
      )}
    </>
  );
}

export default PlayerTotals
