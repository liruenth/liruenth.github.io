import { useState, useEffect, useRef } from 'react'
import ConfirmModal from './ConfirmModal'

/* `autoPrompt` is the sheet saying the game looks finished — the last round is
   in for everyone still playing. What it's for is the submit nobody remembers to
   make: the scoring is over, the players have got up, and the sheet sits there
   until the next game clears it.

   The item itself is unchanged by it. This only opens the confirmation the item
   would have opened, so there's one thing to say no to and it's the same one. */
function SubmitGame({ scores, onSubmit, onSelect, onSubmitted, autoPrompt = false }) {
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showingReceipt, setShowingReceipt] = useState(false);

  /* Asked once and then never again, because a game that's been played to the
     end goes on looking finished: every correction made afterwards would ask
     again, and the answer to the second one is already known.

     Seeded with the flag rather than with false, so a sheet that arrives finished
     isn't asked at all — a game opened back up from the stats page to be edited
     is complete the moment it's on screen, and the ask would land before the
     reason for the edit had been typed. It's a prompt for a game finishing, and
     that one finished some time ago.

     A ref rather than state: nothing renders differently for having asked, and
     a new game gets a new sheet component, which is a new ref. */
  const prompted = useRef(autoPrompt);
  useEffect(() => {
    if (!autoPrompt || prompted.current) {
      return;
    }

    prompted.current = true;
    setConfirming(true);
  }, [autoPrompt]);

  const submit = async () => {
    setConfirming(false);
    setSubmitting(true);

    try {
      await onSubmit(scores);
      setSubmitted(true);
      setShowingReceipt(true);
    } catch (err) {
      // Alerted rather than shown in the menu: the menu is closed by the time
      // the request comes back, so a failure written into it would go unseen.
      // The item re-enables itself, so it's a retry rather than a dead end.
      window.alert(`Could not submit the game.\n\n${err.message}`);
    }

    setSubmitting(false);
  };

  /* One way out of the receipt, wired to both of its exits. The modal is a
     <dialog> opened with showModal, so Esc closes it through onClose alone and
     never through the confirm - and an edit that told the page it was finished
     from only one of the two would strand the reader on a sheet it had already
     filed. */
  const dismissReceipt = () => {
    setShowingReceipt(false);
    onSubmitted?.();
  };

  /* Submitting again is allowed: every row carries the game's id, so a second
     submit of the same game overwrites the rows the first one wrote rather than
     filing a duplicate. Which makes it the fix for a game submitted a round too
     early — keep scoring and send it again. Only a request already in flight
     disables the item, so the two can't race.

     The confirmation on the way out is the only sign a submit landed. The menu
     closes on the way in, so there's nowhere for the item itself to say so. */
  return (
    <>
      {confirming &&
        <ConfirmModal
          heading="Submit Game"
          message={submitted
            ? 'This game has already been submitted. Submit it again?'
            : 'Do you want to submit this game?'}
          confirmLabel={submitted ? 'Submit Again' : 'Submit'}
          onConfirm={submit}
          onClose={() => setConfirming(false)}
        />
      }
      {showingReceipt &&
        <ConfirmModal
          heading="Game Submitted"
          message="The game has been saved."
          confirmLabel="OK"
          showCancel={false}
          onConfirm={dismissReceipt}
          onClose={dismissReceipt}
        />
      }
      <button
        type="button"
        className="actions-menu-item"
        disabled={submitting}
        onClick={() => {
          setConfirming(true);
          onSelect();
        }}
      >
        {submitting ? 'Submitting...' : submitted ? 'Submit Again' : 'Submit Game'}
      </button>
    </>
  );
}

export default SubmitGame
