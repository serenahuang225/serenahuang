"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { storyStore } from "./story-store";
import { guideStore } from "./guide-store";
import { bobState, isTouchDevice, pressKey, stick, tapKey } from "./touch";
import styles from "./touch-controls.module.css";

/** How far the knob can travel, as a share of the stick base's width (46 px on the full-size stick). */
const STICK_REACH = 0.35;
const EMPTY_GUIDE = { open: false, found: [], colors: [], last: null, focus: null };

type Context = { down: "Duck" | "Stomp" | "Dive" | null; jump: "Jump" | "Swim up" | "Flap" };

/** A button that holds a game key down for as long as a finger is on it. */
function HoldButton({ code, className, children, label }: { code: string; className: string; children: React.ReactNode; label: string }) {
  const held = useRef(false);
  const release = () => {
    if (!held.current) return;
    held.current = false;
    pressKey(code, false);
  };
  useEffect(() => release, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <button
      type="button"
      className={className}
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault();
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // fine without capture
        }
        held.current = true;
        pressKey(code, true);
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </button>
  );
}

/**
 * On-screen controls for phones and tablets: a stick on the left to roll, a
 * big jump button on the right, and smaller buttons that pop up when they're
 * useful (duck by a log, stomp in the air, dive in water, talk to a friend).
 * Dragging anywhere else on the scene looks around.
 */
export function TouchControls() {
  const [touch, setTouch] = useState(false);
  const s = useSyncExternalStore(storyStore.subscribe, storyStore.get, storyStore.get);
  const g = useSyncExternalStore(guideStore.subscribe, guideStore.get, () => EMPTY_GUIDE);
  const [ctx, setCtx] = useState<Context>({ down: null, jump: "Jump" });
  const knob = useRef<HTMLSpanElement>(null);
  const finger = useRef<{ id: number; cx: number; cy: number; reach: number } | null>(null);

  useEffect(() => setTouch(isTouchDevice()), []);

  // the right-hand buttons follow what Bob is doing
  useEffect(() => {
    if (!touch) return;
    const t = window.setInterval(() => {
      const b = bobState;
      const down: Context["down"] = b.swimming ? "Dive" : !b.grounded ? "Stomp" : b.nearLog ? "Duck" : null;
      const jump: Context["jump"] = b.swimming ? "Swim up" : b.flying && !b.grounded ? "Flap" : "Jump";
      setCtx((c) => (c.down === down && c.jump === jump ? c : { down, jump }));
    }, 120);
    return () => window.clearInterval(t);
  }, [touch]);

  const playing = (s.phase === "play" || s.phase === "free") && !s.talk && !s.puzzle && !g.open;

  // let go of everything when the controls go away (a chat opens, the guide…)
  useEffect(() => {
    if (playing) return;
    finger.current = null;
    stick.x = stick.y = stick.mag = 0;
    if (knob.current) knob.current.style.transform = "";
  }, [playing]);

  if (!touch || !playing) return null;

  const moveStick = (x: number, y: number) => {
    const f = finger.current;
    if (!f) return;
    const reach = f.reach;
    let dx = x - f.cx;
    let dy = y - f.cy;
    const d = Math.hypot(dx, dy);
    if (d > reach) {
      dx = (dx / d) * reach;
      dy = (dy / d) * reach;
    }
    stick.x = dx / reach;
    stick.y = -dy / reach;
    stick.mag = Math.min(1, d / reach);
    if (knob.current) knob.current.style.transform = `translate(${dx}px, ${dy}px)`;
  };
  const endStick = () => {
    finger.current = null;
    stick.x = stick.y = stick.mag = 0;
    if (knob.current) {
      knob.current.style.transition = "";
      knob.current.style.transform = "";
    }
  };

  const action = s.action;
  return (
    <div className={styles.root}>
      {/* left: the stick */}
      <div
        className={styles.stickZone}
        onPointerDown={(e) => {
          e.preventDefault();
          if (finger.current) return;
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            // fine without capture
          }
          const base = e.currentTarget.querySelector(`.${styles.stickBase}`)!.getBoundingClientRect();
          // the stick is smaller on phones, so its reach is measured, not fixed
          finger.current = {
            id: e.pointerId,
            cx: base.left + base.width / 2,
            cy: base.top + base.height / 2,
            reach: base.width * STICK_REACH,
          };
          // follow the finger exactly while held; spring back when let go
          if (knob.current) knob.current.style.transition = "none";
          moveStick(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (finger.current?.id === e.pointerId) moveStick(e.clientX, e.clientY);
        }}
        onPointerUp={(e) => finger.current?.id === e.pointerId && endStick()}
        onPointerCancel={endStick}
        onContextMenu={(e) => e.preventDefault()}
        aria-label="Roll: drag the stick"
        role="application"
      >
        <span className={styles.stickBase} aria-hidden="true">
          <i className={styles.arrowUp} />
          <i className={styles.arrowRight} />
          <i className={styles.arrowDown} />
          <i className={styles.arrowLeft} />
          <span ref={knob} className={styles.knob} />
        </span>
      </div>

      {/* right: jump, plus smaller buttons that pop up when they're useful */}
      <div className={styles.pad}>
        {action && (
          <button type="button" className={`${styles.small} ${styles.talk} ${styles.pop}`} onClick={() => tapKey("KeyT")}>
            {action.kind === "launch" ? "Launch!" : `Talk to ${action.name}`}
          </button>
        )}
        {ctx.down && (
          <HoldButton key={ctx.down} code="KeyC" className={`${styles.small} ${styles.down} ${styles.pop}`} label={ctx.down}>
            <span className={styles.downArrow} aria-hidden="true" />
            {ctx.down}
          </HoldButton>
        )}
        <button type="button" className={`${styles.small} ${styles.photo}`} onClick={() => tapKey("KeyP")} aria-label="Take a photo">
          <span className={styles.cameraIcon} aria-hidden="true" />
        </button>
        <HoldButton code="Space" className={styles.jump} label={ctx.jump}>
          <span className={styles.upArrow} aria-hidden="true" />
          {ctx.jump}
        </HoldButton>
      </div>
    </div>
  );
}
