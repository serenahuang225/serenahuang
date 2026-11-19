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

export type NpcId = "pip" | "moss" | "finn" | "elder" | "quartz" | "bobby";

/**
 * Where Bobby's story is: not met yet → met → thinking it over (after Bob's
 * invitation) → coming after Bob → travelling with him → at the rocket it
 * either flies home with Bob or stays to show the Hollow who it is.
 */
export type BobbyStage = "unmet" | "met" | "thinking" | "coming" | "with" | "home" | "stayed";

/** What a line of dialogue does when it's reached or chosen. */
export type Effect =
  | { give: PartId }
  | { reveal: { x: number; z: number; r: number } }
  | { startPlay: true }
  | { puzzle: "song" }
  /** Move Bobby's story on. */
  | { bobby: BobbyStage }
  /** Bobby has had this chat (so it isn't repeated). */
  | { heard: string }
  /** Hand the conversation to another friend standing nearby. */
  | { switchTo: NpcId }
  /** Light the engines. */
  | { launch: true };

export type Choice = {
  text: string;
  /** The line this leads to (a list: one picked at random), or null to end the conversation. */
  next: string | string[] | null;
  effect?: Effect;
  /** Only offer this choice before Bob has the part. */
  unlessHas?: PartId;
  /** Only offer this choice once Bob has the part. */
  ifHas?: PartId;
  /** Only offer this choice once Bob has met this friend… */
  ifMet?: NpcId;
  /** …or only before. */
  unlessMet?: NpcId;
};

export type Line = {
  text: string;
  /** Something the line talks about; the camera pans over to look at it. */
  focus?: { x: number; y: number; z: number };
  /** Who's talking: the friend (default) or Bob himself… */
  bob?: boolean;
  /** …or another friend joining in (Bobby, interrupting Elder Puff). */
  speaker?: NpcId;
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

/** Elder Puff's sayings from the old days; asking for wisdom picks one at random. */
const ELDER_WISDOM = ["lore-1", "lore-2", "lore-3", "lore-4", "lore-5", "lore-6", "lore-7", "lore-8", "lore-9", "lore-10"];

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
          // the first time, Bobby can't help cutting in
          { text: "Hello, Elder Puff! I'm Bob.", next: "interrupt", unlessMet: "bobby" },
          { text: "How do you know about the Sky Eye?", next: "history", ifMet: "bobby" },
          { text: "Any wisdom from the old days?", next: ELDER_WISDOM, ifMet: "bobby" },
          { text: "I'm trying to build a rocket.", next: "rocket", ifMet: "bobby" },
          { text: "What is this cave?", next: "cave", ifMet: "bobby" },
          { text: "I'd like to talk to Bobby.", next: null, effect: { switchTo: "bobby" }, ifMet: "bobby" },
          bye("Thank you, Elder."),
        ],
      },
      interrupt: {
        speaker: "bobby",
        text: "Um… sorry. Are you really from the sky? Above the Sky Eye?",
        effect: { bobby: "met" },
        choices: [{ text: "I am! I fell right through it.", next: "hush" }],
      },
      hush: {
        text: "Bobby, little one, we're talking.",
        choices: [{ text: "It's okay, I don't mind!", next: "sorry" }],
      },
      sorry: {
        speaker: "bobby",
        text: "Sorry. It's just… nobody new ever comes here.",
        choices: [{ text: "Hi, Bobby. It's nice to meet you.", next: "aboutBobby" }],
      },
      aboutBobby: {
        text: "That's Bobby. The others can be unkind about its shape. Puffs are supposed to be round, they say, and Bobby wonders what a flat puff is for.",
        choices: [{ text: "Maybe it doesn't have to be for anything.", next: "wiser" }],
      },
      wiser: {
        text: "Hmm. You may be wiser than you look, traveller. Now, what brings you to the Hollow?",
        choices: [
          { text: "How do you know about the Sky Eye?", next: "history" },
          { text: "Any wisdom from the old days?", next: ELDER_WISDOM },
          { text: "I'm trying to build a rocket.", next: "rocket" },
          { text: "What is this cave?", next: "cave" },
          { text: "I'd like to talk to Bobby.", next: null, effect: { switchTo: "bobby" } },
          bye("Thank you, Elder."),
        ],
      },
      hub: {
        text: "Anything else, young Bob?",
        choices: [
          { text: "Tell me the old story again.", next: "history" },
          { text: "Any wisdom from the old days?", next: ELDER_WISDOM },
          { text: "About my rocket…", next: "rocket" },
          { text: "What is this cave?", next: "cave" },
          { text: "I'd like to talk to Bobby.", next: null, effect: { switchTo: "bobby" }, ifMet: "bobby" },
          bye("Thank you, Elder."),
        ],
      },
      history: {
        text: "Long ago a star fell into this cave and broke into glowing seeds. Mushrooms grew from them, crystals drank their light, and we puffkins learned to hop. The Sky Eye is the hole the star made.",
        choices: [
          { text: "And the light orbs?", next: "orbs" },
          { text: "Any more stories like that?", next: ELDER_WISDOM },
          { text: "Something else…", next: "hub" },
        ],
      },
      "lore-1": {
        text: "When the star fell, it rang like a bell for a whole year. The oldest crystals still hum that note, if you listen closely.",
        choices: [
          { text: "Tell me another.", next: ELDER_WISDOM },
          { text: "Something else…", next: "hub" },
        ],
      },
      "lore-2": {
        text: "The first puffkins couldn't hop at all. We rolled, like you. Hopping came later, once the mushrooms grew tall enough to be worth reaching.",
        choices: [
          { text: "Tell me another.", next: ELDER_WISDOM },
          { text: "Something else…", next: "hub" },
        ],
      },
      "lore-3": {
        text: "The glow-snails were here before any of us. They carried the star's seeds on their shells, one slow step at a time. Never hurry a snail.",
        choices: [
          { text: "Tell me another.", next: ELDER_WISDOM },
          { text: "Something else…", next: "hub" },
        ],
      },
      "lore-4": {
        text: "Every orb you find was once a spark of that star. I think it remembers the sky. That's why it's so eager to push you back up there.",
        choices: [
          { text: "Tell me another.", next: ELDER_WISDOM },
          { text: "Something else…", next: "hub" },
        ],
      },
      "lore-5": {
        text: "Long ago the deep lake rose and found its way under the shore. That's how the crystal tunnel was made. Nothing is ever just lost, little one; it goes somewhere new.",
        choices: [
          { text: "Tell me another.", next: ELDER_WISDOM },
          { text: "Something else…", next: "hub" },
        ],
      },
      "lore-6": {
        text: "My grandmother said the Sky Eye blinks once every hundred years. I've been waiting ninety-nine of them. I'm not sure she was right.",
        choices: [
          { text: "Tell me another.", next: ELDER_WISDOM },
          { text: "Something else…", next: "hub" },
        ],
      },
      "lore-7": {
        text: "The Great Cap was a little button mushroom when I was young. Everything grows, if you give it long enough.",
        choices: [
          { text: "Tell me another.", next: ELDER_WISDOM },
          { text: "Something else…", next: "hub" },
        ],
      },
      "lore-8": {
        text: "In the oldest stories, puffs came in every shape: tall ones, lumpy ones, flat ones. Round is just the shape that forgot it could be anything else.",
        choices: [
          { text: "Tell me another.", next: ELDER_WISDOM },
          { text: "Something else…", next: "hub" },
        ],
      },
      "lore-9": {
        text: "Once, a puffkin tried to hop all the way up to the Sky Eye. She didn't make it. But she hopped higher than anyone ever had, and that's why we all keep trying.",
        choices: [
          { text: "Tell me another.", next: ELDER_WISDOM },
          { text: "Something else…", next: "hub" },
        ],
      },
      "lore-10": {
        text: "The glowworms on the ceiling are wishes, they say. The bright ones are the wishes that came true. Look how many there are.",
        choices: [
          { text: "Tell me another.", next: ELDER_WISDOM },
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
  {
    id: "bobby",
    name: "Bobby",
    species: "Puffkin (flat)",
    // by the pool in the Hollow, a little way from Elder Puff
    x: 114.5,
    z: 81.5,
    talkRange: 2.6,
    color: "#f4a26e",
    bio: "A young puffkin squashed flat as a pancake. The others say it can't even hop properly. Curious, a bit sarcastic when it's nervous, and braver than it knows.",
    lines: {
      // ---- meeting (if Bob says hello before Elder Puff introduces them)
      start: {
        text: "Oh! You're… you're from the sky, aren't you? I'm Bobby.",
        effect: { bobby: "met" },
        choices: [{ text: "I'm Bob! I fell through the Sky Eye.", next: "hub" }],
      },
      hub: {
        text: "Hi, Bob. Did you want something? Most puffs don't come over here.",
        choices: [
          { text: "Why are you sitting all alone?", next: "alone" },
          { text: "Come with me! It's way more fun with a friend.", next: "invite" },
          bye("See you, Bobby."),
        ],
      },
      alone: {
        text: "The others say every puff is good at something. Hopping, singing, napping. I'm just… flat.",
        choices: [
          { text: "You don't have to be good at something to matter.", next: "matter" },
          { text: "Flat sounds pretty great, honestly.", next: "great" },
        ],
      },
      matter: {
        text: "…Nobody's ever said that to me. Do you really think so?",
        choices: [{ text: "I really do.", next: "hub" }],
      },
      great: {
        text: "Ha. You'd be the first. Try rolling anywhere when you're shaped like a pancake.",
        choices: [{ text: "Rolling's overrated. Ask me after I bump my fifth mushroom.", next: "hub" }],
      },
      // ---- the invitation: Bob wants Bobby along, but it's Bobby's choice
      invite: {
        text: "Leave the Hollow? I've never even been past the door. I… I need to think.",
        effect: { bobby: "thinking" },
        choices: [{ text: "Take your time. I'll be heading out.", next: null }],
      },
      thinking: {
        text: "Still thinking. Go on, go on. I'm thinking.",
        choices: [{ text: "Okay. No rush.", next: null }],
      },
      // ---- Bobby catches up with Bob outside
      decided: {
        text: "Wait! Bob, wait up! I decided. Not because you asked. Because I want to see what's out there.",
        effect: { bobby: "with" },
        choices: [{ text: "I'm really glad, Bobby.", next: "decided2" }],
      },
      decided2: {
        text: "Me too. Okay. Which way is \u201cout there\u201d?",
        choices: [{ text: "Everywhere! Let's go.", next: null }],
      },
      // ---- travelling together (bobby.ts picks which chat comes up next)
      idle: {
        text: "I'm right behind you. Mostly. Flat things are slow.",
        choices: [
          { text: "Thanks for coming, Bobby.", next: "thanks" },
          bye("Let's keep going."),
        ],
      },
      thanks: {
        text: "Thanks for asking me. Even if it took me a while to say yes.",
        choices: [{ text: "Friends wait for each other.", next: null }],
      },
      "outside-1": {
        text: "So this is outside. It's so big. Is the sky bigger than this?",
        effect: { heard: "outside" },
        choices: [{ text: "Way bigger. It goes up forever.", next: "outside-2" }],
      },
      "outside-2": {
        text: "Forever? That's terrifying. …Tell me more about it later.",
        choices: [{ text: "Deal.", next: null }],
      },
      "home-1": {
        text: "Can I ask you something? Do you miss home?",
        effect: { heard: "home" },
        choices: [{ text: "Every day. I miss the sun on my fur.", next: "home-2" }],
      },
      "home-2": {
        text: "The sun… Is it warm like the glowworms?",
        choices: [{ text: "Warmer. Like a hug.", next: "home-3" }],
      },
      "home-3": {
        text: "Then I hope you get back to it. I mean it.",
        choices: [{ text: "Thanks, Bobby.", next: null }],
      },
      "tease-1": {
        text: "You bump into a LOT of things. Is that a sky thing?",
        effect: { heard: "tease" },
        choices: [{ text: "It's a ball thing.", next: "tease-2" }],
      },
      "tease-2": {
        text: "Well, it's very undignified. I love it.",
        choices: [{ text: "Hey!", next: null }],
      },
      "finn-1": {
        text: "Finn says I'd make a very good fish. Flat fish are real, you know.",
        effect: { heard: "finn" },
        choices: [{ text: "Finn knows his fish.", next: "finn-2" }],
      },
      "finn-2": {
        text: "He also says you swim like a dropped pebble.",
        choices: [{ text: "…That's fair.", next: null }],
      },
      "scared-1": {
        text: "Are you scared? Of not making it home?",
        effect: { heard: "scared" },
        choices: [{ text: "…Yeah. I'm small, and I'm a long way from home.", next: "scared-2" }],
      },
      "scared-2": {
        text: "Me too. Not the far part. The small part. Everyone's always looking down at me. Literally.",
        choices: [{ text: "We can be small together.", next: "scared-3" }],
      },
      "scared-3": {
        text: "Small together. I like that.",
        choices: [{ text: "Me too.", next: null }],
      },
      "brave-1": {
        text: "You climbed all the way up the Great Cap? Bob, you're braver than you look.",
        effect: { heard: "brave" },
        choices: [{ text: "You're braver than you think. You left the Hollow.", next: "brave-2" }],
      },
      "brave-2": {
        text: "…I did, didn't I.",
        choices: [{ text: "You did.", next: null }],
      },
      "almost-1": {
        text: "The rocket's nearly ready. Bob… what happens to me when you go?",
        effect: { heard: "almost" },
        choices: [{ text: "We'll figure it out together. Promise.", next: "almost-2" }],
      },
      "almost-2": {
        text: "Together. Okay.",
        choices: [{ text: "Okay.", next: null }],
      },
      // ---- at the rocket: the player chooses
      launch: {
        text: "This is it, huh? The rocket. The sky.",
        choices: [
          { text: "Come home with me, Bobby.", next: "goHome", effect: { bobby: "home" } },
          { text: "Go back and show them who you are.", next: "goStay", effect: { bobby: "stayed" } },
        ],
      },
      goHome: {
        text: "Me? In the sky? …Okay. Okay! Scoot over. I'm flat, I'll fit anywhere.",
        choices: [{ text: "Let's go home.", next: null, effect: { launch: true } }],
      },
      goStay: {
        text: "…Yeah. I'm done sitting by the pool. I'll tell them about the whole wide cave. Thank you for asking me to come, Bob.",
        choices: [{ text: "Bye, Bobby. You're my best friend down here.", next: null, effect: { launch: true } }],
      },
      // ---- after the ending, if Bobby stayed
      proud: {
        text: "Bob! You came back! The others make me tell the sky story every night now. Even Elder Puff listens.",
        choices: [{ text: "I knew they would.", next: null }],
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
