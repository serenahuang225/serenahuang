"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { lineFor, storyStore } from "./story-store";
import { ENERGY_NEEDED, NPCS, type NpcId } from "./story-data";
import { nextStep, questSteps, type Step } from "./quest";
import { orbStore } from "./orb-store";
import { guideStore } from "./guide-store";
import { sound } from "./audio";
import { isTouchDevice } from "./touch";
import styles from "./story-hud.module.css";

const EMPTY_ORBS = { found: [] as string[], total: 0, last: null };

function useStory() {
  return useSyncExternalStore(storyStore.subscribe, storyStore.get, storyStore.get);
}

// ---------------------------------------------------------------- portraits

export function Portrait({ who }: { who: NpcId | "bob" }) {
  const color = who === "bob" ? "#d4532e" : NPCS.find((n) => n.id === who)?.color ?? "#ccc";
  return (
    <svg viewBox="0 0 80 80" aria-hidden="true" className={styles.portraitSvg}>
      <defs>
        <radialGradient id={`pg-${who}`} cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#fff" stopOpacity="0.45" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      {who === "moss" ? (
        <>
          <ellipse cx="44" cy="58" rx="26" ry="9" fill="#b9a6c9" />
          <circle cx="36" cy="40" r="20" fill={color} />
          <path d="M36 40 m0 -3 a3 3 0 1 1 -3 3 a6 6 0 1 1 6 6 a9 9 0 1 1 -9 -9 a12 12 0 1 1 12 12" stroke="#2a8fa5" strokeWidth="2.5" fill="none" />
          <path d="M60 52 L 58 30 M66 52 L 70 30" stroke="#b9a6c9" strokeWidth="3" strokeLinecap="round" />
          <circle cx="58" cy="28" r="4" fill="#bff6ff" />
          <circle cx="70" cy="28" r="4" fill="#bff6ff" />
        </>
      ) : who === "finn" ? (
        <>
          <path d="M60 40 L 76 28 L 72 40 L 76 52 Z" fill="#ffb347" />
          <ellipse cx="40" cy="42" rx="24" ry="17" fill={color} />
          <path d="M34 26 Q 30 10 20 12" stroke="#8a6a3a" strokeWidth="2" fill="none" />
          <circle cx="19" cy="12" r="5" fill="#fff6c0" />
          <circle cx="28" cy="38" r="6" fill="#fbf8ff" />
          <circle cx="27" cy="39" r="3.4" fill="#1a0f24" />
          <path d="M20 50 Q 24 53 28 50" stroke="#1a0f24" strokeWidth="2" fill="none" />
        </>
      ) : who === "quartz" ? (
        <>
          <path d="M40 6 L 62 40 L 40 74 L 18 40 Z" fill={color} />
          <path d="M40 6 L 40 74 M18 40 L 62 40" stroke="#fff" strokeOpacity="0.3" />
          <ellipse cx="32" cy="38" rx="5" ry="6" fill="#fbf8ff" />
          <ellipse cx="48" cy="38" rx="5" ry="6" fill="#fbf8ff" />
          <circle cx="32" cy="39" r="3" fill="#1a0f24" />
          <circle cx="48" cy="39" r="3" fill="#1a0f24" />
        </>
      ) : (
        <>
          {who !== "bob" && <path d="M44 16 C 46 8 52 6 56 4" stroke="#3a2f45" strokeWidth="2.5" fill="none" />}
          {who !== "bob" && <circle cx="57" cy="4" r="4" fill={color} />}
          <circle cx="40" cy="44" r="30" fill={color} />
          {who === "bob" &&
            Array.from({ length: 22 }, (_, i) => {
              const a = (i / 22) * Math.PI * 2;
              return <line key={i} x1={40 + Math.cos(a) * 28} y1={44 + Math.sin(a) * 28} x2={40 + Math.cos(a) * 33} y2={44 + Math.sin(a) * 33} stroke={color} strokeWidth="3" strokeLinecap="round" />;
            })}
          <ellipse cx="30" cy="40" rx="6" ry="7" fill="#fbf8ff" />
          <ellipse cx="50" cy="40" rx="6" ry="7" fill="#fbf8ff" />
          <circle cx="31" cy="41" r="3.6" fill="#1a0f24" />
          <circle cx="51" cy="41" r="3.6" fill="#1a0f24" />
          {who !== "bob" && (
            <>
              <ellipse cx="22" cy="52" rx="5" ry="3" fill="#ff7fa8" opacity="0.7" />
              <ellipse cx="58" cy="52" rx="5" ry="3" fill="#ff7fa8" opacity="0.7" />
            </>
          )}
          <path d="M36 52 Q 40 56 44 52" stroke="#1a0f24" strokeWidth="2" fill="none" strokeLinecap="round" />
          {who === "elder" && (
            <>
              <circle cx="30" cy="40" r="9" fill="none" stroke="#c9a663" strokeWidth="2" />
              <circle cx="50" cy="40" r="9" fill="none" stroke="#c9a663" strokeWidth="2" />
              <ellipse cx="29" cy="28" rx="7" ry="3" fill="#fff" />
              <ellipse cx="51" cy="28" rx="7" ry="3" fill="#fff" />
            </>
          )}
          {who === "pip" && <ellipse cx="40" cy="14" rx="9" ry="4" fill="#5fd18a" transform="rotate(-18 40 14)" />}
        </>
      )}
      <circle cx="40" cy="40" r="38" fill={`url(#pg-${who})`} />
    </svg>
  );
}

// ---------------------------------------------------------------- conversation bubble

const PITCH: Record<string, number> = { bob: 0.9, pip: 1.5, moss: 0.65, finn: 1.2, elder: 0.75, quartz: 1.8 };

function Dialogue() {
  const s = useStory();
  const line = lineFor(s.talk);
  const [shown, setShown] = useState(0);
  const key = s.talk ? `${s.talk.who}:${s.talk.node}` : "";
  const typing = line ? shown < line.text.length : false;
  const choices = line
    ? line.choices.filter((c) => (!c.unlessHas || !storyStore.has(c.unlessHas)) && (!c.ifHas || storyStore.has(c.ifHas)))
    : [];

  // typewriter, with a soft blip every few letters
  useEffect(() => {
    setShown(0);
    if (!line) return;
    let i = 0;
    const t = window.setInterval(() => {
      i += 1;
      setShown(i);
      if (i % 3 === 0 && s.talk) sound.blip(PITCH[s.talk.who] ?? 1);
      if (i >= line.text.length) window.clearInterval(t);
    }, 22);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // keys: 1–4 choose, Enter/Space finishes the line or takes the first choice, Esc leaves
  useEffect(() => {
    if (!line) return;
    const onKey = (e: KeyboardEvent) => {
      if (guideStore.isOpen()) return;
      const n = Number(e.key);
      if (e.code === "Escape" && s.talk?.who !== "bob") {
        storyStore.closeTalk();
      } else if ((e.code === "Enter" || e.code === "Space") && typing) {
        e.preventDefault();
        setShown(line.text.length);
      } else if ((e.code === "Enter" || e.code === "Space") && choices.length) {
        e.preventDefault();
        storyStore.choose(choices[0].next, choices[0].effect);
      } else if (n >= 1 && n <= choices.length && !typing) {
        storyStore.choose(choices[n - 1].next, choices[n - 1].effect);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [line, typing, choices, s.talk]);

  if (!s.talk || !line) return null;
  const who = line.bob ? "bob" : s.talk.who;
  const name = who === "bob" ? "Bob" : NPCS.find((n) => n.id === who)?.name;
  return (
    <div className={styles.dialogue} role="dialog" aria-label={`Talking with ${name}`}>
      <div className={styles.bubble} onClick={() => typing && setShown(line.text.length)}>
        <div className={styles.portrait}>
          <Portrait who={who} />
        </div>
        <div className={styles.speech}>
          <p className={styles.speaker}>{name}</p>
          <p className={styles.say} aria-live="polite">
            {line.text.slice(0, shown)}
            {typing && <span className={styles.caret} aria-hidden="true" />}
          </p>
        </div>
      </div>
      {!typing && (
        <ol className={styles.choices}>
          {choices.map((c, i) => (
            <li key={c.text}>
              <button type="button" onClick={() => storyStore.choose(c.next, c.effect)}>
                <kbd>{i + 1}</kbd>
                {c.text}
              </button>
            </li>
          ))}
        </ol>
      )}
      {typing && <p className={styles.skip}>{isTouchDevice() ? "Tap to skip" : "Space to skip"}</p>}
    </div>
  );
}

// ---------------------------------------------------------------- Quartz's crystal song

const CRYSTALS = [
  { name: "blue", color: "#7fe8ff" },
  { name: "violet", color: "#b48cff" },
  { name: "pink", color: "#ff8be0" },
  { name: "mint", color: "#8cffd9" },
];
const VERSES = [3, 4, 5];

/**
 * Quartz hums a little tune on four crystals; Bob sings it back. Three
 * verses, each one note longer. A wrong note just means she hums it again.
 */
function SongPuzzle() {
  const s = useStory();
  const open = s.puzzle === "song";
  const [song, setSong] = useState<number[]>([]);
  const [verse, setVerse] = useState(0);
  const [mode, setMode] = useState<"listen" | "play" | "oops" | "done">("listen");
  const [step, setStep] = useState(0);
  const [lit, setLit] = useState<number | null>(null);
  const timers = useRef<number[]>([]);
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));
  const clear = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  // a fresh tune each time the puzzle opens
  useEffect(() => {
    if (!open) return;
    const tune: number[] = [];
    for (let i = 0; i < VERSES[VERSES.length - 1]; i++) {
      let n = Math.floor(Math.random() * 4);
      if (i > 0 && n === tune[i - 1]) n = (n + 1 + Math.floor(Math.random() * 3)) % 4;
      tune.push(n);
    }
    setSong(tune);
    setVerse(0);
    setMode("listen");
    if (document.pointerLockElement) document.exitPointerLock();
    return clear;
  }, [open]);

  // Quartz hums the verse
  useEffect(() => {
    if (!open || mode !== "listen" || !song.length) return;
    clear();
    const len = VERSES[verse];
    const gap = verse === 0 ? 720 : 620;
    for (let i = 0; i < len; i++) {
      later(() => {
        setLit(song[i]);
        sound.crystal(song[i]);
      }, 900 + i * gap);
      later(() => setLit(null), 900 + i * gap + gap * 0.6);
    }
    later(() => {
      setStep(0);
      setMode("play");
    }, 900 + len * gap);
    return clear;
  }, [open, mode, verse, song]); // eslint-disable-line react-hooks/exhaustive-deps

  const sing = (n: number) => {
    if (mode !== "play") return;
    sound.crystal(n);
    setLit(n);
    later(() => setLit(null), 260);
    if (song[step] !== n) {
      sound.oops();
      setMode("oops");
      later(() => setMode("listen"), 1300);
      return;
    }
    if (step + 1 < VERSES[verse]) {
      setStep(step + 1);
      return;
    }
    if (verse + 1 < VERSES.length) {
      setMode("listen");
      setVerse(verse + 1);
      return;
    }
    setMode("done");
    later(() => storyStore.solvePuzzle(), 1100);
  };

  // keys 1–4 sing, Esc leaves
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= 4) sing(n - 1);
      else if (e.code === "Escape") storyStore.leavePuzzle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!open) return null;
  const say =
    mode === "listen"
      ? verse === 0
        ? "Listen closely…"
        : "Lovely! Now a little longer… listen."
      : mode === "play"
        ? "Your turn. Sing it back!"
        : mode === "oops"
          ? "Hmm, not quite. I'll hum it again…"
          : "Yes! That's the song!";
  const touch = isTouchDevice();
  return (
    <div className={styles.dialogue} role="dialog" aria-label="Quartz's crystal song">
      <div className={styles.bubble}>
        <div className={styles.portrait}>
          <Portrait who="quartz" />
        </div>
        <div className={styles.speech}>
          <p className={styles.speaker}>
            Quartz <span className={styles.verse}>verse {verse + 1} of {VERSES.length}</span>
          </p>
          <p className={styles.say} aria-live="polite">
            {say}
          </p>
          <p className={styles.songDots} aria-hidden="true">
            {Array.from({ length: VERSES[verse] }, (_, i) => (
              <i key={i} className={mode === "play" && i < step ? styles.dotOn : mode === "done" ? styles.dotOn : ""} />
            ))}
          </p>
        </div>
      </div>
      <div className={styles.crystals}>
        {CRYSTALS.map((c, i) => (
          <button
            key={c.name}
            type="button"
            className={`${styles.crystalKey} ${lit === i ? styles.crystalLit : ""}`}
            style={{ "--c": c.color } as React.CSSProperties}
            onClick={() => sing(i)}
            disabled={mode !== "play"}
            aria-label={`${c.name} crystal`}
          >
            <span className={styles.gem} aria-hidden="true" />
            {!touch && <kbd>{i + 1}</kbd>}
          </button>
        ))}
      </div>
      <button type="button" className={styles.songLeave} onClick={() => storyStore.leavePuzzle()}>
        Maybe later{touch ? "" : " (Esc)"}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------- objectives + prompts

const OBJ_KEY = "underground-objectives-open";

/** On a replay (once there's a best time to beat), a small running clock. */
function RunClock() {
  const s = useStory();
  const [now, setNow] = useState(() => Date.now());
  const [best, setBest] = useState<number | null>(null);
  useEffect(() => setBest(readBest()), [s.phase]);
  useEffect(() => {
    if (s.phase !== "play" || !best) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [s.phase, best]);
  if (s.phase !== "play" || !best || !s.startedAt) return null;
  const ms = now - s.startedAt;
  return (
    <span className={`${styles.runClock} ${ms > best ? styles.runSlow : ""}`} title={`Best time ${clock(best)}`}>
      {clock(ms)} <small>/ {clock(best)}</small>
    </span>
  );
}

function Objectives() {
  const s = useStory();
  const orbs = useSyncExternalStore(orbStore.subscribe, orbStore.get, () => EMPTY_ORBS);
  const [open, setOpenState] = useState(false);
  useEffect(() => {
    try {
      setOpenState(window.localStorage.getItem(OBJ_KEY) === "1");
    } catch {
      // ignore
    }
  }, []);
  const setOpen = (fn: (o: boolean) => boolean) =>
    setOpenState((o) => {
      const v = fn(o);
      try {
        window.localStorage.setItem(OBJ_KEY, v ? "1" : "0");
      } catch {
        // ignore
      }
      return v;
    });
  const lastNext = useRef<string | null>(null);
  const active = s.phase === "play" || s.phase === "free";
  const steps = questSteps(s, orbs.found.length);
  // the story steps unlock one at a time, as Bob meets people and finds things
  const story = steps.filter((x) => !x.final && !x.optional);
  const current = story.find((x) => !x.done) ?? null;
  const revealed = current ? story.slice(0, story.indexOf(current) + 1) : story;
  // ...while the three goals for getting home are always shown together
  const finale = steps.filter((x) => x.final);
  const extras = steps.filter((x) => x.optional);
  const next = nextStep(steps);

  // when a step is finished, say what's next
  const nextKey = next ? next.text.replace(/\d+\/\d+.*$/, "") : null;
  useEffect(() => {
    if (!active) return;
    if (lastNext.current !== null && nextKey !== lastNext.current && next) storyStore.notify(`Next: ${next.text}`);
    lastNext.current = nextKey;
  }, [nextKey, active, next]);

  if (!active) return null;
  const row = (it: Step) => (
    <li key={it.text} className={`${it.done ? styles.objDone : ""} ${it === next ? styles.objCurrent : ""}`}>
      <i aria-hidden="true">{it.done ? "✓" : ""}</i>
      <span>
        {it.text}
        {it.optional && !it.done && <em> · optional</em>}
      </span>
    </li>
  );
  return (
    <section className={styles.objectives} aria-label="Objectives">
      <button type="button" className={styles.objHead} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span>{s.phase === "free" ? "Bob made it home!" : "Help Bob get home"}</span>
        <RunClock />
        <span className={styles.objCount}>{open ? "hide steps –" : "all steps +"}</span>
      </button>
      {/* finished story steps, then the one you're on now */}
      {open && revealed.some((x) => x.done) && <ul>{revealed.filter((x) => x.done).map(row)}</ul>}
      {next && (
        <div className={styles.nextStep}>
          <span className={styles.nextLabel}>Next</span>
          <p>{next.text}</p>
        </div>
      )}
      {open && (
        <>
          <p className={styles.groupLabel}>To fly home</p>
          <ul>{finale.map(row)}</ul>
          <ul>{extras.map(row)}</ul>
        </>
      )}
    </section>
  );
}

function Prompt() {
  const s = useStory();
  if (!s.prompt || s.talk || s.puzzle) return null;
  if (s.prompt.startsWith("T —") && isTouchDevice()) return null;
  return (
    <div className={styles.prompt} role="status">
      {s.prompt.startsWith("T —") ? (
        <>
          <kbd>T</kbd>
          {s.prompt.slice(3)}
        </>
      ) : (
        s.prompt
      )}
    </div>
  );
}

function Notes() {
  const s = useStory();
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    if (!s.note) return;
    setText(s.note.text);
    const t = window.setTimeout(() => setText(null), 3200);
    return () => window.clearTimeout(t);
  }, [s.note]);
  return (
    <div className={`${styles.note} ${text ? styles.noteShown : ""}`} role="status">
      {text}
    </div>
  );
}

/** Turns "Press [Space] to jump" into text with key caps. */
export function withKeys(text: string) {
  return text.split(/(\[[^\]]+\])/).map((part, i) =>
    part.startsWith("[") && part.endsWith("]") ? <kbd key={i}>{part.slice(1, -1)}</kbd> : <span key={i}>{part}</span>,
  );
}

function Tip() {
  const s = useStory();
  const [tip, setTip] = useState<string | null>(null);
  useEffect(() => {
    if (!s.tip) return;
    setTip(s.tip.text);
    const t = window.setTimeout(() => setTip(null), 6800);
    return () => window.clearTimeout(t);
  }, [s.tip]);
  const hidden = !tip || !!s.talk;
  return (
    <div className={`${styles.tip} ${hidden ? "" : styles.tipShown}`} role="status" aria-hidden={hidden}>
      <span className={styles.tipLabel}>Tip</span>
      <p>{tip ? withKeys(tip) : null}</p>
    </div>
  );
}

function Flash() {
  const s = useStory();
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!s.flash) return;
    setOn(true);
    const t = window.setTimeout(() => setOn(false), 60);
    return () => window.clearTimeout(t);
  }, [s.flash]);
  return <div className={`${styles.flash} ${on ? styles.flashOn : ""}`} aria-hidden="true" />;
}

// ---------------------------------------------------------------- opening card + ending

function IntroCard() {
  const s = useStory();
  if (s.phase !== "card") return null;
  return (
    <div className={styles.cardWrap}>
      <div className={styles.card}>
        <div className={styles.cardBob}>
          <Portrait who="bob" />
        </div>
        <h2>Bob&apos;s Big Fall</h2>
        <p>
          Bob, a small and very fluffy ball, was rolling across a sunny meadow when the ground gave way beneath him. Down, down,
          down he fell — through a hole in the world called the <em>Sky Eye</em> — into a glowing cave far below.
        </p>
        <p>
          His little rocket broke into pieces on the way down. Help Bob find the <strong>7 rocket parts</strong>, gather{" "}
          <strong>{ENERGY_NEEDED} energy orbs</strong>, and fly back home. The creatures down here might help, if you stop to chat.
        </p>
        <button
          type="button"
          className={styles.begin}
          onClick={() => {
            sound.start();
            storyStore.begin();
          }}
          autoFocus
        >
          Begin
        </button>
      </div>
    </div>
  );
}

const BEST_KEY = "underground-best-v1";

function readBest() {
  try {
    const v = Number(window.localStorage.getItem(BEST_KEY));
    return v > 0 ? v : null;
  } catch {
    return null;
  }
}

export function clock(ms: number) {
  const t = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const sec = String(t % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

function Ending() {
  const s = useStory();
  const orbs = useSyncExternalStore(orbStore.subscribe, orbStore.get, () => EMPTY_ORBS);
  const [best, setBest] = useState<{ prev: number | null; isNew: boolean }>({ prev: null, isNew: false });
  const time = s.startedAt && s.endedAt ? s.endedAt - s.startedAt : null;

  // remember the fastest flight home (on this browser)
  useEffect(() => {
    if (s.phase !== "ended" || !time) return;
    const prev = readBest();
    const isNew = prev === null || time < prev;
    if (isNew) {
      try {
        window.localStorage.setItem(BEST_KEY, String(time));
      } catch {
        // ignore
      }
    }
    setBest({ prev, isNew: isNew && prev !== null });
  }, [s.phase, time]);

  if (s.phase !== "ended") return null;
  return (
    <div className={`${styles.cardWrap} ${styles.endingWrap}`}>
      <div className={styles.card}>
        <div className={styles.cardBob}>
          <Portrait who="bob" />
        </div>
        <h2>Bob made it home!</h2>
        <p>
          The little rocket roared up through the Sky Eye and out into the sunshine. Bob will never forget the Glowdeep — or the
          friends who helped him.
        </p>
        {time && (
          <p className={styles.endTime}>
            <span>Your time</span>
            <strong>{clock(time)}</strong>
            {best.isNew ? <em>New best! (was {clock(best.prev!)})</em> : best.prev ? <em>Best {clock(best.prev)}</em> : null}
          </p>
        )}
        <ul className={styles.stats}>
          <li>{s.met.length} of {NPCS.length} friends met</li>
          <li>
            {orbs.found.length} of {orbs.total} lights found
          </li>
          <li>
            {s.photos.length} photo{s.photos.length === 1 ? "" : "s"} taken
          </li>
        </ul>
        <p className={styles.endAsk}>Explore more of the Glowdeep, or go back and collect the parts faster?</p>
        <div className={styles.endButtons}>
          <button type="button" className={styles.begin} onClick={() => storyStore.keepExploring()} autoFocus>
            Explore more
          </button>
          <button
            type="button"
            className={styles.secondary}
            onClick={() => {
              orbStore.reset();
              storyStore.restart();
            }}
          >
            Collect them faster
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- full screen + mouse hint

function FullscreenButton() {
  const [fs, setFs] = useState(false);
  const [can, setCan] = useState(true);
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    setCan(!!document.fullscreenEnabled);
    setTouch(isTouchDevice());
  }, []);
  const [showEsc, setShowEsc] = useState(false);
  useEffect(() => {
    const on = () => {
      const now = !!document.fullscreenElement;
      setFs(now);
      setShowEsc(now);
    };
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);
  useEffect(() => {
    if (!showEsc) return;
    const t = window.setTimeout(() => setShowEsc(false), 5000);
    return () => window.clearTimeout(t);
  }, [showEsc]);
  if (!can) return null;
  return (
    <>
      <button
        type="button"
        className={styles.fsButton}
        onClick={() => toggleFullscreen()}
        aria-pressed={fs}
        title={fs ? "Exit full screen (Esc)" : "Full screen (F)"}
      >
        <span className={styles.fsIcon} aria-hidden="true" />
        {touch ? (fs ? "Exit" : "Full screen") : fs ? "Exit full screen" : "Full screen"}
        {!touch && <kbd>F</kbd>}
      </button>
      {fs && (
        <div className={`${styles.escNote} ${showEsc ? styles.escNoteShown : ""}`} role="status">
          {touch ? "Tap Exit to leave full screen" : <>Press <kbd>Esc</kbd> to exit full screen</>}
        </div>
      )}
    </>
  );
}

export function toggleFullscreen() {
  if (document.fullscreenElement) void document.exitFullscreen?.();
  else void document.documentElement.requestFullscreen?.().catch(() => {});
}

const LOOKED_KEY = "underground-looked-v1";

function LookHint() {
  const s = useStory();
  const [locked, setLocked] = useState(false);
  const [learned, setLearned] = useState(true);
  const moved = useRef(0);
  useEffect(() => {
    try {
      setLearned(window.localStorage.getItem(LOOKED_KEY) === "1");
    } catch {
      setLearned(false);
    }
    const onLock = () => setLocked(!!document.pointerLockElement);
    let last: { x: number; y: number } | null = null;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") {
        // a finger dragging the scene counts too (not the stick or buttons)
        if (!(e.target instanceof HTMLCanvasElement)) return;
        if (last) moved.current += Math.abs(e.clientX - last.x) + Math.abs(e.clientY - last.y);
        last = { x: e.clientX, y: e.clientY };
      } else if (!document.pointerLockElement) {
        return;
      } else {
        moved.current += Math.abs(e.movementX) + Math.abs(e.movementY);
      }
      if (moved.current > (e.pointerType === "touch" ? 220 : 600)) {
        setLearned(true);
        try {
          window.localStorage.setItem(LOOKED_KEY, "1");
        } catch {
          // ignore
        }
      }
    };
    const onUp = () => {
      last = null;
    };
    document.addEventListener("pointerlockchange", onLock);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      document.removeEventListener("pointerlockchange", onLock);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);
  if ((s.phase !== "play" && s.phase !== "free") || s.talk || s.puzzle) return null;
  if (locked) {
    return (
      <div className={styles.lookChip}>
        <span className={styles.mouseIcon} aria-hidden="true" />
        Move the mouse to look around · <kbd>Esc</kbd> frees the mouse
      </div>
    );
  }
  if (isTouchDevice()) {
    if (learned) return null;
    return (
      <div className={styles.lookHint}>
        <span className={styles.fingerIcon} aria-hidden="true" />
        <span>
          <strong>Drag anywhere</strong> to look around
        </span>
      </div>
    );
  }
  return (
    <div className={`${styles.lookHint} ${learned ? styles.lookHintQuiet : ""}`}>
      <span className={styles.mouseIcon} aria-hidden="true" />
      <span>
        <strong>Click anywhere</strong>, then move your mouse to look around
      </span>
    </div>
  );
}

// ---------------------------------------------------------------- compass

const POINTS = [
  { a: 0, t: "N" },
  { a: Math.PI / 2, t: "E" },
  { a: Math.PI, t: "S" },
  { a: -Math.PI / 2, t: "W" },
];

/** A little compass: the rose turns with the camera, the gold needle points at the next goal. */
function Compass() {
  const s = useStory();
  const orbs = useSyncExternalStore(orbStore.subscribe, orbStore.get, () => EMPTY_ORBS);
  const active = (s.phase === "play" || s.phase === "free") && !s.talk && !s.puzzle;
  const next = nextStep(questSteps(s, orbs.found.length));
  const goal = s.phase === "play" ? (next?.goal ?? null) : null;
  const label = goal ? next?.label : null;
  const rose = useRef<HTMLDivElement>(null);
  const needle = useRef<HTMLDivElement>(null);
  const dist = useRef<HTMLSpanElement>(null);
  const level = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    storyStore.here.goal = goal;
    return () => {
      storyStore.here.goal = null;
    };
  }, [goal]);

  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let shown = NaN;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const h = storyStore.here;
      // ease the dial a little so it doesn't jitter with the camera
      const d = Number.isNaN(shown) ? 0 : Math.atan2(Math.sin(h.heading - shown), Math.cos(h.heading - shown));
      shown = Number.isNaN(shown) ? h.heading : shown + d * 0.35;
      if (rose.current) rose.current.style.transform = `rotate(${-shown}rad)`;
      const aim = h.aim;
      if (!needle.current) return;
      if (!aim) {
        needle.current.style.opacity = "0";
        return;
      }
      const dx = aim.x - h.x;
      const dz = aim.z - h.z;
      const bearing = Math.atan2(dx, -dz);
      const m = Math.hypot(dx, dz);
      needle.current.style.opacity = "1";
      needle.current.style.transform = `rotate(${bearing - shown}rad)`;
      // text only when it changes: rewriting it every frame makes the page re-lay itself out
      const far = m < 4 ? "here!" : `${Math.round(m)} m`;
      if (dist.current && dist.current.textContent !== far) dist.current.textContent = far;
      if (level.current) {
        const dy = aim.y === undefined ? 0 : aim.y - h.y;
        const lvl = m < 30 && dy > 4 ? "▲ up high" : m < 30 && dy < -4 ? "▼ down below" : "";
        if (level.current.textContent !== lvl) level.current.textContent = lvl;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  if (!active) return null;
  return (
    <div className={styles.compass} aria-label={label ? `Compass pointing to ${label}` : "Compass"} role="img">
      <div className={styles.dial}>
        <div ref={rose} className={styles.rose}>
          {Array.from({ length: 16 }, (_, i) => (
            <i key={i} className={i % 4 === 0 ? styles.tickBig : styles.tick} style={{ transform: `rotate(${i * 22.5}deg)` }} />
          ))}
          {POINTS.map((p) => (
            <span
              key={p.t}
              className={`${styles.cardinal} ${p.t === "N" ? styles.north : ""}`}
              style={{ transform: `rotate(${p.a}rad) translateY(-34px) rotate(${-p.a}rad)` }}
            >
              {p.t}
            </span>
          ))}
        </div>
        <div ref={needle} className={styles.needle} style={{ opacity: 0 }}>
          <b />
        </div>
        <span className={styles.facing} aria-hidden="true" />
        <span className={styles.hub} aria-hidden="true" />
      </div>
      {label && (
        <p className={styles.compassLabel}>
          <span className={styles.compassName}>{label}</span>
          <span ref={dist} className={styles.compassDist} />
          <span ref={level} className={styles.compassLevel} />
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- keys + everything

export function StoryHud() {
  useEffect(() => storyStore.load(), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (guideStore.isOpen()) return;
      const st = storyStore.get();
      if (e.code === "KeyF" && !e.metaKey && !e.ctrlKey) {
        toggleFullscreen();
      } else if (st.talk || st.puzzle) {
        return;
      } else if (e.code === "KeyT" && st.action) {
        e.preventDefault();
        sound.start();
        if (st.action.kind === "talk") {
          if (document.pointerLockElement) document.exitPointerLock();
          storyStore.talkTo(st.action.npc);
        } else if (st.action.kind === "launch") {
          storyStore.launch();
        }
      } else if (e.code === "KeyP" && (st.phase === "play" || st.phase === "free")) {
        storyStore.requestPhoto();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <Objectives />
      <Compass />
      <Prompt />
      <Notes />
      <Tip />
      <Flash />
      <LookHint />
      <FullscreenButton />
      <Dialogue />
      <SongPuzzle />
      <IntroCard />
      <Ending />
    </>
  );
}
