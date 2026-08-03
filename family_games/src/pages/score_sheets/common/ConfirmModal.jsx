import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import './ConfirmModal.css'

/* Yes/no confirmation for an action that isn't easily undone — submitting a
   game, starting a new one. Also does duty as a plain acknowledgement, with
   showCancel off: same shell, nothing to decide. */
function ConfirmModal({
  heading,
  message,
  confirmLabel,
  onConfirm,
  onClose,
  showCancel = true,
}) {
  const dialogRef = useRef(null);

  // showModal (rather than the open attribute) is what gives us the backdrop,
  // the focus trap, and Esc-to-close for free.
  useEffect(() => {
    dialogRef.current.showModal();
  }, []);

  /* Portalled to the body because one of the callers lives inside the actions
     menu, and a closed menu is hidden with visibility — which descendants
     inherit, top layer or not. Rendered from the body it can't be hidden by
     whichever button happened to open it.

     Cancel is left first so it takes the opening focus — what sits behind the
     confirm button isn't something to do on a stray Enter. An acknowledgement
     has nothing to guard against, so there the one button taking focus is what
     you want. */
  return createPortal(
    <dialog ref={dialogRef} className="confirm-modal" onClose={onClose}>
      <h2>{heading}</h2>
      <p>{message}</p>
      <div className="modal-actions">
        {showCancel && <button type="button" onClick={onClose}>Cancel</button>}
        <button type="button" onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </dialog>,
    document.body
  );
}

export default ConfirmModal
