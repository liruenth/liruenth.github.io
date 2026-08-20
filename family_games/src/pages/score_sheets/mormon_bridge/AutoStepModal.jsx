import { useState, useEffect, useMemo, useRef } from 'react'
import {
  activePlayers,
  autoSteps,
  bidTally,
  clampToRound,
  firstUnfinishedRound,
  nextBlankStep,
  setCellValue,
  tricksIn
} from '../../../helpers/mormonBridge'
import './AutoStepModal.css'

/* Scoring a game the way it's actually played: one prompt at a time, round the
   table, so whoever is keeping score never has to find a cell on the sheet.

   Two phases in one dialog rather than two dialogs — asking who leads and then
   asking for their bid is one action, and closing a modal to open another one
   flashes the backdrop in between.

   Every Next writes straight through to the sheet, so there's nothing held back
   to lose: Stop, Esc and the backdrop all just stop asking. */
function AutoStepModal({ scores, cols, removed, onEntered, onClose }) {
  const dialogRef = useRef(null);
  const inputRef = useRef(null);

  const players = useMemo(() => activePlayers(scores, removed), [scores, removed]);
  const fromRound = useMemo(
    () => firstUnfinishedRound(cols, players, scores),
    [cols, players, scores]
  );

  // Set once Start is pressed, and what tells the two phases apart.
  const [steps, setSteps] = useState(null);
  const [index, setIndex] = useState(-1);
  const [leader, setLeader] = useState(0);
  const [entered, setEntered] = useState('0');

  // showModal (rather than the open attribute) is what gives us the backdrop,
  // the focus trap, and Esc-to-close for free.
  useEffect(() => {
    dialogRef.current.showModal();
  }, []);

  const step = steps && index >= 0 ? steps[index] : null;

  /* Put the cursor back after every advance, with the 0 selected so the next
     digit typed replaces it rather than landing beside it. That's what lets a
     whole sheet go in as digit, Enter, digit, Enter: Enter submits the form
     without moving focus, and this covers the case where Next was clicked
     instead, which does move it. */
  useEffect(() => {
    if (step) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [step]);

  const start = (e) => {
    e.preventDefault();
    const built = autoSteps(cols, players, fromRound, leader);
    const first = nextBlankStep(built, scores);
    if (first === -1) {
      onClose();
      return;
    }

    setSteps(built);
    setIndex(first);
    setEntered('0');
  };

  /* Never blank, so Next always has something to write and never has to be
     disabled — nought is a real bid, and the commonest one. Normalising on the
     way in also drops the leading zero left over from the reset, so typing 3 into
     a field showing 0 reads 3 rather than 03.

     Clamping while typing is safe here in a way it isn't in the sheet's own
     cells: the round is the ceiling, and no prefix of a valid entry can be over
     it — 1 then 10 in round ten passes through untouched. */
  const change = (e) => {
    const clamped = clampToRound(e.target.value, step.round);
    setEntered(clamped === '' ? '0' : clamped);
  };

  const next = (e) => {
    e.preventDefault();
    setCellValue(scores, step.player, step.round, step.field, clampToRound(entered, step.round));
    onEntered();

    const following = nextBlankStep(steps, scores, index + 1);
    if (following === -1) {
      onClose();
      return;
    }

    setIndex(following);
    setEntered('0');
  };

  // Nothing to ask for: every round is in, or there's nobody left in the game.
  if (!step && (fromRound === -1 || players.length === 0)) {
    return (
      <dialog ref={dialogRef} className="auto-step-modal" onClose={onClose}>
        <h2>Auto Step</h2>
        <p className="modal-hint">
          {players.length === 0
            ? 'Every player has been removed, so there is nothing left to enter.'
            : 'Every round is filled in. There is nothing left to enter.'}
        </p>
        <div className="modal-actions">
          <button type="button" onClick={onClose}>Close</button>
        </div>
      </dialog>
    );
  }

  if (!step) {
    return (
      <dialog ref={dialogRef} className="auto-step-modal" onClose={onClose}>
        <form onSubmit={start}>
          <h2>Auto Step</h2>
          <p className="modal-hint">
            Starting on round {cols[fromRound]}. Who bids first?
          </p>
          <ul className="player-list">
            {players.map((player, seat) => (
              <li key={player}>
                <label className={seat === leader ? 'player selected' : 'player'}>
                  <input
                    type="radio"
                    name="auto-step-leader"
                    checked={seat === leader}
                    onChange={() => setLeader(seat)}
                  />
                  {player}
                </label>
              </li>
            ))}
          </ul>
          <div className="modal-actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit">Start</button>
          </div>
        </form>
      </dialog>
    );
  }

  const tally = step.field === 'bid' ? bidTally(players, scores, step.round) : null;

  /* What they called for, to ask what they got against. The bids all go in before
     any took does, so by the time it's asked for there is one — bar a sheet
     somebody has been back into by hand and blanked, which falls back to asking
     the plain question rather than asking it against nothing. */
  const called = step.field === 'took' ? scores.get(step.player)?.get(step.round)?.bid : '';
  const heading = step.field === 'bid'
    ? `Round ${step.round} - ${step.player}'s bid`
    : called === '' || called === null || called === undefined
      ? `Round ${step.round} - ${step.player} took`
      : `Round ${step.round} - ${step.player} bid ${called} and took...`;

  return (
    <dialog ref={dialogRef} className="auto-step-modal" onClose={onClose}>
      <form onSubmit={next}>
        <h2>{heading}</h2>
        {/* Only the bidding needs the arithmetic: what's left to call for, and
            how many are still to call — the one being asked included. */}
        {tally && <p className="auto-step-tally">{tally.left} left for {tally.remaining}</p>}
        <input
          ref={inputRef}
          className="auto-step-input"
          type="number"
          inputMode="numeric"
          enterKeyHint="next"
          min="0"
          max={tricksIn(step.round)}
          step="1"
          aria-label={step.field === 'bid'
            ? `${step.player} bid, round ${step.round}`
            : `${step.player} took, round ${step.round}`}
          value={entered}
          onChange={change}
        />
        <div className="modal-actions">
          <button type="button" onClick={onClose}>Stop</button>
          <button type="submit">Next</button>
        </div>
      </form>
    </dialog>
  );
}

export default AutoStepModal
