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

/** A phone (not a tablet): a touch screen whose short side is under 600 px. */
export function isPhone() {
  return isTouchDevice() && Math.min(window.screen.width, window.screen.height) < 600;
}

/**
 * Turn a phone sideways for play: full screen, then lock to landscape. Must
 * run inside a tap. Android allows this; iPhones allow neither, so they get
 * the "turn your phone" card instead (RotateHint in story-hud).
 */
export function goLandscape() {
  if (!isPhone() || document.fullscreenElement || !document.fullscreenEnabled) return;
  const orientation = screen.orientation as ScreenOrientation & { lock?: (o: "landscape") => Promise<void> };
  document.documentElement
    .requestFullscreen?.()
    .then(() => orientation.lock?.("landscape"))
    .catch(() => {}); // not allowed here: the rotate card covers it
}
