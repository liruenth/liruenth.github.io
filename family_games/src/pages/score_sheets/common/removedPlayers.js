/* Who's been taken out of play, held for the game that's being played.

   Kept per game rather than up in ScoreSheet, which doesn't know the action exists,
   under a key of the game's own so switching games can't hand one sheet the other's
   removals. Saved, because a refresh part-way through restores the sheet, and a
   roster that quietly came back to life around the restored scores would be worse
   than not restoring at all.

   Both sheets with the action use this: contract_rummy/ContractRummy.jsx and
   mormon_bridge/MormonBridge.jsx. */
import { useState, useEffect } from 'react'

/* The keys themselves, named here rather than in the sheets that use them, so
   anything clearing the desk between games can reach every one of them without
   writing the names out a second time — see helpers/editGame.js, which clears
   both on its way into and out of an edit. */
export const CR_REMOVED_KEY = 'crRemovedPlayers';
export const MB_REMOVED_KEY = 'mbRemovedPlayers';
export const REMOVED_KEYS = [CR_REMOVED_KEY, MB_REMOVED_KEY];

function readRemoved(storageKey) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
    return new Set(Array.isArray(saved) ? saved : []);
  } catch {
    return new Set();
  }
}

/* Returns the set, a setter to hand the modal, and the clear the game calls on its
   way into a new one — the removals belong to the game that's finishing, so they go
   with it rather than carrying over. */
export function useRemovedPlayers(storageKey) {
  const [removed, setRemoved] = useState(() => readRemoved(storageKey));

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify([...removed]));
  }, [storageKey, removed]);

  const clearRemoved = () => localStorage.removeItem(storageKey);

  return [removed, setRemoved, clearRemoved];
}
