/**
 * Touch controls state, shared by the on-screen controls (HUD) and the ball
 * (3D). No three.js here, so the HUD can use it without loading the world.
 */

/** The left stick: x right, y forward, each -1..1; mag is how far it's pushed (0..1). */
export const stick = { x: 0, y: 0, mag: 0 };

/** What Bob is doing right now, so the right-hand buttons can change to fit. */
export const bobState = { grounded: true, swimming: false, nearLog: false, flying: false };

let touchDevice: boolean | null = null;

/** A phone or tablet: no hover, a finger for a pointer. */
export function isTouchDevice() {
  if (touchDevice !== null) return touchDevice;
  try {
    touchDevice = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
  } catch {
    touchDevice = false;
  }
  return touchDevice;
}

/** Press or release a game key, exactly as the keyboard would. */
export function pressKey(code: string, down: boolean) {
  const key = code === "Space" ? " " : code.replace(/^Key/, "").toLowerCase();
  window.dispatchEvent(new KeyboardEvent(down ? "keydown" : "keyup", { code, key, bubbles: true }));
}

/** A quick tap of a key (down, then up on the next frame). */
export function tapKey(code: string) {
  pressKey(code, true);
  window.setTimeout(() => pressKey(code, false), 60);
}
