/**
 * What the potions have done to the ball. Colour and fluff are remembered in
 * this browser (a per-viewer convenience); glow, bounce and wings wear off.
 */
import { isTouchDevice } from "./touch";
import { asRecord, listenerSet, readSaved, writeSaved } from "./store-utils";

export type Look = {
  /** Fur colour as a hex string, or null for the red panda default. */
  tint: string | null;
  /** 0 = normal, up to 3 = maximum fluff. */
  fluff: number;
  /** When each timed potion wears off (Date.now() milliseconds). */
  glowUntil: number;
  bounceUntil: number;
  flyUntil: number;
  /** What just changed, for the HUD's little note. */
  last: { text: string; at: number } | null;
};

const KEY = "underground-look-v1";
const GLOW_SECONDS = 60;
const BOUNCE_SECONDS = 45;
const FLY_SECONDS = 40;

let state: Look = { tint: null, fluff: 0, glowUntil: 0, bounceUntil: 0, flyUntil: 0, last: null };
let loaded = false;
const { emit, subscribe } = listenerSet();

/** Change the look; `remember` saves colour and fluff for next time. */
function set(patch: Partial<Look>, text: string, remember = false) {
  state = { ...state, ...patch, last: { text, at: Date.now() } };
  if (remember) writeSaved(KEY, { tint: state.tint, fluff: state.fluff });
  emit();
}

export const lookStore = {
  load() {
    if (loaded) return;
    loaded = true;
    const p = asRecord(readSaved(KEY));
    state = {
      ...state,
      tint: typeof p.tint === "string" ? p.tint : null,
      fluff: typeof p.fluff === "number" ? Math.max(0, Math.min(3, Math.round(p.fluff))) : 0,
    };
    emit();
  },
  get() {
    return state;
  },
  subscribe,
  setTint(tint: string | null, name: string) {
    set({ tint }, tint ? `${name} fur!` : "Back to red panda", true);
  },
  /** Each fluff potion adds a level; after the maximum it trims back to normal. */
  addFluff() {
    const fluff = (state.fluff + 1) % 4;
    set({ fluff }, ["Fluff trimmed back to normal", "Fluffier!", "Even fluffier!", "Maximum fluff!"][fluff], true);
  },
  glow() {
    set({ glowUntil: Date.now() + GLOW_SECONDS * 1000 }, "Glowing brighter");
  },
  bounce() {
    set({ bounceUntil: Date.now() + BOUNCE_SECONDS * 1000 }, "Extra bouncy!");
  },
  fly() {
    set({ flyUntil: Date.now() + FLY_SECONDS * 1000 }, `You can fly! ${isTouchDevice() ? "Tap Flap" : "Tap Space"} to flap`);
  },
  reset() {
    set({ tint: null, fluff: 0, glowUntil: 0, bounceUntil: 0, flyUntil: 0 }, "Back to red panda", true);
  },
};
