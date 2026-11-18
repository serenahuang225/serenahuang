/**
 * Tiny store for the energy orbs, shared by the 3D scene and the HUD. It
 * remembers what this visitor found in localStorage (a per-viewer
 * convenience; the game works fine without it).
 */
import { listenerSet, readSaved, writeSaved } from "./store-utils";

type OrbState = {
  /** Ids of the orbs caught so far (see ORBS in world-data). */
  found: string[];
  total: number;
  /** The most recent catch, for the HUD's little toast. */
  last: { id: string; at: number } | null;
};

const KEY = "underground-orbs-v1";
let state: OrbState = { found: [], total: 0, last: null };
const { emit, subscribe } = listenerSet();

function load(): string[] {
  const saved = readSaved(KEY);
  return Array.isArray(saved) ? saved.filter((x): x is string => typeof x === "string") : [];
}

export const orbStore = {
  /** Read what this browser found before (once the scene knows how many orbs there are). */
  init(total: number) {
    if (state.total === total) return;
    state = { found: load(), total, last: null };
    emit();
  },
  collect(id: string) {
    if (state.found.includes(id)) return;
    state = { ...state, found: [...state.found, id], last: { id, at: Date.now() } };
    writeSaved(KEY, state.found);
    emit();
  },
  /** Put every orb back (playing again to collect them faster). */
  reset() {
    state = { ...state, found: [], last: null };
    writeSaved(KEY, state.found);
    emit();
  },
  has(id: string) {
    return state.found.includes(id);
  },
  get() {
    return state;
  },
  subscribe,
};
