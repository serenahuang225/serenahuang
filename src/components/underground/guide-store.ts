/**
 * The field guide: which entries you've discovered, and whether the book is
 * open. Discoveries are remembered in this browser (a per-viewer convenience).
 */

import { asRecord, listenerSet, readSaved, writeSaved } from "./store-utils";

/** Every entry in the field guide. */
export type GuideId =
  | "puffkin"
  | "snail"
  | "fish"
  | "potion-color"
  | "potion-fluff"
  | "potion-glow"
  | "potion-bounce"
  | "potion-fly"
  | "greatcap"
  | "puffball"
  | "logs"
  | "deeplake"
  | "tunnel"
  | "cave"
  | "falls"
  | "bridge"
  | "crystals"
  | "orbs";

type GuideState = {
  open: boolean;
  found: GuideId[];
  /** Names of the colour potions tried (the Potions page lists them). */
  colors: string[];
  /** The latest discovery, for the "new entry" toast. */
  last: { id: GuideId; at: number } | null;
  /** Entry to show when the book opens (e.g. the one just discovered). */
  focus: GuideId | null;
};

const KEY = "underground-guide-v1";
let state: GuideState = { open: false, found: [], colors: [], last: null, focus: null };
let loaded = false;
const { emit, subscribe } = listenerSet();

const save = () => writeSaved(KEY, { found: state.found, colors: state.colors });

export const guideStore = {
  load() {
    if (loaded) return;
    loaded = true;
    const p = asRecord(readSaved(KEY));
    state = {
      ...state,
      found: Array.isArray(p.found) ? (p.found as GuideId[]) : [],
      colors: Array.isArray(p.colors) ? (p.colors as string[]) : [],
    };
    emit();
  },
  get() {
    return state;
  },
  subscribe,
  isOpen() {
    return state.open;
  },
  has(id: GuideId) {
    return state.found.includes(id);
  },
  /** Mark an entry found (ignored until the saved guide has loaded, so it can't be overwritten). */
  discover(id: GuideId) {
    if (!loaded || state.found.includes(id)) return;
    state = { ...state, found: [...state.found, id], last: { id, at: Date.now() }, focus: id };
    save();
    emit();
  },
  tryColor(name: string) {
    if (state.colors.includes(name)) return;
    state = { ...state, colors: [...state.colors, name] };
    save();
    emit();
  },
  setOpen(open: boolean) {
    if (state.open === open) return;
    state = { ...state, open };
    emit();
  },
  toggle() {
    guideStore.setOpen(!state.open);
  },
  clearFocus() {
    if (!state.focus) return;
    state = { ...state, focus: null };
    emit();
  },
  reset() {
    state = { ...state, found: [], colors: [], last: null, focus: null };
    save();
    emit();
  },
};
