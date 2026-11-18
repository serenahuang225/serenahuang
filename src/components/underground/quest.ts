/**
 * The quest as a chain of small steps: what to do next, where it is (for the
 * compass) and how a friend would point Bob there. Plain data, no three.js.
 */
import {
  DEEP_LAKE,
  ENERGY_NEEDED,
  GREAT_CAP,
  GREAT_CAP_TOP,
  HOLLOW,
  LAKE_FLOOR,
  NPCS,
  PARTS,
  ROCKET,
  ROCKET_VIEW,
  TUNNEL_MOUTH_VIEW,
  type Line,
  type NpcId,
  type PartId,
} from "./story-data";
import { isTouchDevice } from "./touch";

type QuestState = {
  phase: string;
  carried: PartId[];
  delivered: PartId[];
  photos: unknown[];
  met: NpcId[];
};

/** Where the compass points: a spot in the world, or the nearest energy orb. */
export type Goal = { x: number; z: number; y?: number } | "orb";

export type Step = {
  text: string;
  done: boolean;
  optional?: boolean;
  final?: boolean;
  /** Short name shown on the compass. */
  label?: string;
  goal?: Goal;
  /** What a friend says to send Bob this way. */
  hint?: string;
  focus?: { x: number; y: number; z: number };
};

const npc = (id: NpcId) => NPCS.find((n) => n.id === id)!;
const part = (id: PartId) => PARTS.find((p) => p.id === id)!.at!;
const spot = (id: NpcId) => ({ x: npc(id).x, z: npc(id).z, y: npc(id).y });

export function questSteps(s: QuestState, energy: number): Step[] {
  const has = (id: PartId) => s.carried.includes(id) || s.delivered.includes(id);
  const allParts = s.delivered.length === PARTS.length;
  const left = Math.max(0, ENERGY_NEEDED - energy);
  const touch = typeof window !== "undefined" && isTouchDevice();
  return [
    {
      text: `Say hi to Pip, the little pink puffkin by your rocket (${touch ? "tap Talk" : "press T"})`,
      done: s.met.includes("pip"),
      label: "Pip",
      goal: spot("pip"),
      hint: "Have you met Pip yet? He's the little pink puffkin napping by your rocket.",
      focus: { x: 5, y: 3, z: 55 },
    },
    {
      text: "Grab the hull plate glowing in the grass near the rocket",
      done: has("hull"),
      label: "Hull plate",
      goal: part("hull"),
      hint: "A big metal plate bounced into the grass right by your rocket. Look for the blue beam!",
      focus: { x: 3, y: 3, z: 42 },
    },
    {
      text: "Roll to the big blue mushroom and visit Moss at its foot",
      done: s.met.includes("moss"),
      label: "Moss",
      goal: spot("moss"),
      hint: "Go and see Old Moss, the glow-snail at the foot of the big blue mushroom. She knows where everything is.",
      focus: GREAT_CAP,
    },
    {
      text: "Bounce up the spiral of caps to the top of the big blue mushroom for the nose cone",
      done: has("cone"),
      label: "Nose cone",
      goal: part("cone"),
      hint: "Your nose cone is way up on top of the Great Cap. Bounce up the spiral of little caps around it!",
      focus: GREAT_CAP_TOP,
    },
    {
      text: "Head east and cross the rope bridge — find Finn in the deep lake",
      done: s.met.includes("finn"),
      label: "Finn",
      goal: spot("finn"),
      hint: "Head east over the rope bridge to the deep lake. Finn the lantern fish swims there, and he loves shiny things.",
      focus: DEEP_LAKE,
    },
    {
      text: `Dive to the bottom of the deep lake for the tail fins (hold ${touch ? "Dive" : "C"})`,
      done: has("fins"),
      label: "Tail fins",
      goal: part("fins"),
      hint: `Your tail fins are lying on the bottom of the deep lake. Hold ${touch ? "Dive" : "C"} to swim down and grab them!`,
      focus: LAKE_FLOOR,
    },
    {
      text: "Swim into the crystal tunnel in the lake floor and grab the copper wire",
      done: has("wire"),
      label: "Copper wire",
      goal: part("wire"),
      hint: "There's a hole in the deep lake's floor: the crystal tunnel. Your copper wire is caught on the crystals halfway along.",
      focus: TUNNEL_MOUTH_VIEW,
    },
    {
      text: "Follow the tunnel to the Hollow and ask Elder Puff about your rocket",
      done: has("nozzle"),
      label: "Elder Puff",
      goal: spot("elder"),
      hint: "Follow the crystal tunnel all the way to the Hollow. Elder Puff lives there, and keeps something that whistles.",
      focus: HOLLOW,
    },
    {
      text: "Find Quartz among the crystals far to the north and solve her riddle",
      done: has("lens"),
      label: "Quartz",
      goal: spot("quartz"),
      hint: "Quartz, the crystal sprite, lives in the crystal garden far to the north, past the Great Cap. Answer her riddle and she'll grow you a window.",
      focus: GREAT_CAP,
    },
    {
      text: `Collect glowing energy orbs: ${Math.min(energy, ENERGY_NEEDED)}/${ENERGY_NEEDED}`,
      done: energy >= ENERGY_NEEDED,
      final: true,
      label: "Energy orb",
      goal: "orb",
      hint: `Your rocket still needs energy: catch ${left} more glowing orb${left === 1 ? "" : "s"}. Look for the gold pillars of light!`,
    },
    {
      text: `Bring the parts back to the rocket: ${s.delivered.length}/${PARTS.length} fitted${s.carried.length ? ` (carrying ${s.carried.length})` : ""}`,
      done: allParts,
      final: true,
      label: "Rocket",
      goal: ROCKET,
      hint: "Take everything you're carrying back to your rocket and fit it on!",
      focus: ROCKET_VIEW,
    },
    {
      text: `Go to the rocket and ${touch ? "tap Launch" : "press T"} to launch!`,
      done: s.phase === "free",
      final: true,
      label: "Rocket",
      goal: ROCKET,
      hint: `Your rocket is ready! Roll over to it and ${touch ? "tap Launch" : "press T"} to fly home!`,
      focus: ROCKET_VIEW,
    },
    {
      text: `Take photos with ${touch ? "the camera button" : "P"} to fill in your map (${s.photos.length})`,
      done: s.photos.length >= 5,
      optional: true,
    },
  ];
}

/** The step the Next box shows: the first unfinished story step, then the goals for flying home. */
export function nextStep(steps: Step[]): Step | null {
  const story = steps.filter((x) => !x.final && !x.optional);
  return story.find((x) => !x.done) ?? steps.find((x) => x.final && !x.done) ?? null;
}

/** Has this friend already done their part of the story? */
function friendDone(id: NpcId, s: QuestState) {
  const has = (p: PartId) => s.carried.includes(p) || s.delivered.includes(p);
  switch (id) {
    case "pip":
      return has("spring");
    case "moss":
      return s.met.includes("moss");
    case "finn":
      return has("fins");
    case "elder":
      return has("nozzle");
    case "quartz":
      return has("lens");
  }
}

const AGAIN: Record<NpcId, string> = {
  pip: "Bob! You came back! Is the spring still boingy?",
  moss: "Ohhh… the round one returns…",
  finn: "Blub! Bob-bob-bob! Back again?",
  elder: "Ah, young Bob. Back so soon?",
  quartz: "Hmmm… (the crystals hum hello)… Bob.",
};

/**
 * When Bob comes back to a friend whose part is done, they greet him and
 * point him at whatever comes next. Null means the normal conversation.
 */
export function redirectLine(id: NpcId, s: QuestState, energy: number): Line | null {
  if (!s.met.includes(id) || !friendDone(id, s)) return null;
  const next = nextStep(questSteps(s, energy));
  const text = next?.hint ?? "You did it, Bob! You really flew home… and came back to visit!";
  return {
    text: `${AGAIN[id]} ${text}`,
    focus: next?.focus,
    choices: [
      { text: "Thanks! I'm on my way.", next: null },
      { text: "Can we chat a bit first?", next: "hub" },
    ],
  };
}
