/**
 * What the potions have done to the ball. Colour and fluff are remembered in
 * this browser (a per-viewer convenience); glow and bounce wear off.
 */

export type Look = {
  /** Fur colour as a hex string, or null for the red panda default. */
  tint: string | null;
  /** 0 = normal, up to 3 = maximum fluff. */
  fluff: number;
  glowUntil: number;
  bounceUntil: number;
  flyUntil: number;
  last: { text: string; at: number } | null;
};

const KEY = "underground-look-v1";
let state: Look = { tint: null, fluff: 0, glowUntil: 0, bounceUntil: 0, flyUntil: 0, last: null };
let loaded = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function save() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ tint: state.tint, fluff: state.fluff }));
  } catch {
    // storage blocked: the look just won't survive a reload
  }
}

export const GLOW_SECONDS = 60;
export const BOUNCE_SECONDS = 45;
export const FLY_SECONDS = 40;

export const lookStore = {
  load() {
    if (loaded) return;
    loaded = true;
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) {
        const p = JSON.parse(raw);
        state = {
          ...state,
          tint: typeof p.tint === "string" ? p.tint : null,
          fluff: typeof p.fluff === "number" ? Math.max(0, Math.min(3, Math.round(p.fluff))) : 0,
        };
      }
    } catch {
      // ignore
    }
    emit();
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
  setTint(tint: string | null, name: string) {
    state = { ...state, tint, last: { text: tint ? `${name} fur!` : "Back to red panda", at: Date.now() } };
    save();
    emit();
  },
  addFluff() {
    const fluff = (state.fluff + 1) % 4;
    const text = fluff === 0 ? "Fluff trimmed back to normal" : ["", "Fluffier!", "Even fluffier!", "Maximum fluff!"][fluff];
    state = { ...state, fluff, last: { text, at: Date.now() } };
    save();
    emit();
  },
  glow() {
    state = { ...state, glowUntil: Date.now() + GLOW_SECONDS * 1000, last: { text: "Glowing brighter", at: Date.now() } };
    emit();
  },
  bounce() {
    state = { ...state, bounceUntil: Date.now() + BOUNCE_SECONDS * 1000, last: { text: "Extra bouncy!", at: Date.now() } };
    emit();
  },
  fly() {
    state = { ...state, flyUntil: Date.now() + FLY_SECONDS * 1000, last: { text: "You can fly! Tap Space to flap", at: Date.now() } };
    emit();
  },
  reset() {
    state = { tint: null, fluff: 0, glowUntil: 0, bounceUntil: 0, flyUntil: 0, last: { text: "Back to red panda", at: Date.now() } };
    save();
    emit();
  },
};
