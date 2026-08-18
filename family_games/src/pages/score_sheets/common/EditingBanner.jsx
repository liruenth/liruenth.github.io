import { formatDate, titleCase } from '../../../helpers/statsData'
// For `.notice`, which lives with the other things the sheet says up top.
import './StartNewGame.css'

/* Says which game the sheet is holding open.

   It used to let the family be corrected too. The family is part of the id now,
   so it isn't a thing an edit can change: a game written under another family is
   a different game, filed under a different id, and the original would still be
   sitting where it was. Correcting a family means editing the game under the
   family it is filed with, or scoring it again under the right one. */
function EditingBanner({ game }) {
  return (
    <p className="notice is-important">
      Editing {titleCase(game.family)} · {formatDate(game.date)} · Game {game.number}.
      Submitting writes it back over that same game.
    </p>
  );
}

export default EditingBanner
