/**
 * Bob's story: the rocket, its parts, the friends Bob meets and what they
 * say. Plain data (no three.js) so the HUD can use it without loading the
 * 3D world.
 */

/** Where Bob's rocket crashed. */
export const ROCKET = { x: -2.2, z: 45.8 };
/** Energy orbs needed before the rocket can launch. */
export const ENERGY_NEEDED = 10;

/** Things conversations point the camera at. */
const SKY_EYE = { x: -2.2, y: 131, z: 45.8 };
export const ROCKET_VIEW = { x: -2.2, y: 3.6, z: 45.8 };
export const GREAT_CAP = { x: 0.8, y: 34, z: 0.7 };
export const GREAT_CAP_TOP = { x: 0.8, y: 39.5, z: 0.7 };
export const DEEP_LAKE = { x: 60, y: 2, z: 75 };
export const HOLLOW = { x: 110, y: 7, z: 75 };
export const LAKE_FLOOR = { x: 55, y: -8, z: 71 };
export const TUNNEL_MOUTH_VIEW = { x: 66, y: -8, z: 75 };
/** How far around the spot a photo uncovers the field-guide map, in metres. */
export const PHOTO_REVEAL = 58;

export type PartId = "hull" | "spring" | "lens" | "fins" | "nozzle" | "cone" | "wire";

export type Part = {
  id: PartId;
  name: string;
  hint: string;
  /** Where it sits in the world (if it isn't handed to you by a friend). */
  at?: { x: number; z: number; y?: number };
  from?: NpcId;
};

/** The colour potions: the colour each one dyes Bob's fur, and its name in the field guide. */
export const POTION_COLORS = {
  bubblegum: { color: "#ff7ac8", name: "Bubblegum" },
  sky: { color: "#6fc3ff", name: "Sky blue" },
  mint: { color: "#5fffbe", name: "Mint" },
  sunny: { color: "#ffd45c", name: "Sunshine" },
  lilac: { color: "#b48cff", name: "Lilac" },
  // Bob's own colour: this one changes him back
  panda: { color: "#d4532e", name: "Red panda" },
} as const;

/** The seven rocket parts, in the order the quest usually finds them. */
export const PARTS: Part[] = [
  { id: "hull", name: "Hull plate", hint: "It bounced off near the rocket when Bob crashed.", at: { x: 3, z: 42 } },
  { id: "spring", name: "Spring coil", hint: "Pip found something boingy in a puffball.", from: "pip" },
  { id: "cone", name: "Nose cone", hint: "Landed on top of the Great Cap.", at: { x: -2.2, z: -1.3, y: 40.1 } },
  { id: "fins", name: "Tail fins", hint: "Finn dropped them at the bottom of the deep lake.", at: { x: 55, z: 71, y: -8.4 } },
  { id: "wire", name: "Copper wire", hint: "Snagged on crystals halfway along the flooded tunnel.", at: { x: 96.2, z: 74.4, y: -15.6 } },
  { id: "nozzle", name: "Engine nozzle", hint: "Elder Puff keeps an odd whistling thing in the cave.", from: "elder" },
  { id: "lens", name: "Window lens", hint: "Quartz can grow one, if you sing her crystal song back to her.", from: "quartz" },
];

export type NpcId = "pip" | "moss" | "finn" | "elder" | "quartz";

/** What a line of dialogue does when it's reached or chosen. */
export type Effect =
  | { give: PartId }
  | { reveal: { x: number; z: number; r: number } }
  | { startPlay: true }
  | { puzzle: "song" };

export type Choice = {
  text: string;
  next: string | null;
  effect?: Effect;
  /** Only offer this choice before Bob has the part. */
  unlessHas?: PartId;
  /** Only offer this choice once Bob has the part. */
  ifHas?: PartId;
};

export type Line = {
  text: string;
  /** Something the line talks about; the camera pans over to look at it. */
  focus?: { x: number; y: number; z: number };
  /** Who's talking: the friend (default) or Bob himself. */
  bob?: boolean;
  effect?: Effect;
  choices: Choice[];
};

/** A friend Bob can talk to. lines["start"] opens the conversation; "hub" is "what else?". */
export type Npc = {
  id: NpcId;
  name: string;
  species: string;
  x: number;
  z: number;
  /** Absolute height; otherwise sits on the ground. */
  y?: number;
  talkRange: number;
  color: string;
  bio: string;
  lines: Record<string, Line>;
};

/** A choice that ends the conversation. */
const bye = (text = "Bye for now!"): Choice => ({ text, next: null });

export const NPCS: Npc[] = [
  {
    id: "pip",
    name: "Pip",
    species: "Puffkin",
    x: 5,
    z: 55,
    talkRange: 3.2,
    color: "#ffb3d9",
    bio: "A small pink puffkin with a leaf on his head. The first friend Bob made in the Glowdeep, and a champion napper.",
    lines: {
      start: {
        text: "Eep! A new fluff-ball! Are you… a very big puffkin?",
        choices: [
          { text: "I'm Bob! I fell through a hole in the sky.", next: "hole" },
          { text: "What are you?", next: "who" },
          { text: "Can you help me get home?", next: "help" },
          bye(),
        ],
      },
      hub: {
        text: "What else, Bob?",
        choices: [
          { text: "Tell me about the hole I fell through.", next: "hole" },
          { text: "What are you?", next: "who" },
          { text: "How do I get home?", next: "help" },
          bye(),
        ],
      },
      who: {
        text: "I'm Pip! Puffkins live all over the Glowdeep. We hop, we nap, we eat moss-crumbs. Mostly we nap.",
        choices: [
          { text: "The Glowdeep?", next: "place" },
          { text: "Something else…", next: "hub" },
        ],
      },
      place: {
        text: "That's what we call down here! The mushrooms glow because they drink the starlight that drips through the Sky Eye.",
        choices: [{ text: "The Sky Eye?", next: "hole" }],
      },
      hole: {
        text: "The Sky Eye is the hole you fell through! Things drop in sometimes. Last week a shiny squiggly thing fell into my puffball.",
        focus: SKY_EYE,
        choices: [
          { text: "That might be part of my rocket!", next: "give", unlessHas: "spring" },
          { text: "Thanks again for the spring!", next: "hub", ifHas: "spring" },
          { text: "Something else…", next: "hub" },
        ],
      },
      give: {
        text: "Then it's yours! Here — careful, it's boingy. Bring rocket bits back to your rocket. Oh, and catch the glowy orbs. They're full of energy!",
        effect: { give: "spring" },
        choices: [{ text: "Thank you, Pip!", next: "hub" }],
      },
      help: {
        text: "Rockets need lots of bits and lots of glow. Old Moss, by the big blue mushroom, knows everything. She's slow, though. Very, very slow.",
        focus: GREAT_CAP,
        effect: { reveal: { x: -10, z: 24, r: 22 } },
        choices: [
          { text: "Where's the big blue mushroom?", next: "where" },
          { text: "Something else…", next: "hub" },
        ],
      },
      where: {
        text: "You can't miss it! It's the biggest thing in the whole Glowdeep. Just roll away from your rocket and keep going.",
        focus: GREAT_CAP,
        choices: [{ text: "Got it.", next: "hub" }],
      },
    },
  },
  {
    id: "moss",
    name: "Moss",
    species: "Glow-snail",
    x: -10,
    z: 24,
    talkRange: 3.8,
    color: "#7fe8ff",
    bio: "A very old, very slow glow-snail who has circled the foot of the Great Cap for about three hundred years. Knows where everything is.",
    lines: {
      start: {
        text: "Ohhh… a visitor… I have circled this stem for three hundred years… and you are the first round one.",
        choices: [
          { text: "Three hundred years?!", next: "age" },
          { text: "Do you know where rocket parts might be?", next: "parts" },
          { text: "What's that enormous mushroom?", next: "cap" },
          bye("Goodbye, Moss."),
        ],
      },
      hub: {
        text: "Mmm… yes, little round one?",
        choices: [
          { text: "Tell me about the old days.", next: "age" },
          { text: "Where are the rocket parts?", next: "parts" },
          { text: "What's the Great Cap?", next: "cap" },
          bye("Goodbye, Moss."),
        ],
      },
      age: {
        text: "Give or take… a Tuesday. When I was young the Sky Eye was only a crack. The light trickled in, and the Great Cap grew and grew to catch it.",
        focus: GREAT_CAP,
        choices: [{ text: "Wow.", next: "hub" }],
      },
      cap: {
        text: "The Great Cap… the oldest mushroom in the Glowdeep. When you fell, something shiny and pointy landed right on top of it.",
        focus: GREAT_CAP_TOP,
        effect: { reveal: { x: 0, z: 0, r: 26 } },
        choices: [
          { text: "My nose cone! How do I get up there?", next: "climb" },
          { text: "Something else…", next: "hub" },
        ],
      },
      climb: {
        text: "Bounce up the little caps that spiral around it… boing… boing… slowly, like me. Well. Faster than me.",
        focus: { x: -7.6, y: 6, z: 20.1 },
        choices: [{ text: "I'll try!", next: "hub" }],
      },
      parts: {
        text: "The pointy piece waits on the Great Cap. My friend Finn, in the deep lake far to the east, collects shiny things. And the old puffkins in the Hollow keep a whistling treasure.",
        focus: DEEP_LAKE,
        effect: { reveal: { x: 60, z: 75, r: 30 } },
        choices: [
          { text: "The Hollow?", next: "hollow" },
          { text: "Thank you, Moss.", next: "hub" },
        ],
      },
      hollow: {
        text: "A cave of rock past the deep lake. Elder Puff lives there. Mind the doorway… it faces south.",
        focus: HOLLOW,
        effect: { reveal: { x: 110, z: 75, r: 24 } },
        choices: [{ text: "Got it.", next: "hub" }],
      },
    },
  },
  {
    id: "finn",
    name: "Finn",
    species: "Lantern fish",
    x: 63.5,
    z: 81,
    talkRange: 7,
    color: "#ffd27a",
    bio: "A golden lantern fish with a glowing lure. Leads his school through the crystal tunnel and collects anything shiny.",
    lines: {
      start: {
        text: "Blub! A floating fuzzball! Are you a fish? You're a terrible fish.",
        choices: [
          { text: "I'm a ball named Bob!", next: "bob" },
          { text: "Moss said you collect shiny things.", next: "shiny" },
          { text: "What's down at the bottom?", next: "deep" },
          bye("Bye, Finn!"),
        ],
      },
      hub: {
        text: "Blub blub. What else?",
        choices: [
          { text: "About those shiny things…", next: "shiny" },
          { text: "What's down at the bottom?", next: "deep" },
          bye("Bye, Finn!"),
        ],
      },
      bob: {
        text: "Bob. Bob the ball. Bob-bob-bob. I like it! I'm Finn. I light the way through the crystal tunnel for my school.",
        choices: [{ text: "Nice to meet you, Finn!", next: "hub" }],
      },
      shiny: {
        text: "I DO collect them. My best ones are a pair of metal fins. FINS! Like me! I dropped them at the bottom of the lake. Dive down and take them — hold C to swim down.",
        focus: LAKE_FLOOR,
        effect: { reveal: { x: 55, z: 71, r: 14 } },
        choices: [{ text: "Those are my rocket's fins!", next: "hub" }],
      },
      deep: {
        text: "There's a hole in the lake floor that leads into the crystal tunnel, all the way to the Hollow. Crystals grow across it in four places — find the glowing gap in each and squeeze through. Your copper wire is stuck just past the last one!",
        focus: TUNNEL_MOUTH_VIEW,
        effect: { reveal: { x: 90, z: 74, r: 22 } },
        choices: [{ text: "Thanks, Finn!", next: "hub" }],
      },
    },
  },
  {
    id: "elder",
    name: "Elder Puff",
    species: "Puffkin (very old)",
    x: 112,
    z: 78,
    talkRange: 3.4,
    color: "#c9b6ff",
    bio: "The oldest puffkin of all, keeper of the Hollow and its stories. Wears tiny spectacles and remembers the night the star fell.",
    lines: {
      start: {
        text: "Hmm? A traveller from the Sky Eye. Sit, sit. My eyes aren't what they were, but my ears are perfect.",
        choices: [
          { text: "How do you know about the Sky Eye?", next: "history" },
          { text: "I'm trying to build a rocket.", next: "rocket" },
          { text: "What is this cave?", next: "cave" },
          bye("Thank you, Elder."),
        ],
      },
      hub: {
        text: "Anything else, young Bob?",
        choices: [
          { text: "Tell me the old story again.", next: "history" },
          { text: "About my rocket…", next: "rocket" },
          { text: "What is this cave?", next: "cave" },
          bye("Thank you, Elder."),
        ],
      },
      history: {
        text: "Long ago a star fell into this cave and broke into glowing seeds. Mushrooms grew from them, crystals drank their light, and we puffkins learned to hop. The Sky Eye is the hole the star made.",
        choices: [
          { text: "And the light orbs?", next: "orbs" },
          { text: "Something else…", next: "hub" },
        ],
      },
      orbs: {
        text: "Little pieces of that old star, still warm. Gather enough and they'll push your rocket all the way back up the Sky Eye.",
        choices: [{ text: "I'll collect them!", next: "hub" }],
      },
      cave: {
        text: "We call it the Hollow. We tell stories here. Every glowworm on the ceiling is a puffkin's wish.",
        choices: [{ text: "That's lovely.", next: "hub" }],
      },
      rocket: {
        text: "A rocket! Then you'll want this. It fell with the star and none of us ever knew what it was for. It whistles when you blow into it.",
        choices: [
          { text: "That's an engine nozzle!", next: "give", unlessHas: "nozzle" },
          { text: "Thank you for the nozzle!", next: "hub", ifHas: "nozzle" },
        ],
      },
      give: {
        text: "Take it, take it. It's done whistling for us. Safe travels home, little one.",
        effect: { give: "nozzle" },
        choices: [{ text: "Thank you, Elder Puff.", next: "hub" }],
      },
    },
  },
  {
    id: "quartz",
    name: "Quartz",
    species: "Crystal sprite",
    x: -20.6,
    z: -98.5,
    talkRange: 3.6,
    color: "#b48cff",
    bio: "A floating sprite of living crystal who keeps the crystal garden humming. Loves a good tune.",
    lines: {
      start: {
        text: "Hmmmmm… (the crystals hum)… Oh! A guest. I am Quartz. I keep the crystals singing.",
        choices: [
          { text: "Crystals can sing?", next: "sing" },
          { text: "Could you make a glass window for my rocket?", next: "song", unlessHas: "lens" },
          { text: "What's around here?", next: "place" },
          bye("Goodbye, Quartz."),
        ],
      },
      hub: {
        text: "Hmmm?",
        choices: [
          { text: "About that window…", next: "song", unlessHas: "lens" },
          { text: "What's around here?", next: "place" },
          bye("Goodbye, Quartz."),
        ],
      },
      sing: {
        text: "Listen closely next time you roll by. They hum the old starlight back to itself.",
        choices: [{ text: "I'll listen.", next: "hub" }],
      },
      place: {
        text: "South, past the Great Cap, your rocket, and the shallow glowing lake beyond it. Far to the south-east, the deep lake, the falls, and the Hollow.",
        focus: GREAT_CAP,
        effect: { reveal: { x: -70, z: 62, r: 34 } },
        choices: [{ text: "Thanks!", next: "hub" }],
      },
      song: {
        text: "I can grow you a lens… if you can sing my crystals' song back to me. I hum it, you repeat it. Three verses, each a little longer. Ready?",
        choices: [
          { text: "I'm ready!", next: null, effect: { puzzle: "song" } },
          { text: "Not yet…", next: "hub" },
        ],
      },
      songDone: {
        text: "Oh! The whole garden is singing with you. Here is your lens, clear as a raindrop.",
        effect: { give: "lens" },
        choices: [{ text: "It's beautiful. Thank you!", next: "hub" }],
      },
    },
  },
];

/** Bob talking to himself after the fall. */
/** What Bob says to himself right after landing. */
export const BOB_INTRO: Record<string, Line> = {
  start: {
    bob: true,
    text: "Oof! …ow. Where… where am I?",
    choices: [{ text: "(look up)", next: "two" }],
  },
  two: {
    bob: true,
    text: "That bright hole way up there — that's where I fell from. It's so far up. I'll never bounce that high…",
    focus: SKY_EYE,
    choices: [{ text: "(look at the wreck)", next: "three" }],
  },
  three: {
    bob: true,
    text: "My rocket! It's in pieces. If I can find all seven parts and gather enough glowing energy, maybe I can fly home!",
    focus: ROCKET_VIEW,
    choices: [{ text: "Let's do this!", next: null, effect: { startPlay: true } }],
  },
};

// ---------------------------------------------------------------- map

/**
 * Landmarks for the field-guide map (x, z in world metres). These copy
 * positions from world-data.ts (LAKE, DEEP, giantSpecs, CAVE, FALLS,
 * CRYSTALS, BRIDGE, TUNNEL) so the HUD needn't load the 3D world: if you move
 * a landmark there, update it here too.
 */
export const MAP = {
  radius: 200,
  lakes: [
    { x: -70, z: 62, r: 30, name: "Shallow lake" },
    { x: 60, z: 75, r: 22, name: "Deep lake" },
  ],
  giants: [
    { x: 0, z: 0, r: 17, color: "#33eeff", name: "Great Cap" },
    { x: -95, z: -70, r: 12, color: "#9a68ff" },
    { x: -76, z: -92, r: 9, color: "#9a68ff" },
    { x: 112, z: -28, r: 19, color: "#ff4fd2" },
    { x: 72, z: 116, r: 10, color: "#a8ff4f" },
    { x: -142, z: 34, r: 14, color: "#4c7cff" },
    { x: 32, z: -142, r: 15, color: "#22ffc4" },
  ],
  cave: { x: 110, z: 75, r: 15, name: "The Hollow" },
  falls: { x: 32, z: 73, name: "Falls" },
  crystals: { x: -32, z: -96, name: "Crystal garden" },
  bridge: { x: 60, z0: 47, z1: 103 },
  tunnel: [
    [66, 75],
    [75, 76],
    [87, 73.8],
    [96.5, 74.5],
    [105, 75],
  ] as Array<[number, number]>,
};
