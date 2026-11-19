/**
 * Bobby's story, as plain logic (no three.js): which conversation opens when
 * Bob talks to it, which travelling chat comes up next, and what the other
 * puffs in the Hollow whisper. Bobby's lines themselves are in story-data.ts.
 */
import { PARTS, type BobbyStage, type PartId } from "./story-data";

type BobbyState = {
  bobby: BobbyStage;
  bobbyHeard: string[];
  carried: PartId[];
  delivered: PartId[];
  met: string[];
};

/** Bobby is travelling with Bob (and so follows him around). */
export function bobbyAlong(stage: BobbyStage) {
  return stage === "with" || stage === "home";
}

/**
 * The chats Bobby has while travelling with Bob, newest-unlocked first wins.
 * Each one's first line (`<id>-1` in story-data) marks it heard.
 */
const CHATS: Array<{ id: string; when: (s: BobbyState, energy: number) => boolean }> = [
  { id: "almost", when: (s) => s.delivered.length === PARTS.length },
  { id: "brave", when: (s) => s.carried.includes("cone") || s.delivered.includes("cone") },
  { id: "scared", when: (s) => s.delivered.length >= 3 },
  { id: "finn", when: (s) => s.met.includes("finn") },
  { id: "tease", when: (_, energy) => energy >= 4 },
  { id: "home", when: (s) => s.bobbyHeard.includes("outside") },
  { id: "outside", when: () => true },
];

/** Which of Bobby's lines a conversation starts on. */
export function bobbyOpening(s: BobbyState, energy: number): string {
  switch (s.bobby) {
    case "unmet":
      return "start";
    case "met":
      return "hub";
    case "thinking":
      return "thinking";
    case "coming":
      return "decided";
    case "stayed":
      return "proud";
    default: {
      const chat = CHATS.find((c) => !s.bobbyHeard.includes(c.id) && c.when(s, energy));
      return chat ? `${chat.id}-1` : "idle";
    }
  }
}

/** What the other puffs in the Hollow mutter, before and after Bobby finds its courage. */
export const WHISPERS = {
  before: [
    "A puffkin whispers: “Too flat to hop!”",
    "A puffkin whispers: “Puffs are supposed to be round…”",
    "A puffkin whispers: “Bobby can't even bounce.”",
  ],
  along: [
    "A puffkin whispers: \u201cBobby left the Hollow?!\u201d",
    "A puffkin whispers: \u201cIs Bobby friends with the sky ball?\u201d",
  ],
  after: [
    "A puffkin calls: “Tell us about the sky again, Bobby!”",
    "A puffkin whispers: “Bobby went all the way to the Great Cap!”",
    "A puffkin calls: “Bobby, wait for us!”",
  ],
};
