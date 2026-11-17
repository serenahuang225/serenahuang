"use client";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { guideStore, type GuideId } from "./guide-store";
import { orbStore } from "./orb-store";
import styles from "./field-guide.module.css";

type Tab = "creatures" | "potions" | "places" | "controls";

type Entry = {
  id: GuideId;
  tab: Exclude<Tab, "controls">;
  name: string;
  latin: string;
  art: (props: { hidden: boolean }) => ReactNode;
  blurb: string;
  where: string;
  tip: string;
};

const COLOR_POTIONS = [
  { name: "Bubblegum", hex: "#ff7ac8" },
  { name: "Sky blue", hex: "#6fc3ff" },
  { name: "Mint", hex: "#5fffbe" },
  { name: "Sunshine", hex: "#ffd45c" },
  { name: "Lilac", hex: "#b48cff" },
  { name: "Red panda", hex: "#d4532e" },
];

// ---------------------------------------------------------------- illustrations

// undiscovered entries are drawn as faded ink silhouettes on the parchment
const SIL = "#5c4a36";

function Puffkin({ hidden }: { hidden: boolean }) {
  const body = hidden ? SIL : "#ffb3d9";
  return (
    <svg viewBox="0 0 160 130" aria-hidden="true">
      <ellipse cx="80" cy="116" rx="34" ry="6" fill="#000" opacity="0.25" />
      <path d="M86 40 C 90 24, 100 18, 108 14" stroke={hidden ? SIL : "#3a2f45"} strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="109" cy="13" r="7" fill={hidden ? SIL : "#ffe3f2"} className={hidden ? undefined : styles.glow} />
      <circle cx="80" cy="76" r="40" fill={body} />
      {!hidden && (
        <>
          <ellipse cx="80" cy="96" rx="24" ry="14" fill="#fff" opacity="0.35" />
          <ellipse cx="66" cy="70" rx="9" ry="11" fill="#fbf8ff" />
          <ellipse cx="94" cy="70" rx="9" ry="11" fill="#fbf8ff" />
          <circle cx="67" cy="72" r="5.5" fill="#1a0f24" />
          <circle cx="95" cy="72" r="5.5" fill="#1a0f24" />
          <circle cx="69" cy="69.5" r="1.8" fill="#fff" />
          <circle cx="97" cy="69.5" r="1.8" fill="#fff" />
          <ellipse cx="56" cy="86" rx="7" ry="4" fill="#ff7fa8" opacity="0.7" />
          <ellipse cx="104" cy="86" rx="7" ry="4" fill="#ff7fa8" opacity="0.7" />
          <path d="M76 86 Q 80 90 84 86" stroke="#1a0f24" strokeWidth="2" fill="none" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

function Snail({ hidden }: { hidden: boolean }) {
  return (
    <svg viewBox="0 0 160 130" aria-hidden="true">
      <ellipse cx="80" cy="112" rx="50" ry="5" fill="#000" opacity="0.25" />
      <path d="M30 108 C 30 96, 60 98, 120 100 C 136 100, 140 92, 136 84" fill={hidden ? SIL : "#b9a6c9"} stroke={hidden ? SIL : "#9a87ab"} strokeWidth="2" />
      <path d="M128 88 L 124 62 M136 86 L 142 62" stroke={hidden ? SIL : "#b9a6c9"} strokeWidth="3" strokeLinecap="round" />
      <circle cx="124" cy="60" r="4.5" fill={hidden ? SIL : "#bff6ff"} className={hidden ? undefined : styles.glow} />
      <circle cx="142" cy="60" r="4.5" fill={hidden ? SIL : "#bff6ff"} className={hidden ? undefined : styles.glow} />
      <circle cx="74" cy="72" r="32" fill={hidden ? SIL : "#7fe8ff"} className={hidden ? undefined : styles.glowSoft} />
      {!hidden && (
        <path
          d="M74 72 m0 -4 a4 4 0 1 1 -4 4 a8 8 0 1 1 8 8 a12 12 0 1 1 -12 -12 a16 16 0 1 1 16 16 a20 20 0 1 1 -20 -20 a24 24 0 1 1 24 24"
          stroke="#2a8fa5"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

function Fish({ hidden }: { hidden: boolean }) {
  return (
    <svg viewBox="0 0 160 130" aria-hidden="true">
      {!hidden && (
        <>
          <circle cx="40" cy="40" r="4" fill="none" stroke="#7fe8ff" strokeWidth="1.5" opacity="0.6" />
          <circle cx="30" cy="58" r="2.5" fill="none" stroke="#7fe8ff" strokeWidth="1.5" opacity="0.5" />
        </>
      )}
      <path d="M118 66 L 146 44 L 140 66 L 146 88 Z" fill={hidden ? SIL : "#ffb3d9"} />
      <ellipse cx="86" cy="66" rx="40" ry="24" fill={hidden ? SIL : "#ffb3d9"} className={hidden ? undefined : styles.glowSoft} />
      {!hidden && (
        <>
          <path d="M92 46 Q 100 56 92 86" stroke="#ff8cc6" strokeWidth="3" fill="none" />
          <circle cx="64" cy="60" r="7" fill="#fbf8ff" />
          <circle cx="63" cy="61" r="4" fill="#1a0f24" />
          <circle cx="64.5" cy="59" r="1.4" fill="#fff" />
          <path d="M50 74 Q 54 77 58 74" stroke="#1a0f24" strokeWidth="2" fill="none" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

function Bottle({ hidden, shape, color }: { hidden: boolean; shape: "flask" | "jar" | "vial" | "drop"; color: string }) {
  const glass = hidden ? SIL : "rgba(230,246,255,0.35)";
  const liquid = hidden ? SIL : color;
  const outline = hidden ? SIL : "rgba(230,246,255,0.8)";
  const paths = {
    flask: {
      glass: "M70 20 h20 v8 h-2 v18 c22 8 30 26 26 44 c-4 20 -22 28 -34 28 c-12 0 -30 -8 -34 -28 c-4 -18 4 -36 26 -44 v-18 h-2 z",
      liquid: "M50 82 c0 0 14 -6 30 0 c16 6 30 0 30 0 c0 16 -14 32 -30 32 c-16 0 -30 -16 -30 -32 z",
      cork: "M71 10 h18 v12 h-18 z",
    },
    jar: {
      glass: "M58 30 h44 v8 c12 4 16 12 16 22 v40 c0 10 -8 16 -18 16 h-40 c-10 0 -18 -6 -18 -16 v-40 c0 -10 4 -18 16 -22 z",
      liquid: "M46 70 c10 -4 22 4 34 0 c12 -4 24 4 34 0 v30 c0 8 -6 12 -14 12 h-40 c-8 0 -14 -4 -14 -12 z",
      cork: "M60 18 h40 v14 h-40 z",
    },
    drop: {
      glass: "M72 22 h16 v10 c14 14 30 34 30 54 c0 18 -16 30 -38 30 c-22 0 -38 -12 -38 -30 c0 -20 16 -40 30 -54 z",
      liquid: "M46 84 c10 -4 22 4 34 0 c12 -4 24 4 34 0 c0 16 -14 26 -34 26 c-20 0 -34 -10 -34 -26 z",
      cork: "M72 10 h16 v14 h-16 z",
    },
    vial: {
      glass: "M70 22 h20 v8 h-2 v72 c0 8 -4 14 -8 14 c-4 0 -8 -6 -8 -14 v-72 h-2 z",
      liquid: "M73 60 c3 -2 11 2 14 0 v42 c0 6 -3 10 -7 10 c-4 0 -7 -4 -7 -10 z",
      cork: "M71 10 h18 v14 h-18 z",
    },
  }[shape];
  return (
    <svg viewBox="0 0 160 130" aria-hidden="true">
      <ellipse cx="80" cy="122" rx="30" ry="4" fill="#000" opacity="0.25" />
      {!hidden && <circle cx="80" cy="80" r="44" fill={color} opacity="0.12" />}
      <path d={paths.liquid} fill={liquid} className={hidden ? undefined : styles.glowSoft} />
      <path d={paths.glass} fill={glass} stroke={outline} strokeWidth="2" />
      <path d={paths.cork} fill={hidden ? SIL : "#8a5a3c"} />
      {!hidden && <path d="M62 54 c-4 10 -4 22 0 32" stroke="#fff" strokeWidth="3" opacity="0.5" fill="none" strokeLinecap="round" />}
      {!hidden && shape === "drop" && (
        <>
          <path d="M44 70 c-14 -10 -26 -8 -32 -2 c10 0 18 4 24 10 c-8 -2 -14 0 -18 4 c10 0 18 2 26 0 z" fill="#fbf8ff" opacity="0.9" />
          <path d="M116 70 c14 -10 26 -8 32 -2 c-10 0 -18 4 -24 10 c8 -2 14 0 18 4 c-10 0 -18 2 -26 0 z" fill="#fbf8ff" opacity="0.9" />
        </>
      )}
    </svg>
  );
}

function Place({ hidden, kind }: { hidden: boolean; kind: string }) {
  const c = (col: string) => (hidden ? SIL : col);
  const art: Record<string, ReactNode> = {
    greatcap: (
      <>
        <rect x="72" y="58" width="16" height="56" rx="6" fill={c("#cfc6dd")} />
        <path d="M18 62 C 30 18, 130 18, 142 62 Z" fill={c("#33eeff")} className={hidden ? undefined : styles.glowSoft} />
        {!hidden && [36, 58, 80, 102, 124].map((x, i) => <circle key={x} cx={x} cy={44 - (i % 2) * 8} r="4" fill="#fff" opacity="0.8" />)}
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={20 + i * 30} y={108 - i * 14} width="20" height="5" rx="2" fill={c("#22ffc4")} />
        ))}
      </>
    ),
    puffball: (
      <>
        <path d="M44 106 C 44 82, 116 82, 116 106 Z" fill={c("#7fe8ff")} className={hidden ? undefined : styles.glowSoft} />
        <ellipse cx="80" cy="106" rx="46" ry="6" fill="none" stroke={c("#bff6ff")} strokeWidth="3" />
        <path d="M80 76 L 80 22 M80 22 L 70 34 M80 22 L 90 34" stroke={c("#bff6ff")} strokeWidth="4" strokeLinecap="round" fill="none" />
      </>
    ),
    logs: (
      <>
        <rect x="18" y="62" width="124" height="46" rx="23" fill={c("#3b2a38")} />
        <ellipse cx="128" cy="85" rx="16" ry="23" fill={c("#2a1a1e")} stroke={c("#5a4050")} strokeWidth="4" />
        {!hidden && <circle cx="128" cy="90" r="6" fill="#d4532e" />}
        {!hidden && [40, 64, 92].map((x) => <circle key={x} cx={x} cy={70} r="3" fill="#33eeff" opacity="0.8" />)}
      </>
    ),
    deeplake: (
      <>
        <path d="M10 56 h140 v66 h-140 z" fill={c("#063a46")} />
        {!hidden &&
          [62, 76, 90].map((y) => <path key={y} d={`M14 ${y} q 16 -8 32 0 t 32 0 t 32 0 t 32 0`} stroke="#33eeff" strokeWidth="2" fill="none" opacity="0.5" />)}
        <circle cx="80" cy="100" r="10" fill={c("#d4532e")} />
        {!hidden && [0, 1, 2].map((i) => <circle key={i} cx={86 + i * 4} cy={84 - i * 10} r={2 + i} fill="none" stroke="#bff6ff" strokeWidth="1.5" />)}
      </>
    ),
    tunnel: (
      <>
        <ellipse cx="80" cy="70" rx="64" ry="46" fill={c("#120f1f")} />
        <ellipse cx="80" cy="70" rx="30" ry="22" fill={c("#2a2140")} />
        {!hidden &&
          [[30, 40], [120, 36], [46, 104], [118, 100], [80, 26]].map(([x, y], i) => (
            <path key={i} d={`M${x} ${y} l 6 -14 l 6 14 z`} fill={i % 2 ? "#b48cff" : "#7fe8ff"} className={styles.glowSoft} />
          ))}
      </>
    ),
    cave: (
      <>
        <path d="M14 114 C 14 30, 146 30, 146 114 Z" fill={c("#2a2836")} />
        <path d="M62 114 C 62 78, 98 78, 98 114 Z" fill={c("#0b0d16")} />
        {!hidden && [40, 56, 104, 122, 80].map((x, i) => <circle key={x} cx={x} cy={52 + (i % 3) * 8} r="2" fill="#7fe8ff" />)}
      </>
    ),
    falls: (
      <>
        <rect x="18" y="20" width="40" height="96" rx="8" fill={c("#2a2836")} />
        <path d="M56 22 C 70 30, 76 70, 82 114 L 104 114 C 96 70, 86 30, 62 18 Z" fill={c("#7fe8ff")} opacity={hidden ? 1 : 0.7} className={hidden ? undefined : styles.glowSoft} />
        <ellipse cx="96" cy="116" rx="40" ry="6" fill={c("#33eeff")} opacity="0.6" />
      </>
    ),
    bridge: (
      <>
        <path d="M8 104 Q 80 50 152 104" stroke={c("#4a3442")} strokeWidth="10" fill="none" />
        <path d="M8 86 Q 80 32 152 86" stroke={c("#c9a27a")} strokeWidth="2" fill="none" />
        {[30, 55, 80, 105, 130].map((x, i) => {
          const y = 104 - Math.sin((x - 8) / 144 * Math.PI) * 27;
          return (
            <g key={x}>
              <rect x={x - 2} y={y - 24} width="4" height="24" fill={c("#3a2a36")} />
              <circle cx={x} cy={y - 26} r="4" fill={c("#ffd27a")} className={hidden || i % 2 ? undefined : styles.glow} />
            </g>
          );
        })}
      </>
    ),
    crystals: (
      <>
        {[[40, 110, 50], [62, 112, 80], [86, 110, 96], [110, 112, 64], [126, 110, 40]].map(([x, y, h], i) => (
          <path key={i} d={`M${x - 10} ${y} L${x - 10} ${y - h * 0.8} L${x} ${y - h} L${x + 10} ${y - h * 0.8} L${x + 10} ${y} Z`} fill={c(i % 2 ? "#33eeff" : "#9a68ff")} className={hidden ? undefined : styles.glowSoft} />
        ))}
      </>
    ),
    orbs: (
      <>
        <rect x="74" y="0" width="12" height="80" fill={c("#ffd27a")} opacity="0.25" />
        <circle cx="80" cy="80" r="26" fill={c("#ffd27a")} opacity="0.25" />
        <circle cx="80" cy="80" r="12" fill={c("#fff3d6")} className={hidden ? undefined : styles.glow} />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 160 130" aria-hidden="true">
      {art[kind]}
    </svg>
  );
}

// ---------------------------------------------------------------- entries

const ENTRIES: Entry[] = [
  {
    id: "puffkin",
    tab: "creatures",
    name: "Puffkin",
    latin: "Pomponius curiosus",
    art: ({ hidden }) => <Puffkin hidden={hidden} />,
    blurb:
      "Round, pastel and almost entirely fluff. Puffkins live in little families and hop about their favourite patch of moss. They are terribly curious: stop nearby and they'll turn to watch you.",
    where: "In families all over the cave. One family lives right by where you arrive, and another in the cave.",
    tip: "Roll too close and they squeak and scatter. Bump one and it tumbles head over heels. Don't worry, it bounces.",
  },
  {
    id: "snail",
    tab: "creatures",
    name: "Glow-snail",
    latin: "Helix lanterna",
    art: ({ hidden }) => <Snail hidden={hidden} />,
    blurb:
      "A slow, gentle snail whose spiral shell glows like a night-light. Each one circles the foot of the same mushroom for its whole life.",
    where: "Creeping around the stems of the medium-sized mushrooms.",
    tip: "Very shy. Come close and it tucks into its shell; wait a moment and its eye-stalks peek back out.",
  },
  {
    id: "fish",
    tab: "creatures",
    name: "Lantern fish",
    latin: "Pisciculus luminosus",
    art: ({ hidden }) => <Fish hidden={hidden} />,
    blurb: "Small glowing fish that swim lazy loops in schools, each in its own pastel shade.",
    where: "In both lakes. You'll see the most if you dive into the deep lake.",
    tip: "They dart away if you swim straight at them. Hold still and they'll circle back.",
  },
  {
    id: "potion-color",
    tab: "potions",
    name: "Colour flask",
    latin: "Round bottle",
    art: ({ hidden }) => <Bottle hidden={hidden} shape="flask" color="#ff7ac8" />,
    blurb: "A round flask that dyes your fur. Your red-panda rings and cream patches stay, just in a new shade.",
    where: "Two by the arrival point, one on the bridge, one at the top of the falls, one in the crystal tunnel, and more hidden around.",
    tip: "The Red panda flask (it's in a hollow log) turns you back to your usual colour.",
  },
  {
    id: "potion-fluff",
    tab: "potions",
    name: "Fluff jar",
    latin: "Squat jar",
    art: ({ hidden }) => <Bottle hidden={hidden} shape="jar" color="#fff1dc" />,
    blurb: "A squat, creamy jar. Every sip makes your fur longer and fluffier, up to three levels.",
    where: "By the arrival point, on top of the Great Cap, and in the cave.",
    tip: "A fourth sip at maximum fluff trims you back to normal.",
  },
  {
    id: "potion-glow",
    tab: "potions",
    name: "Glow vial",
    latin: "Tall pale vial",
    art: ({ hidden }) => <Bottle hidden={hidden} shape="vial" color="#bff6ff" />,
    blurb: "You glow much brighter for a minute, lighting up everything around you.",
    where: "In the cave, and on the shore of the shallow lake.",
    tip: "Drink one before swimming into the crystal tunnel.",
  },
  {
    id: "potion-bounce",
    tab: "potions",
    name: "Bounce vial",
    latin: "Tall green vial",
    art: ({ hidden }) => <Bottle hidden={hidden} shape="vial" color="#9dff5a" />,
    blurb: "For 45 seconds your jumps are 30% higher and mushroom caps fling you 25% higher.",
    where: "Near the lime giant mushroom, and south of the shallow lake.",
    tip: "Combine it with a stomp (C in the air) onto a big cap.",
  },
  {
    id: "potion-fly",
    tab: "potions",
    name: "Wing drop",
    latin: "Teardrop bottle",
    art: ({ hidden }) => <Bottle hidden={hidden} shape="drop" color="#e9dcff" />,
    blurb: "A teardrop of pale lilac. Drink it and you sprout a pair of soft little wings for 40 seconds.",
    where: "Near where you arrive, at the south end of the rope bridge, and east of the crystal garden.",
    tip: "Tap Space in the air to flap higher and higher; hold Space to glide down gently.",
  },
  {
    id: "greatcap",
    tab: "places",
    name: "The Great Cap",
    latin: "The giant cyan mushroom",
    art: ({ hidden }) => <Place hidden={hidden} kind="greatcap" />,
    blurb: "The enormous glowing mushroom you see when you arrive, ringed by a spiral staircase of smaller caps.",
    where: "Straight ahead from where you arrive.",
    tip: "Hop onto the lowest step, then bounce from cap to cap. There's an orb and a fluff jar on top.",
  },
  {
    id: "puffball",
    tab: "places",
    name: "Spring puffball",
    latin: "Glowing ringed pad",
    art: ({ hidden }) => <Place hidden={hidden} kind="puffball" />,
    blurb: "A springy, glowing puffball beside almost every big mushroom. Roll onto it and it launches you up and onto that mushroom's cap.",
    where: "Just outside the edge of each big mushroom's cap.",
    tip: "Hold C while rolling onto one if you want to sit on it without launching.",
  },
  {
    id: "logs",
    tab: "places",
    name: "Hollow logs",
    latin: "Fallen and mossy",
    art: ({ hidden }) => <Place hidden={hidden} kind="logs" />,
    blurb: "Old hollow logs with tiny amber mushrooms growing inside. Too narrow for a normal ball.",
    where: "Scattered all over, with three close to where you arrive.",
    tip: "Hold C to duck and you'll fit through. Some have orbs inside.",
  },
  {
    id: "deeplake",
    tab: "places",
    name: "The Deep Lake",
    latin: "Swimmable",
    art: ({ hidden }) => <Place hidden={hidden} kind="deeplake" />,
    blurb: "A deep, cold, glowing lake. You can dive right to the bottom.",
    where: "East of the Great Cap, with a rope bridge across it.",
    tip: "Underwater, Space swims up and C dives. Press Space at the surface to hop out.",
  },
  {
    id: "tunnel",
    tab: "places",
    name: "Crystal Tunnel",
    latin: "Flooded passage",
    art: ({ hidden }) => <Place hidden={hidden} kind="tunnel" />,
    blurb: "A flooded passage lined with glowing crystals that runs under the shore.",
    where: "The opening is on the floor of the deep lake.",
    tip: "Follow it all the way and it brings you up into a pool inside the cave.",
  },
  {
    id: "cave",
    tab: "places",
    name: "The Cave",
    latin: "Rock dome",
    art: ({ hidden }) => <Place hidden={hidden} kind="cave" />,
    blurb: "A quiet dome of rock with glowworms on its ceiling, crystals along its walls and a family of puffkins inside.",
    where: "East of the deep lake. The doorway faces south, up a gentle ramp.",
    tip: "There's an orb, a glow vial and a fluff jar inside.",
  },
  {
    id: "falls",
    tab: "places",
    name: "The Falls",
    latin: "Glowing waterfall",
    art: ({ hidden }) => <Place hidden={hidden} kind="falls" />,
    blurb: "Glowing water spills from a spring on top of a rock spire into the deep lake.",
    where: "On the west shore of the deep lake.",
    tip: "A puffball on the far side of the spire launches you to the top.",
  },
  {
    id: "bridge",
    tab: "places",
    name: "Rope Bridge",
    latin: "Lantern-lit",
    art: ({ hidden }) => <Place hidden={hidden} kind="bridge" />,
    blurb: "A wooden bridge with lanterns and rope rails, arching over the middle of the deep lake.",
    where: "Across the deep lake, north to south.",
    tip: "There's a sky-blue colour flask waiting at the top of the arch.",
  },
  {
    id: "crystals",
    tab: "places",
    name: "Crystal Garden",
    latin: "Violet and cyan",
    art: ({ hidden }) => <Place hidden={hidden} kind="crystals" />,
    blurb: "A cluster of huge crystals leaning out from one spot, glowing violet and cyan.",
    where: "South-west of the Great Cap.",
    tip: "There's a gap in the middle with an orb and a lilac flask.",
  },
  {
    id: "orbs",
    tab: "places",
    name: "Light orbs",
    latin: "Collectible",
    art: ({ hidden }) => <Place hidden={hidden} kind="orbs" />,
    blurb: "Warm golden lights hidden all over the cave. Each has a faint pillar of light above it so you can spot it from afar.",
    where: "On giant caps, inside logs, over the lake, in the tunnel, on top of the falls…",
    tip: "Your count is at the top right. Can you find every one?",
  },
];

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "creatures", label: "Creatures" },
  { id: "potions", label: "Potions" },
  { id: "places", label: "Places" },
  { id: "controls", label: "Controls" },
];

const CONTROLS: Array<[string, string]> = [
  ["W A S D", "Roll"],
  ["Shift", "Sprint"],
  ["Space", "Jump (hold for higher)"],
  ["C", "Duck: fit through hollow logs"],
  ["Hold C, then Space", "Super jump"],
  ["C in the air", "Stomp: bounce higher off a cap"],
  ["Hold C landing on a cap", "Stop bouncing"],
  ["Space / C underwater", "Swim up / dive"],
  ["Space in the air (with wings)", "Flap; hold to glide"],
  ["Mouse or Q E", "Look around"],
  ["Scroll", "Zoom"],
  ["R", "Back to the start"],
  ["M", "Sound on / off"],
  ["I", "Open or close this guide"],
];

// ---------------------------------------------------------------- panel

const EMPTY = { open: false, found: [] as GuideId[], colors: [] as string[], last: null, focus: null };

const TAB_ORDER: Tab[] = ["creatures", "potions", "places", "controls"];

/** Little handwritten scribbles in the margin of each discovered page. */
const NOTES: Record<GuideId, string> = {
  puffkin: "they squeaked at me!",
  snail: "so shy… waited ages",
  fish: "followed me in the lake",
  "potion-color": "tastes like sherbet",
  "potion-fluff": "fluffiest day of my life",
  "potion-glow": "great for dark tunnels",
  "potion-bounce": "boing boing boing",
  "potion-fly": "I can see everything from up here!",
  greatcap: "made it to the top ✓",
  puffball: "whoosh!!",
  logs: "duck to squeeze through",
  deeplake: "cold. very cold.",
  tunnel: "hold your breath (just kidding)",
  cave: "glowworms on the ceiling",
  falls: "the spring on top is warm",
  bridge: "don't look down",
  crystals: "they hum a little",
  orbs: "collect them all",
};

type Shown = { tab: Tab; id: GuideId };

export function FieldGuide() {
  const g = useSyncExternalStore(guideStore.subscribe, guideStore.get, () => EMPTY);
  const orbs = useSyncExternalStore(orbStore.subscribe, orbStore.get, () => ({ found: [] as string[], total: 0, last: null }));
  const [tab, setTab] = useState<Tab>("creatures");
  const [selected, setSelected] = useState<GuideId>("puffkin");
  // what the pages currently show; it lags `tab`/`selected` while a page turns
  const [shown, setShown] = useState<Shown>({ tab: "creatures", id: "puffkin" });
  const [flip, setFlip] = useState<{ dir: 1 | -1; key: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const bookRef = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => guideStore.load(), []);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  // I toggles, Escape closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyI" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        guideStore.toggle();
      } else if (e.code === "Escape" && guideStore.isOpen()) {
        guideStore.setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /** Turn to a page, animating the leaf over the spine. */
  const turnTo = (next: Shown) => {
    if (next.tab === shown.tab && next.id === shown.id) return;
    setTab(next.tab);
    setSelected(next.id);
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setShown(next);
      return;
    }
    const order = (x: Shown) => TAB_ORDER.indexOf(x.tab) * 100 + ENTRIES.findIndex((e) => e.id === x.id);
    const dir: 1 | -1 = order(next) >= order(shown) ? 1 : -1;
    timers.current.forEach((t) => window.clearTimeout(t));
    setFlip({ dir, key: Date.now() });
    timers.current = [
      window.setTimeout(() => setShown(next), 300),
      window.setTimeout(() => setFlip(null), 680),
    ];
  };

  // opening: free the mouse, jump to the newest discovery, move focus in
  useEffect(() => {
    if (g.open) {
      lastFocus.current = document.activeElement as HTMLElement | null;
      if (document.pointerLockElement) document.exitPointerLock();
      if (g.focus) {
        const e = ENTRIES.find((x) => x.id === g.focus);
        if (e) {
          setTab(e.tab);
          setSelected(e.id);
          setShown({ tab: e.tab, id: e.id });
        }
        guideStore.clearFocus();
      }
      window.setTimeout(() => bookRef.current?.focus(), 0);
    } else {
      lastFocus.current?.focus?.();
    }
  }, [g.open, g.focus]);

  // a little note when something new goes into the book
  useEffect(() => {
    if (!g.last) return;
    const e = ENTRIES.find((x) => x.id === g.last!.id);
    if (!e) return;
    setToast(e.name);
    const t = window.setTimeout(() => setToast(null), 3800);
    return () => window.clearTimeout(t);
  }, [g.last]);

  const known = (id: GuideId) => g.found.includes(id);
  const total = ENTRIES.length;
  const count = ENTRIES.filter((e) => known(e.id)).length;
  const list = useMemo(() => ENTRIES.filter((e) => e.tab === shown.tab), [shown.tab]);
  const current = ENTRIES.find((e) => e.id === shown.id && e.tab === shown.tab) ?? list[0];
  const pageNo = (TAB_ORDER.indexOf(shown.tab) * 12 + Math.max(0, list.findIndex((e) => e.id === current?.id))) * 2 + 3;

  const rightPage =
    shown.tab === "controls" ? (
      <div className={styles.controlsPage}>
        <h3>Handling your ball</h3>
        <p className={styles.latin}>Notes for the curious traveller</p>
        <dl className={styles.controlList}>
          {CONTROLS.slice(6).map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    ) : current && known(current.id) ? (
      <>
        <span className={styles.stamp}>Recorded</span>
        <div className={styles.art}>{current.art({ hidden: false })}</div>
        <span className={styles.note}>{NOTES[current.id]}</span>
        <h3>{current.name}</h3>
        <p className={styles.latin}>{current.latin}</p>
        <p className={styles.blurb}>{current.blurb}</p>
        <dl className={styles.facts}>
          <dt>Where</dt>
          <dd>{current.where}</dd>
          <dt>Tip</dt>
          <dd>{current.tip}</dd>
        </dl>
        {current.id === "potion-color" && (
          <div className={styles.swatches}>
            {COLOR_POTIONS.map((c) => {
              const tried = g.colors.includes(c.name);
              return (
                <span key={c.name} className={styles.swatch} title={tried ? c.name : "Not tried yet"}>
                  <i style={{ background: tried ? c.hex : "transparent", borderColor: c.hex }} />
                  {tried ? c.name : "?"}
                </span>
              );
            })}
          </div>
        )}
        {current.id === "orbs" && (
          <p className={styles.progress}>
            Found {orbs.found.length} of {orbs.total || "?"}
          </p>
        )}
      </>
    ) : current ? (
      <>
        <div className={`${styles.art} ${styles.artHidden}`}>{current.art({ hidden: true })}</div>
        <h3>Not yet discovered</h3>
        <p className={styles.latin}>Keep exploring…</p>
        <dl className={styles.facts}>
          <dt>Hint</dt>
          <dd>{current.where}</dd>
        </dl>
      </>
    ) : null;

  return (
    <>
      <button type="button" className={styles.openButton} onClick={() => guideStore.toggle()} aria-expanded={g.open}>
        <span className={styles.bookIcon} aria-hidden="true" />
        Field guide <kbd>I</kbd>
        {count > 0 && (
          <span className={styles.badge}>
            {count}/{total}
          </span>
        )}
      </button>

      <div className={`${styles.toast} ${toast ? styles.toastShown : ""}`} role="status">
        {toast && (
          <>
            New in your field guide: <strong>{toast}</strong> · press <kbd>I</kbd>
          </>
        )}
      </div>

      {g.open && (
        <div className={styles.backdrop} onClick={() => guideStore.setOpen(false)}>
          <div
            ref={bookRef}
            className={styles.book}
            role="dialog"
            aria-modal="true"
            aria-labelledby="guide-title"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ribbon bookmarks, one per section */}
            <nav className={styles.bookmarks} role="tablist" aria-label="Guide sections">
              {TABS.map((t) => {
                const inTab = ENTRIES.filter((e) => e.tab === t.id);
                const n = inTab.filter((e) => known(e.id)).length;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={tab === t.id}
                    className={`${styles.ribbon} ${styles[`ribbon_${t.id}`]} ${tab === t.id ? styles.ribbonActive : ""}`}
                    onClick={() => turnTo({ tab: t.id, id: t.id === "controls" ? shown.id : inTab[0].id })}
                  >
                    <span>{t.label}</span>
                    {t.id !== "controls" && (
                      <small>
                        {n}/{inTab.length}
                      </small>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className={styles.cover}>
              <span className={`${styles.corner} ${styles.cornerTL}`} aria-hidden="true" />
              <span className={`${styles.corner} ${styles.cornerTR}`} aria-hidden="true" />
              <span className={`${styles.corner} ${styles.cornerBL}`} aria-hidden="true" />
              <span className={`${styles.corner} ${styles.cornerBR}`} aria-hidden="true" />
              <button type="button" className={styles.clasp} onClick={() => guideStore.setOpen(false)} aria-label="Close field guide">
                ×
              </button>

              <div className={styles.pageBlock}>
                <div className={styles.spread}>
                  {/* left page: title + index of this section */}
                  <section className={`${styles.page} ${styles.pageLeft}`}>
                    <header className={styles.title}>
                      <h2 id="guide-title">Field Guide to the Underground</h2>
                      <p>
                        {count} of {total} entries discovered
                      </p>
                      <span className={styles.owner}>property of one small, very fluffy explorer</span>
                    </header>
                    {shown.tab === "controls" ? (
                      <dl className={styles.controlList}>
                        {CONTROLS.slice(0, 6).map(([k, v]) => (
                          <div key={k}>
                            <dt>{k}</dt>
                            <dd>{v}</dd>
                          </div>
                        ))}
                      </dl>
                    ) : (
                      <ol className={styles.index}>
                        {list.map((e) => {
                          const k = known(e.id);
                          return (
                            <li key={e.id}>
                              <button
                                type="button"
                                className={`${styles.item} ${current?.id === e.id ? styles.itemActive : ""}`}
                                onClick={() => turnTo({ tab: shown.tab, id: e.id })}
                                aria-current={current?.id === e.id}
                              >
                                <span className={`${styles.thumb} ${k ? "" : styles.artHidden}`}>{e.art({ hidden: !k })}</span>
                                <span className={styles.itemName}>{k ? e.name : "???"}</span>
                                <span className={styles.dots} aria-hidden="true" />
                              </button>
                            </li>
                          );
                        })}
                      </ol>
                    )}
                    <span className={styles.folio}>{pageNo - 1}</span>
                  </section>

                  <div className={styles.gutter} aria-hidden="true" />

                  {/* right page: the entry itself */}
                  <section className={`${styles.page} ${styles.pageRight}`} aria-live="polite">
                    <article className={styles.entry}>{rightPage}</article>
                    <span className={styles.folio}>{pageNo}</span>
                    {flip && (
                      <div
                        key={flip.key}
                        className={`${styles.leaf} ${flip.dir > 0 ? styles.leafForward : styles.leafBack}`}
                        aria-hidden="true"
                      >
                        <div className={styles.leafFront} />
                        <div className={styles.leafBackFace} />
                      </div>
                    )}
                  </section>
                </div>
              </div>
            </div>

            <footer className={styles.foot}>
              <span>
                <kbd>I</kbd> or <kbd>Esc</kbd> to close
              </span>
              {count > 0 && (
                <button
                  type="button"
                  className={styles.resetLink}
                  onClick={() => {
                    if (window.confirm("Forget everything in the field guide?")) guideStore.reset();
                  }}
                >
                  forget discoveries
                </button>
              )}
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
