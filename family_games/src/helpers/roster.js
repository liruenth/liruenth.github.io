/*
Changing who's on a sheet that's already being played: what they're called, and
what order they sit in.

A sheet is a Map of player name to their rounds, so the name is the key and the
row order is the key order — which means both of those edits are the same edit,
a rebuild of the outer Map. Hence one helper for the pair rather than one each.

Kept out of helpers/scoring.js, which is the rules of the games: neither of these
is one. Both sheets use them — contract_rummy/ContractRummy.jsx renames,
mormon_bridge/MormonBridge.jsx renames and reseats — through
common/PlayersModal.jsx, which is what hands over the entries below.

`entries` is `[{ original, name }]` in the order the rows are to end up in:
`original` is the key the sheet has now, `name` the one it's to have. A row left
alone says the same name twice, which is what makes one list cover both edits.
*/

/* The sheet rebuilt under the new names, in the new order.

   Inner Maps are carried over by reference, so no score is copied and none can
   be lost — the same contract sortedByTotal in scoring.js keeps when it reorders
   a sheet. Which also means the grid goes on drawing off the very cell objects it
   was handed, so a rename doesn't disturb a cell being typed into.

   A name with no row behind it is dropped rather than given an empty one: it
   would be a player who left the sheet between the modal opening and its being
   saved, and inventing a row for them would put them back. */
export function renamePlayers(scores, entries) {
  return new Map(
    entries
      .filter(({ original }) => scores.has(original))
      .map(({ original, name }) => [name, scores.get(original)])
  );
}

/* Who's out of play, under the new names.

   Removals are held as a set of names (common/removedPlayers.js), so they have to
   be re-keyed alongside the sheet or a renamed player quietly comes back into the
   game — their row would be the one thing on the sheet that no longer matches the
   set that closed it.

   Read through in one pass off the old names rather than renamed in place, so two
   players swapping names don't chase each other through the set. Anyone the
   entries don't mention is kept as they are, which is how a set saved under a name
   that's since left the sheet survives being read past. */
export function renameRemoved(removed, entries) {
  const renamedTo = new Map(entries.map(({ original, name }) => [original, name]));
  return new Set([...removed].map((player) => renamedTo.get(player) ?? player));
}
