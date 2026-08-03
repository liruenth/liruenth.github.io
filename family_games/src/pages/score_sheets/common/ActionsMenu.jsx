import { useEffect, useRef, useState } from 'react'
import './ActionsMenu.css'

/* The sheet's actions, pinned opposite the nav hamburger.

   Children are given the closer and render their own buttons, so an item that
   carries state — Submit Game tracks a request in flight — owns it rather than
   handing it up here. That state is also why the panel stays mounted while
   closed and hides in CSS: unmounting it would forget mid-submit that a submit
   was ever started. */
function ActionsMenu({ children }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    // mousedown rather than click: a menu item that unmounts what was clicked
    // would otherwise leave the click landing on nothing, reading as outside.
    const closeOnOutsideClick = (event) => {
      if (!menuRef.current.contains(event.target)) setOpen(false);
    };

    window.addEventListener('keydown', closeOnEscape);
    window.addEventListener('mousedown', closeOnOutsideClick);
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('mousedown', closeOnOutsideClick);
    };
  }, [open]);

  return (
    <div className="actions-menu" ref={menuRef}>
      <button
        type="button"
        className="actions-menu-trigger"
        aria-label="Actions"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls="actions-menu-panel"
        onClick={() => setOpen((wasOpen) => !wasOpen)}
      >
        &#8942;
      </button>

      <div
        id="actions-menu-panel"
        className={`actions-menu-panel ${open ? 'is-open' : ''}`}
      >
        {children(() => setOpen(false))}
      </div>
    </div>
  );
}

export default ActionsMenu
