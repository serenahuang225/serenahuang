"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { orbStore } from "./orb-store";
import { lookStore } from "./look-store";
import { sound } from "./audio";
import { FieldGuide } from "./field-guide";
import { StoryHud } from "./story-hud";
import { TouchControls } from "./touch-controls";
import { ENERGY_NEEDED } from "./story-data";
import styles from "./underground.module.css";

const UndergroundScene = dynamic(() => import("./scene"), { ssr: false });

const EMPTY = { found: [] as string[], total: 0, last: null };

function OrbCounter() {
  const s = useSyncExternalStore(orbStore.subscribe, orbStore.get, () => EMPTY);
  const [toast, setToast] = useState<string | null>(null);
  const n = s.found.length;
  const charged = n >= ENERGY_NEEDED;

  useEffect(() => {
    if (!s.last) return;
    const n = s.found.length;
    setToast(
      n === s.total
        ? `You found every light · ${n} / ${s.total}`
        : n === ENERGY_NEEDED
          ? "The rocket has all the energy it needs!"
          : n < ENERGY_NEEDED
            ? `Energy for the rocket · ${n} / ${ENERGY_NEEDED}`
            : `Found an extra light · ${n} / ${s.total}`,
    );
    const t = window.setTimeout(() => setToast(null), n === s.total || n === ENERGY_NEEDED ? 5000 : 2600);
    return () => window.clearTimeout(t);
  }, [s.last, s.found.length, s.total]);

  if (!s.total) return null;
  return (
    <>
      <div
        className={styles.counter}
        aria-live="polite"
        title={charged ? "Extra lights you've found, out of all of them" : "Energy orbs the rocket needs to fly home"}
      >
        <span className={styles.counterOrb} aria-hidden="true" />
        <span>
          {n} <span className={styles.counterOf}>/ {charged ? s.total : ENERGY_NEEDED}</span>
        </span>
        <span className={styles.counterLabel}>{charged ? "found" : "energy"}</span>
        {n > 0 && (
          <button
            type="button"
            className={styles.counterReset}
            onClick={() => {
              if (window.confirm("Put all the lights back and start collecting again?")) orbStore.reset();
            }}
          >
            reset
          </button>
        )}
      </div>
      <div className={`${styles.toast} ${toast ? styles.toastShown : ""}`} role="status">
        {toast}
      </div>
    </>
  );
}

function SoundButton() {
  const muted = useSyncExternalStore(
    (fn) => sound.subscribe(fn),
    () => sound.muted,
    () => false,
  );
  useEffect(() => {
    // browsers only allow audio after a gesture, so start on the first one
    const start = () => sound.start();
    const onKey = (e: KeyboardEvent) => {
      start();
      if (e.code === "KeyM") sound.setMuted(!sound.muted);
    };
    window.addEventListener("pointerdown", start);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", onKey);
      sound.stop();
    };
  }, []);
  return (
    <button
      type="button"
      className={styles.soundButton}
      onClick={() => {
        sound.start();
        sound.setMuted(!sound.muted);
      }}
      aria-pressed={!muted}
      aria-label={muted ? "Turn sound on" : "Turn sound off"}
    >
      {muted ? "Sound off" : "Sound on"}
    </button>
  );
}

const EMPTY_LOOK = { tint: null, fluff: 0, glowUntil: 0, bounceUntil: 0, flyUntil: 0, last: null };

function PotionStatus() {
  const look = useSyncExternalStore(lookStore.subscribe, lookStore.get, () => EMPTY_LOOK);
  const [now, setNow] = useState(() => Date.now());
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  useEffect(() => {
    if (!look.last) return;
    setToast(look.last.text);
    const t = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(t);
  }, [look.last]);
  const glow = Math.max(0, Math.ceil((look.glowUntil - now) / 1000));
  const bounce = Math.max(0, Math.ceil((look.bounceUntil - now) / 1000));
  const fly = Math.max(0, Math.ceil((look.flyUntil - now) / 1000));
  const changed = look.tint || look.fluff > 0;
  return (
    <>
      <div className={styles.effects}>
        {look.fluff > 0 && <span className={styles.chip}>Fluff {look.fluff}/3</span>}
        {glow > 0 && <span className={styles.chip}>Glow {glow}s</span>}
        {bounce > 0 && <span className={styles.chip}>Bounce {bounce}s</span>}
        {fly > 0 && <span className={styles.chip}>Wings {fly}s</span>}
        {changed && (
          <button type="button" className={styles.chipButton} onClick={() => lookStore.reset()}>
            Reset look
          </button>
        )}
      </div>
      <div className={`${styles.toast} ${styles.toastLow} ${toast ? styles.toastShown : ""}`} role="status">
        {toast}
      </div>
    </>
  );
}

export default function UndergroundClient() {
  const [ready, setReady] = useState(false);
  const [hintHidden, setHintHidden] = useState(false);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    if (!ready) return;
    const t = window.setTimeout(() => setHintHidden(true), 14000);
    const onLock = () => setLocked(!!document.pointerLockElement);
    document.addEventListener("pointerlockchange", onLock);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("pointerlockchange", onLock);
    };
  }, [ready]);

  return (
    <main className={styles.root}>
      <UndergroundScene onReady={() => setReady(true)} />

      <div className={`${styles.loader} ${ready ? styles.loaderGone : ""}`} aria-hidden={ready}>
        <div className={styles.loaderOrb} />
        <p>Descending through the glass…</p>
      </div>

      <Link href="/" className={styles.back}>
        ←<span className={styles.backWords}> Back through the glass</span>
      </Link>

      {ready && <OrbCounter />}
      {ready && <PotionStatus />}
      <SoundButton />
      {ready && <FieldGuide />}
      {ready && <StoryHud />}
      {ready && <TouchControls />}

      <div
        className={`${styles.hint} ${hintHidden ? styles.hintHidden : ""}`}
        onMouseEnter={() => setHintHidden(false)}
      >
        <span className={styles.moveHelp}>
          <span className={styles.cluster} aria-hidden="true">
            <i />
            <kbd>W</kbd>
            <i />
            <kbd>A</kbd>
            <kbd>S</kbd>
            <kbd>D</kbd>
          </span>
          <span className={styles.or}>or</span>
          <span className={styles.cluster} aria-hidden="true">
            <i />
            <kbd>↑</kbd>
            <i />
            <kbd>←</kbd>
            <kbd>↓</kbd>
            <kbd>→</kbd>
          </span>
          <span>
            <b>roll</b> (W / ↑ goes the way the camera faces)
          </span>
        </span>
        <span><kbd>Space</kbd> jump</span>
        <span>{locked ? <><kbd>Esc</kbd> frees the mouse</> : "click, then move the mouse to look"}</span>
        <span>New controls pop up as you need them · all of them: <kbd>I</kbd> field guide</span>
      </div>

    </main>
  );
}
