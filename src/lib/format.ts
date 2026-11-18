/** Small formatting helpers shared by the home page sections. */

/** A number as two digits, the way the site labels things: 1 → "01". */
export function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** Keep a number between min and max. */
export function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}
