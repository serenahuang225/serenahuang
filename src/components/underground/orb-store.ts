/**
 * Tiny store for the light orbs, shared by the 3D scene and the HUD. It
 * remembers what this visitor found in localStorage (a per-viewer
 * convenience; the game works fine without it).
 */

type OrbState = { found: string[]; total: number; last: { id: string; at: number } | null };

const KEY = "underground-orbs-v1";
let state: OrbState = { found: [], total: 0, last: null };
const listeners = new Set<() => void>();

function load(): string[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function save() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state.found));
  } catch {
    // storage blocked: progress just won't survive a reload
  }
}

function emit() {
  for (const l of listeners) l();
}

export const orbStore = {
  init(total: number) {
    if (state.total === total) return;
    state = { found: load(), total, last: null };
    emit();
  },
  collect(id: string) {
    if (state.found.includes(id)) return;
    state = { ...state, found: [...state.found, id], last: { id, at: Date.now() } };
    save();
    emit();
  },
  reset() {
    state = { ...state, found: [], last: null };
    save();
    emit();
  },
  has(id: string) {
    return state.found.includes(id);
  },
  get() {
    return state;
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
};
