/**
 * Bob's adventure: where the story is, what Bob is carrying, what's been
 * built into the rocket, photos for the map, and the conversation on screen.
 * Progress is kept in this browser (a per-viewer convenience).
 */
import { BOB_INTRO, NPCS, PARTS, type Effect, type Line, type NpcId, type PartId } from "./story-data";

export type Phase = "card" | "falling" | "intro" | "play" | "launch" | "ended" | "free";

export type Photo = { id: string; x: number; z: number; yaw: number; thumb: string; at: number };

export type Action = { kind: "talk"; npc: NpcId; name: string } | { kind: "launch" } | null;

type State = {
  phase: Phase;
  carried: PartId[];
  delivered: PartId[];
  photos: Photo[];
  reveals: Array<{ x: number; z: number; r: number }>;
  met: NpcId[];
  /** Conversation on screen: who (or "bob") and which line. */
  talk: { who: NpcId | "bob"; node: string } | null;
  action: Action;
  prompt: string | null;
  note: { text: string; at: number } | null;
  flash: number;
  photoRequest: number;
  startedAt: number;
  endedAt: number;
};

const KEY = "underground-story-v1";
const MAX_PHOTOS = 16;

let state: State = {
  phase: "card",
  carried: [],
  delivered: [],
  photos: [],
  reveals: [],
  met: [],
  talk: null,
  action: null,
  prompt: null,
  note: null,
  flash: 0,
  photoRequest: 0,
  startedAt: 0,
  endedAt: 0,
};
let loaded = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function save() {
  // never write before the saved game has been read, or a blank state could overwrite it
  if (!loaded) return;
  try {
    const keep = state.phase === "play" || state.phase === "free" || state.phase === "launch" || state.phase === "ended";
    window.localStorage.setItem(
      KEY,
      JSON.stringify({
        phase: keep ? (state.phase === "launch" || state.phase === "ended" ? "free" : state.phase) : "card",
        carried: state.carried,
        delivered: state.delivered,
        photos: state.photos,
        reveals: state.reveals,
        met: state.met,
        startedAt: state.startedAt,
      }),
    );
  } catch {
    // storage blocked or full: progress just won't survive a reload
  }
}

function set(patch: Partial<State>, persist = false) {
  state = { ...state, ...patch };
  if (persist) save();
  emit();
}

const partName = (id: PartId) => PARTS.find((p) => p.id === id)?.name ?? id;

export function lineFor(talk: State["talk"]): Line | null {
  if (!talk) return null;
  if (talk.who === "bob") return BOB_INTRO[talk.node] ?? null;
  return NPCS.find((n) => n.id === talk.who)?.lines[talk.node] ?? null;
}

export const storyStore = {
  /** Where Bob is right now (updated quietly every frame, for the map). */
  here: { x: 0, z: 58 },
  load() {
    if (loaded) return;
    loaded = true;
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) {
        const p = JSON.parse(raw);
        state = {
          ...state,
          phase: p.phase === "play" || p.phase === "free" ? p.phase : "card",
          carried: Array.isArray(p.carried) ? p.carried : [],
          delivered: Array.isArray(p.delivered) ? p.delivered : [],
          photos: Array.isArray(p.photos) ? p.photos.slice(0, MAX_PHOTOS) : [],
          reveals: Array.isArray(p.reveals) ? p.reveals : [],
          met: Array.isArray(p.met) ? p.met : [],
          startedAt: typeof p.startedAt === "number" ? p.startedAt : 0,
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

  /** True while the game shouldn't take movement keys. */
  inputBlocked() {
    return state.talk !== null || state.phase === "card" || state.phase === "launch" || state.phase === "ended";
  },
  has(id: PartId) {
    return state.carried.includes(id) || state.delivered.includes(id);
  },

  // ---- story flow
  begin() {
    set({ phase: "falling", startedAt: Date.now() });
  },
  landed() {
    if (state.phase !== "falling") return;
    set({ phase: "intro", talk: { who: "bob", node: "start" } });
  },
  launch() {
    set({ phase: "launch", action: null, prompt: null }, true);
  },
  finish() {
    set({ phase: "ended", endedAt: Date.now() }, true);
  },
  keepExploring() {
    set({ phase: "free" }, true);
  },
  restart() {
    set(
      { phase: "card", carried: [], delivered: [], photos: [], reveals: [], met: [], talk: null, startedAt: 0, endedAt: 0 },
      true,
    );
  },
  skipIntro() {
    set({ phase: "play", talk: null, startedAt: Date.now() }, true);
  },

  // ---- parts
  pickUp(id: PartId) {
    if (storyStore.has(id)) return;
    set({ carried: [...state.carried, id], note: { text: `Found the ${partName(id).toLowerCase()}! Bring it to the rocket.`, at: Date.now() } }, true);
  },
  deliverAll() {
    if (!state.carried.length) return [];
    const brought = state.carried;
    const names = brought.map(partName).join(", ").toLowerCase();
    set({ delivered: [...state.delivered, ...brought], carried: [], note: { text: `Added to the rocket: ${names}`, at: Date.now() } }, true);
    return brought;
  },

  // ---- talking
  setAction(action: Action, prompt: string | null) {
    const same =
      prompt === state.prompt &&
      (action === state.action || (action && state.action && action.kind === state.action.kind && (action.kind !== "talk" || (state.action.kind === "talk" && action.npc === state.action.npc))));
    if (!same) set({ action, prompt });
  },
  talkTo(npc: NpcId) {
    const met = state.met.includes(npc) ? state.met : [...state.met, npc];
    set({ talk: { who: npc, node: "start" }, met }, true);
  },
  choose(next: string | null, effect?: Effect) {
    if (effect) storyStore.apply(effect);
    if (!state.talk) return;
    if (next === null) {
      set({ talk: null });
      return;
    }
    const talk = { who: state.talk.who, node: next };
    set({ talk });
    const line = lineFor(talk);
    if (line?.effect) storyStore.apply(line.effect);
  },
  apply(effect: Effect) {
    if ("give" in effect) storyStore.pickUp(effect.give);
    else if ("reveal" in effect) set({ reveals: [...state.reveals, effect.reveal] }, true);
    else if ("startPlay" in effect) set({ phase: "play" }, true);
  },
  closeTalk() {
    set({ talk: null });
  },

  // ---- photos
  requestPhoto() {
    set({ photoRequest: state.photoRequest + 1 });
  },
  addPhoto(p: Omit<Photo, "id" | "at">) {
    const photo: Photo = { ...p, id: `${Date.now()}`, at: Date.now() };
    const photos = [photo, ...state.photos].slice(0, MAX_PHOTOS);
    set({ photos, flash: Date.now(), note: { text: "Photo added to the map in your field guide", at: Date.now() } }, true);
  },
  notify(text: string) {
    set({ note: { text, at: Date.now() } });
  },
};
