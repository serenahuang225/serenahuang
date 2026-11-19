/**
 * Bob's adventure: where the story is, what Bob is carrying, what's been
 * built into the rocket, photos for the map, and the conversation on screen.
 * Progress is kept in this browser (a per-viewer convenience).
 */
import { BOB_INTRO, NPCS, PARTS, type BobbyStage, type Effect, type Line, type NpcId, type PartId } from "./story-data";
import { bobbyOpening } from "./bobby";
import { redirectLine, type Goal } from "./quest";
import { orbStore } from "./orb-store";
import { asRecord, listenerSet, readSaved, writeSaved } from "./store-utils";

/**
 * Where the story is: the title card, falling in, Bob's opening lines, playing,
 * the launch cutscene, the ending card, and free play after flying home.
 */
export type Phase = "card" | "falling" | "intro" | "play" | "launch" | "ended" | "free";

export type Photo = { id: string; x: number; z: number; yaw: number; thumb: string; at: number };

/** What T (or the Talk button) would do right now. */
export type Action = { kind: "talk"; npc: NpcId; name: string } | { kind: "launch" } | null;

type State = {
  phase: Phase;
  carried: PartId[];
  delivered: PartId[];
  photos: Photo[];
  /** Areas of the map friends have told Bob about. */
  reveals: Array<{ x: number; z: number; r: number }>;
  met: NpcId[];
  /** Conversation on screen: who (or "bob") and which line (or a line made up on the spot). */
  talk: { who: NpcId | "bob"; node: string; line?: Line } | null;
  action: Action;
  /** The hint under Bob ("T — talk to Pip", "Swimming — …"). */
  prompt: string | null;
  /** A short message that fades out ("Found the nose cone!"). */
  note: { text: string; at: number } | null;
  /** A puzzle on screen (Quartz's crystal song). */
  puzzle: "song" | null;
  /** A one-time control tip, shown when that control first becomes useful. */
  tip: { id: string; text: string; at: number } | null;
  /** When the last photo was taken (the screen flashes white). */
  flash: number;
  /** Goes up by one each time P is pressed; the scene watches it to take a photo. */
  photoRequest: number;
  /** The run's start and end times, for the ending card's clock. */
  startedAt: number;
  endedAt: number;
  /** Bobby's story (see bobby.ts). */
  bobby: BobbyStage;
  /** The travelling chats Bobby has already had. */
  bobbyHeard: string[];
  /** Bob already wished he'd asked Bobby along (said once). */
  wished: boolean;
};

const BOBBY_STAGES: BobbyStage[] = ["unmet", "met", "thinking", "coming", "with", "home", "stayed"];

const KEY = "underground-story-v1";
const TIPS_KEY = "underground-tips-v1";
const TIP_MS = 7000;
let tipsSeen: Set<string> | null = null;

/** The control tips this browser has already shown (read once). */
function seenTips() {
  if (tipsSeen) return tipsSeen;
  const saved = readSaved(TIPS_KEY);
  tipsSeen = new Set(Array.isArray(saved) ? saved.map(String) : []);
  return tipsSeen;
}
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
  puzzle: null,
  tip: null,
  flash: 0,
  photoRequest: 0,
  startedAt: 0,
  endedAt: 0,
  bobby: "unmet",
  bobbyHeard: [],
  wished: false,
};
let loaded = false;
const { emit, subscribe } = listenerSet();

/** The phase to come back to after a reload: mid-story resumes play, a finished game resumes free play. */
function savedPhase(phase: Phase): Phase {
  if (phase === "play" || phase === "free") return phase;
  if (phase === "launch" || phase === "ended") return "free";
  return "card";
}

function save() {
  // never write before the saved game has been read, or a blank state could overwrite it
  if (!loaded) return;
  writeSaved(KEY, {
    phase: savedPhase(state.phase),
    carried: state.carried,
    delivered: state.delivered,
    photos: state.photos,
    reveals: state.reveals,
    met: state.met,
    startedAt: state.startedAt,
    // Bobby only ever waits outside the Hollow for a moment: resume with it along
    bobby: state.bobby === "coming" ? "with" : state.bobby,
    bobbyHeard: state.bobbyHeard,
    wished: state.wished,
  });
}

/** Change the state and tell the HUD; `persist` also saves the game. */
function set(patch: Partial<State>, persist = false) {
  state = { ...state, ...patch };
  if (persist) save();
  emit();
}

const partName = (id: PartId) => PARTS.find((p) => p.id === id)?.name ?? id;

/** The line of dialogue a conversation is on. */
export function lineFor(talk: State["talk"]): Line | null {
  if (!talk) return null;
  if (talk.line) return talk.line;
  if (talk.who === "bob") return BOB_INTRO[talk.node] ?? null;
  return NPCS.find((n) => n.id === talk.who)?.lines[talk.node] ?? null;
}

export const storyStore = {
  /** Where Bob is right now (updated quietly every frame, for the map). */
  here: {
    x: 0,
    y: 0,
    z: 58,
    /** Which way the camera looks, clockwise from north (-z), in radians. */
    heading: 0,
    /** What the HUD wants the compass to point at… */
    goal: null as Goal | null,
    /** …and where that actually is (the scene resolves "nearest orb"). */
    aim: null as { x: number; z: number; y?: number } | null,
  },
  load() {
    if (loaded) return;
    loaded = true;
    const p = asRecord(readSaved(KEY));
    const list = <T,>(v: unknown) => (Array.isArray(v) ? (v as T[]) : []);
    state = {
      ...state,
      phase: p.phase === "play" || p.phase === "free" ? p.phase : "card",
      carried: list<PartId>(p.carried),
      delivered: list<PartId>(p.delivered),
      photos: list<Photo>(p.photos).slice(0, MAX_PHOTOS),
      reveals: list<State["reveals"][number]>(p.reveals),
      met: list<NpcId>(p.met),
      startedAt: typeof p.startedAt === "number" ? p.startedAt : 0,
      bobby: BOBBY_STAGES.includes(p.bobby as BobbyStage) ? (p.bobby as BobbyStage) : "unmet",
      bobbyHeard: list<string>(p.bobbyHeard),
      wished: p.wished === true,
    };
    emit();
  },
  get() {
    return state;
  },
  subscribe,

  /** True while the game shouldn't take movement keys. */
  inputBlocked() {
    return state.talk !== null || state.puzzle !== null || state.phase === "card" || state.phase === "launch" || state.phase === "ended";
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
  /** Bob presses Launch: if Bobby is along, they decide together first. */
  startLaunch() {
    if (state.bobby === "with") storyStore.talkTo("bobby", "launch");
    else storyStore.launch();
  },
  finish() {
    set({ phase: "ended", endedAt: Date.now() }, true);
  },
  keepExploring() {
    set({ phase: "free" }, true);
  },
  restart() {
    set(
      {
        phase: "card",
        carried: [],
        delivered: [],
        photos: [],
        reveals: [],
        met: [],
        talk: null,
        puzzle: null,
        startedAt: 0,
        endedAt: 0,
        bobby: "unmet",
        bobbyHeard: [],
        wished: false,
      },
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
  /** Start a conversation (on a given line, or wherever that friend would begin). */
  talkTo(npc: NpcId, node?: string) {
    const met = state.met.includes(npc) ? state.met : [...state.met, npc];
    const energy = orbStore.get().found.length;
    if (npc === "bobby") {
      set({ talk: { who: npc, node: node ?? bobbyOpening(state, energy) }, met }, true);
    } else {
      // a friend whose part is done sends Bob on to whatever's next
      const again = node ? null : redirectLine(npc, state, energy);
      set({ talk: again ? { who: npc, node: "again", line: again } : { who: npc, node: node ?? "start" }, met }, true);
    }
    const line = lineFor(state.talk);
    if (line?.effect) storyStore.apply(line.effect);
  },
  choose(choice: string | string[] | null, effect?: Effect) {
    if (effect) storyStore.apply(effect);
    // handing over to another friend starts their conversation instead
    if (effect && "switchTo" in effect) return;
    if (!state.talk) return;
    if (choice === null) {
      set({ talk: null });
      return;
    }
    // a list means "one of these at random" (but not the line we're on)
    const current = state.talk.node;
    const pool = Array.isArray(choice) ? choice.filter((n) => n !== current) : [choice];
    const next = pool[Math.floor(Math.random() * pool.length)];
    const talk = { who: state.talk.who, node: next };
    set({ talk });
    const line = lineFor(talk);
    if (line?.effect) storyStore.apply(line.effect);
  },
  apply(effect: Effect) {
    if ("give" in effect) storyStore.pickUp(effect.give);
    else if ("reveal" in effect) set({ reveals: [...state.reveals, effect.reveal] }, true);
    else if ("startPlay" in effect) set({ phase: "play" }, true);
    else if ("puzzle" in effect) set({ puzzle: effect.puzzle, talk: null });
    else if ("bobby" in effect) {
      const met = effect.bobby === "met" && !state.met.includes("bobby") ? [...state.met, "bobby" as NpcId] : state.met;
      set({ bobby: effect.bobby, met }, true);
    } else if ("heard" in effect) {
      if (!state.bobbyHeard.includes(effect.heard)) set({ bobbyHeard: [...state.bobbyHeard, effect.heard] }, true);
    } else if ("switchTo" in effect) storyStore.talkTo(effect.switchTo);
    else if ("launch" in effect) storyStore.launch();
  },
  /** Bob says (to himself) that he wishes Bobby had come: once. */
  wishForBobby() {
    if (state.wished) return;
    set({ wished: true, note: { text: "Bob: \u201cI wish I'd asked Bobby to come along\u2026\u201d", at: Date.now() } }, true);
  },
  /** Bob left the Hollow after inviting Bobby: Bobby comes after him. */
  bobbyFollows() {
    if (state.bobby === "thinking") set({ bobby: "coming" });
  },
  closeTalk() {
    set({ talk: null });
  },
  /** Quartz's song sung right: she hands over the lens. */
  solvePuzzle() {
    set({ puzzle: null, talk: { who: "quartz", node: "songDone" } });
    const line = lineFor(state.talk);
    if (line?.effect) storyStore.apply(line.effect);
  },
  leavePuzzle() {
    set({ puzzle: null });
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
  /** Has this tip been shown before (on this browser)? */
  tipSeen(id: string) {
    return seenTips().has(id);
  },
  /**
   * Show a one-time tip. Returns false if another tip is still on screen, so
   * the caller can try again a moment later.
   */
  tip(id: string, text: string) {
    const seen = seenTips();
    if (seen.has(id)) return true;
    if (state.tip && Date.now() - state.tip.at < TIP_MS) return false;
    seen.add(id);
    writeSaved(TIPS_KEY, [...seen]);
    set({ tip: { id, text, at: Date.now() } });
    return true;
  },
};
