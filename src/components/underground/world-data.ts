import * as THREE from "three";
import { createNoise2D } from "simplex-noise";

/**
 * Everything about the cave's layout lives here. All randomness is seeded, so
 * every visitor explores the exact same world.
 */

export const WORLD = {
  /** Side length of the square terrain grid, in meters. */
  size: 440,
  /** Terrain grid resolution (segments per side). */
  segments: 220,
  /** Radius of the walkable cave floor before the walls rise. */
  radius: 200,
  ballRadius: 0.35,
  duckRadius: 0.2,
  spawn: new THREE.Vector3(0, 0, 58),
  gravity: -22,
  fogColor: "#04070f",
  fogDensity: 0.0165,
};

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const noiseA = createNoise2D(mulberry32(11));
const noiseB = createNoise2D(mulberry32(22));
const noiseC = createNoise2D(mulberry32(33));
const noiseD = createNoise2D(mulberry32(44));

// ---------------------------------------------------------------- terrain

export const LAKE = { x: -70, z: 62, r: 30 };

function rawHeight(x: number, z: number) {
  let h =
    noiseA(x * 0.0065, z * 0.0065) * 4.2 +
    noiseA(x * 0.021 + 7, z * 0.021 - 3) * 1.1 +
    noiseB(x * 0.07, z * 0.07) * 0.22;
  const r = Math.hypot(x, z);
  const edge = smoothstep(150, 212, r);
  h += edge * edge * 52 + noiseB(x * 0.03, z * 0.03) * edge * 7;
  // keep the arrival area gentle
  const spawnFlat = 1 - smoothstep(6, 22, Math.hypot(x - WORLD.spawn.x, z - WORLD.spawn.z));
  h = THREE.MathUtils.lerp(h, rawBase(WORLD.spawn.x, WORLD.spawn.z), spawnFlat * 0.7);
  return h;
}
function rawBase(x: number, z: number) {
  return noiseA(x * 0.0065, z * 0.0065) * 4.2 + noiseA(x * 0.021 + 7, z * 0.021 - 3) * 1.1;
}

const lakeRim = rawBase(LAKE.x, LAKE.z);
export const LAKE_LEVEL = lakeRim - 0.9;
const LAKE_FLOOR = lakeRim - 3.4;

// ---- the deep lake (swimmable), the cave, the falls rock and the bridge

/** A deep lake you can dive into; a crystal tunnel leaves from its floor. */
export const DEEP = { x: 60, z: 75, r: 22 };
const deepRim = rawBase(DEEP.x, DEEP.z);
export const DEEP_LEVEL = deepRim - 0.7;
export const DEEP_FLOOR = deepRim - 11;

/** A rock dome with a doorway; the tunnel comes up through its floor. */
export const CAVE = { x: 110, z: 75, r: 15, height: 9, doorYaw: -Math.PI / 2 };
// sits on a low rise so its floor (and the tunnel's exit pool) is above the lake
export const CAVE_FLOOR = Math.max(rawBase(CAVE.x, CAVE.z) + 0.2, deepRim + 0.5);

/** A rock spire on the west shore of the deep lake with a waterfall. */
export const FALLS = { x: DEEP.x - DEEP.r - 6, z: DEEP.z - 2, r: 5.6, height: 15 };
export const FALLS_TOP = deepRim + FALLS.height;

/** A rope bridge across the deep lake, north to south. */
export const BRIDGE = { x: DEEP.x, z0: DEEP.z - 28, z1: DEEP.z + 28, width: 2.6 };

export function analyticHeight(x: number, z: number) {
  let h = rawHeight(x, z);
  const d = Math.hypot(x - LAKE.x, z - LAKE.z);
  const bowl = 1 - smoothstep(LAKE.r * 0.35, LAKE.r * 1.2, d);
  h = THREE.MathUtils.lerp(h, LAKE_FLOOR + noiseB(x * 0.1, z * 0.1) * 0.25, bowl);
  // deep lake: a bank around it keeps the shoreline at its edge, then the bowl
  const dd = Math.hypot(x - DEEP.x, z - DEEP.z);
  h = Math.max(h, DEEP_LEVEL + 0.55 - smoothstep(DEEP.r * 1.5, DEEP.r * 2.2, dd) * 25);
  const deep = 1 - smoothstep(DEEP.r * 0.45, DEEP.r * 1.15, dd);
  h = THREE.MathUtils.lerp(h, DEEP_FLOOR + noiseB(x * 0.12, z * 0.12) * 0.4, deep);
  // flat cave floor
  const cd = Math.hypot(x - CAVE.x, z - CAVE.z);
  // a long gentle ramp, so you can roll up to the doorway
  h = THREE.MathUtils.lerp(h, CAVE_FLOOR + noiseB(x * 0.2, z * 0.2) * 0.12, 1 - smoothstep(CAVE.r * 0.95, CAVE.r * 2.2, cd));
  return h;
}

// ---- crystal tunnel: from the deep lake floor, under the shore, up into the cave

export const TUNNEL_RADIUS = 2.3;
export const TUNNEL_MOUTH = 4.1;
export const TUNNEL = new THREE.CatmullRomCurve3(
  [
    new THREE.Vector3(DEEP.x + 6, DEEP_FLOOR + 0.35, DEEP.z),
    new THREE.Vector3(DEEP.x + 7, DEEP_FLOOR - 3.2, DEEP.z + 0.4),
    new THREE.Vector3(DEEP.x + 14, DEEP_FLOOR - 6.5, DEEP.z + 1.5),
    new THREE.Vector3(DEEP.x + 26, DEEP_FLOOR - 7.2, DEEP.z - 1.5),
    new THREE.Vector3(DEEP.x + 37, DEEP_FLOOR - 6, DEEP.z - 0.5),
    new THREE.Vector3(CAVE.x - 5.5, CAVE_FLOOR - 4.2, CAVE.z),
    new THREE.Vector3(CAVE.x - 4, CAVE_FLOOR + 0.35, CAVE.z),
  ],
  false,
  "centripetal",
);
export const TUNNEL_SAMPLES = TUNNEL.getSpacedPoints(240);
export const TUNNEL_HOLES = [
  { x: TUNNEL_SAMPLES[0].x, z: TUNNEL_SAMPLES[0].z, r: 2.4 },
  { x: TUNNEL_SAMPLES[240].x, z: TUNNEL_SAMPLES[240].z, r: 2.4 },
];

/** Distance from a point to the tunnel's centre line. */
export function tunnelDistance(x: number, y: number, z: number) {
  let best = Infinity;
  for (let i = 0; i < TUNNEL_SAMPLES.length; i += 2) {
    const p = TUNNEL_SAMPLES[i];
    const d = (p.x - x) ** 2 + (p.y - y) ** 2 + (p.z - z) ** 2;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}

/** Is this point in swimmable water (the deep lake, or the flooded tunnel)? */
export function inDeepWater(x: number, y: number, z: number) {
  if (y > DEEP_LEVEL) return false;
  if (Math.hypot(x - DEEP.x, z - DEEP.z) < DEEP.r * 1.25) return true;
  return tunnelDistance(x, y, z) < TUNNEL_MOUTH + 0.5;
}

/** Vertex grid of the terrain; the GPU height texture uses the same samples. */
export const GRID_N = WORLD.segments + 1;
const STEP = WORLD.size / WORLD.segments;
const HALF = WORLD.size / 2;

export const heightGrid = new Float32Array(GRID_N * GRID_N);
for (let iz = 0; iz < GRID_N; iz++) {
  for (let ix = 0; ix < GRID_N; ix++) {
    heightGrid[iz * GRID_N + ix] = analyticHeight(-HALF + ix * STEP, -HALF + iz * STEP);
  }
}

/** Bilinear height on the grid — matches what the GPU foliage samples. */
export function terrainHeight(x: number, z: number) {
  const fx = THREE.MathUtils.clamp((x + HALF) / STEP, 0, GRID_N - 1.001);
  const fz = THREE.MathUtils.clamp((z + HALF) / STEP, 0, GRID_N - 1.001);
  const ix = Math.floor(fx);
  const iz = Math.floor(fz);
  const tx = fx - ix;
  const tz = fz - iz;
  const i = iz * GRID_N + ix;
  const a = heightGrid[i];
  const b = heightGrid[i + 1];
  const c = heightGrid[i + GRID_N];
  const d = heightGrid[i + GRID_N + 1];
  return (a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + d * tx) * tz;
}

// ---------------------------------------------------------------- palette

export const HUES = {
  cyan: new THREE.Color("#33eeff"),
  teal: new THREE.Color("#22ffc4"),
  violet: new THREE.Color("#9a68ff"),
  magenta: new THREE.Color("#ff4fd2"),
  lime: new THREE.Color("#a8ff4f"),
  blue: new THREE.Color("#4c7cff"),
  amber: new THREE.Color("#ffb347"),
};
const regionHues = [HUES.cyan, HUES.teal, HUES.violet, HUES.magenta, HUES.lime, HUES.blue, HUES.cyan, HUES.teal];

/** Mushrooms in the same part of the cave share a colour family. */
export function regionHue(x: number, z: number, rng: () => number) {
  const n = (noiseD(x * 0.006, z * 0.006) + 1) / 2;
  const idx = Math.min(regionHues.length - 1, Math.floor(n * regionHues.length));
  const c = regionHues[idx].clone();
  if (rng() < 0.15) c.copy(regionHues[(idx + 2) % regionHues.length]);
  c.offsetHSL((rng() - 0.5) * 0.05, 0, 0);
  return c;
}

// ---------------------------------------------------------------- mushrooms

export type CapShape = 0 | 1 | 2 | 3; // dome, bell, umbrella, witch-hat

export type Mushroom = {
  x: number;
  z: number;
  y: number;
  height: number;
  stemR: number;
  capR: number;
  shape: CapShape;
  leanX: number;
  leanZ: number;
  hue: THREE.Color;
  /** Upward speed a bounce launches you at. */
  bounce: number;
  kind: "giant" | "grove" | "step";
};

/** Profile of a cap with radius 1, built around the Y axis. */
export const CAP_HEIGHT: Record<CapShape, number> = { 0: 0.5, 1: 0.85, 2: 0.2, 3: 1.05 };

export function capProfile(shape: CapShape, steps = 14) {
  const pts: THREE.Vector2[] = [];
  const H = CAP_HEIGHT[shape];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    let r = 0;
    let y = 0;
    if (shape === 0) {
      r = Math.sin((t * Math.PI) / 2);
      y = H * Math.cos((t * Math.PI) / 2);
    } else if (shape === 1) {
      r = Math.sin((t * Math.PI) / 2) * (0.62 + 0.38 * t);
      y = H * (1 - Math.pow(t, 1.7));
    } else if (shape === 2) {
      r = Math.sin((t * Math.PI) / 2);
      y = H * Math.cos((t * Math.PI) / 2) + 0.07 * Math.pow(t, 8);
    } else {
      // a rounded witch-hat: tall and steep at the rim but with a top you can sit on
      r = t;
      y = H * (1 - Math.pow(t, 1.4));
    }
    pts.push(new THREE.Vector2(Math.max(r, i === 0 ? 0.0001 : r), y));
  }
  // bells and witch-hats get a small flat crown so you can stand on top
  if (shape === 1 || shape === 3) {
    const crown = 0.26;
    let yCut = pts[0].y;
    for (let i = 1; i < pts.length; i++) {
      if (pts[i].x >= crown) {
        const a = pts[i - 1];
        const b = pts[i];
        yCut = a.y + ((crown - a.x) / (b.x - a.x)) * (b.y - a.y);
        break;
      }
    }
    for (const p of pts) if (p.x < crown) p.y = yCut;
  }
  pts.push(new THREE.Vector2(1.0, -0.03));
  pts.push(new THREE.Vector2(0.85, -0.06));
  pts.push(new THREE.Vector2(0.5, -0.08));
  pts.push(new THREE.Vector2(0.18, -0.09));
  pts.push(new THREE.Vector2(0.0001, -0.09));
  return pts;
}

export function capTop(m: Mushroom) {
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(m.leanX, 0, m.leanZ));
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
  const top = new THREE.Vector3(m.x, m.y, m.z).addScaledVector(up, m.height);
  return { top, q, up };
}

const rng = mulberry32(20261117);

const giantSpecs: Array<Omit<Mushroom, "y" | "leanX" | "leanZ" | "bounce" | "kind"> & { hueKey: keyof typeof HUES }> = [
  { x: 0, z: 0, height: 30, stemR: 2.6, capR: 17, shape: 0, hueKey: "cyan", hue: HUES.cyan },
  { x: -95, z: -70, height: 36, stemR: 2.2, capR: 12, shape: 1, hueKey: "violet", hue: HUES.violet },
  { x: -76, z: -92, height: 24, stemR: 1.7, capR: 9, shape: 1, hueKey: "violet", hue: HUES.violet },
  { x: 112, z: -28, height: 40, stemR: 2.8, capR: 19, shape: 2, hueKey: "magenta", hue: HUES.magenta },
  { x: 72, z: 116, height: 28, stemR: 2.0, capR: 10, shape: 3, hueKey: "lime", hue: HUES.lime },
  { x: -142, z: 34, height: 33, stemR: 2.4, capR: 14, shape: 0, hueKey: "blue", hue: HUES.blue },
  { x: 32, z: -142, height: 38, stemR: 2.5, capR: 15, shape: 2, hueKey: "teal", hue: HUES.teal },
];

export const giants: Mushroom[] = giantSpecs.map((g) => ({
  x: g.x,
  z: g.z,
  y: terrainHeight(g.x, g.z) - 0.3,
  height: g.height,
  stemR: g.stemR,
  capR: g.capR,
  shape: g.shape,
  leanX: (rng() - 0.5) * 0.06,
  leanZ: (rng() - 0.5) * 0.06,
  hue: HUES[g.hueKey].clone(),
  bounce: 17,
  kind: "giant",
}));

/** A spiral of flat caps that lets you climb onto the Great Cap. */
export const steps: Mushroom[] = [];
{
  // The first cap is low enough to hop onto; each one after is an easy bounce
  // (about 1.7 m higher and 1–2 m apart) until you're level with the Great Cap.
  const count = 19;
  const capR = 2.6;
  const a0 = Math.PI / 2 + 0.36;
  const ground0 = terrainHeight(Math.cos(a0) * 21.5, Math.sin(a0) * 21.5);
  for (let i = 0; i < count; i++) {
    const a = Math.PI / 2 + 0.36 + i * 0.3;
    const ring = 21.5;
    const x = Math.cos(a) * ring;
    const z = Math.sin(a) * ring;
    const y = terrainHeight(x, z) - 0.2;
    // world height of the top surface of this step's cap
    const surface = ground0 + 1.1 + i * 1.7;
    const hue = HUES.cyan.clone().lerp(HUES.teal, i / count);
    steps.push({
      x,
      z,
      y,
      height: Math.max(0.3, surface - (CAP_HEIGHT[2] + 0.08) * capR - y),
      stemR: 0.4 + i * 0.02,
      capR,
      shape: 2,
      leanX: 0,
      leanZ: 0,
      hue,
      bounce: 11.5,
      kind: "step",
    });
  }
}

export const HOLLOW_LOGS: Array<{ x: number; z: number; yaw: number; length: number; y: number; pitch: number }> = [];
const LOG_INNER = 0.33;
const LOG_OUTER = 0.56;
export const LOG_RADII = { inner: LOG_INNER, outer: LOG_OUTER };
{
  const sites: Array<[number, number, number]> = [
    [6, 46, 0.3],
    [-12, 40, 1.4],
    [22, 30, 2.2],
  ];
  const r = mulberry32(77);
  while (sites.length < 16) {
    const a = r() * Math.PI * 2;
    const d = 30 + r() * 140;
    sites.push([Math.cos(a) * d, Math.sin(a) * d, r() * Math.PI]);
  }
  for (const [x, z, yaw] of sites) {
    const length = 7;
    const dx = Math.cos(yaw) * length * 0.5;
    const dz = -Math.sin(yaw) * length * 0.5;
    const h1 = terrainHeight(x - dx, z - dz);
    const h2 = terrainHeight(x + dx, z + dz);
    if (Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r + 6) continue;
    if (nearNewLandmarks(x, z, 6)) continue;
    HOLLOW_LOGS.push({
      x,
      z,
      yaw,
      length,
      y: (h1 + h2) / 2 + LOG_INNER - 0.04,
      pitch: Math.atan2(h2 - h1, length),
    });
  }
}

/** Keeps random placement out of the deep lake, cave, falls and bridge. */
export function nearNewLandmarks(x: number, z: number, pad: number) {
  if (Math.hypot(x - DEEP.x, z - DEEP.z) < DEEP.r * 1.25 + pad) return true;
  if (Math.hypot(x - CAVE.x, z - CAVE.z) < CAVE.r + 2 + pad) return true;
  if (Math.hypot(x - FALLS.x, z - FALLS.z) < FALLS.r + 2 + pad) return true;
  if (Math.abs(x - BRIDGE.x) < BRIDGE.width + pad && z > BRIDGE.z0 - 4 - pad && z < BRIDGE.z1 + 4 + pad) return true;
  return false;
}

function blocked(x: number, z: number, pad: number) {
  if (nearNewLandmarks(x, z, pad)) return true;
  for (const g of giants) if (Math.hypot(x - g.x, z - g.z) < g.capR * 0.75 + pad) return true;
  if (Math.hypot(x, z) < 30 + pad) return true; // Great Cap staircase
  if (Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r + 2 + pad) return true;
  if (Math.hypot(x - WORLD.spawn.x, z - WORLD.spawn.z) < 7 + pad) return true;
  if (Math.hypot(x - CRYSTALS.x, z - CRYSTALS.z) < 16 + pad) return true;
  for (const l of HOLLOW_LOGS) if (Math.hypot(x - l.x, z - l.z) < l.length * 0.6 + pad) return true;
  return false;
}

export const CRYSTALS = { x: -32, z: -96 };

export const groves: Mushroom[] = [];
{
  let tries = 0;
  while (groves.length < 175 && tries < 20000) {
    tries++;
    const a = rng() * Math.PI * 2;
    const d = Math.sqrt(rng()) * 178;
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    const grove = (noiseC(x * 0.013 + 3, z * 0.013 - 9) + 1) / 2;
    if (rng() > grove * grove * 1.6) continue;
    const height = 2.6 + Math.pow(rng(), 2.1) * 12.5;
    const capR = height * (0.28 + rng() * 0.2);
    if (blocked(x, z, capR)) continue;
    let clash = false;
    for (const m of groves) {
      if (Math.hypot(x - m.x, z - m.z) < (capR + m.capR) * 0.85) {
        clash = true;
        break;
      }
    }
    if (clash) continue;
    const lean = 0.03 + rng() * 0.12;
    const leanDir = rng() * Math.PI * 2;
    groves.push({
      x,
      z,
      y: terrainHeight(x, z) - 0.15,
      height,
      stemR: capR * (0.11 + rng() * 0.07),
      capR,
      shape: Math.floor(rng() * 4) as CapShape,
      leanX: Math.cos(leanDir) * lean,
      leanZ: Math.sin(leanDir) * lean,
      hue: regionHue(x, z, rng),
      bounce: 10 + height * 0.25,
      kind: "grove",
    });
  }
}

/** Every mushroom with a solid body you can bounce on. */
export const solidMushrooms: Mushroom[] = [...giants, ...steps, ...groves];

// ---------------------------------------------------------------- spring puffballs

export type Pad = {
  x: number;
  z: number;
  y: number;
  /** Top surface of the puffball. */
  top: number;
  r: number;
  hue: THREE.Color;
  /** Where the launch lands you: the top of the mushroom's cap. */
  target: THREE.Vector3;
  /** How far above the cap top the arc peaks. */
  apex: number;
};

export const PAD_RADIUS = 0.75;
export const PAD_HEIGHT = 0.24;

/**
 * Every big mushroom gets a glowing spring puffball beside its cap. Rolling
 * onto it launches you straight up past the rim and curves you onto the top.
 */
export const pads: Pad[] = [];
{
  const r = mulberry32(606);
  const clearOf = (x: number, z: number, self: Mushroom) => {
    if (Math.hypot(x, z) > 184) return false;
    if (nearNewLandmarks(x, z, 1)) return false;
    if (Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r * 1.25) return false;
    if (Math.hypot(x - CRYSTALS.x, z - CRYSTALS.z) < 15) return false;
    for (const l of HOLLOW_LOGS) if (Math.hypot(x - l.x, z - l.z) < l.length * 0.6 + 1) return false;
    for (const o of solidMushrooms) {
      if (o === self) continue;
      const { top, up } = capTop(o);
      const c = top.clone().addScaledVector(up, 0.08 * o.capR);
      // nothing overhead on the way up, and not inside another stem
      if (Math.hypot(x - c.x, z - c.z) < o.capR + 1.2) return false;
      if (Math.hypot(x - o.x, z - o.z) < o.stemR * 1.5 + 1.2) return false;
    }
    return true;
  };
  for (const m of [...giants, ...groves]) {
    if (m === giants[0]) continue; // the Great Cap has its staircase
    const { top, up } = capTop(m);
    const center = top.clone().addScaledVector(up, 0.08 * m.capR);
    // the real top surface (bells and witch-hats have a flattened crown)
    const capTopY = center.y + capProfile(m.shape, 6)[0].y * m.capR;
    const start = r() * Math.PI * 2;
    for (let k = 0; k < 16; k++) {
      const a = start + (k / 16) * Math.PI * 2;
      const dist = m.capR + 1.5;
      const x = center.x + Math.cos(a) * dist;
      const z = center.z + Math.sin(a) * dist;
      if (!clearOf(x, z, m)) continue;
      const y = terrainHeight(x, z);
      // arc high enough that the sideways glide onto the cap is gentle
      const glideTime = dist / 10;
      const apex = Math.max(2.2, (-WORLD.gravity * (glideTime / 2) ** 2) / 2 + 0.6);
      pads.push({
        x,
        z,
        y,
        top: y + PAD_HEIGHT,
        r: PAD_RADIUS,
        hue: m.hue.clone(),
        target: new THREE.Vector3(center.x, capTopY, center.z),
        apex,
      });
      break;
    }
  }
}

// ---------------------------------------------------------------- small mushrooms

export type SmallMushroom = {
  x: number;
  z: number;
  y: number;
  height: number;
  stemR: number;
  capR: number;
  shape: CapShape;
  rotY: number;
  lean: number;
  hue: THREE.Color;
};

export const smallMushrooms: SmallMushroom[] = [];
{
  const r = mulberry32(91);
  const addCluster = (cx: number, cz: number, spread: number, n: number, hue: THREE.Color, scale = 1) => {
    const shape = Math.floor(r() * 4) as CapShape;
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * spread;
      const x = cx + Math.cos(a) * d;
      const z = cz + Math.sin(a) * d;
      const y = terrainHeight(x, z);
      if (y < LAKE_LEVEL + 0.05 && Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r * 1.4) continue;
      if (Math.hypot(x - DEEP.x, z - DEEP.z) < DEEP.r * 1.2) continue;
      if (Math.abs(x - BRIDGE.x) < BRIDGE.width && z > BRIDGE.z0 - 3 && z < BRIDGE.z1 + 3) continue;
      if (Math.hypot(x - FALLS.x, z - FALLS.z) < FALLS.r + 0.5) continue;
      const height = (0.12 + Math.pow(r(), 1.8) * 0.95) * scale;
      const capR = height * (0.32 + r() * 0.3);
      smallMushrooms.push({
        x,
        z,
        y: y - 0.02,
        height,
        stemR: capR * (0.16 + r() * 0.1),
        capR,
        shape: r() < 0.7 ? shape : (Math.floor(r() * 4) as CapShape),
        rotY: r() * Math.PI * 2,
        lean: (r() - 0.5) * 0.4,
        hue: hue.clone().offsetHSL((r() - 0.5) * 0.04, 0, (r() - 0.5) * 0.1),
      });
    }
  };
  for (const m of groves) {
    addCluster(m.x, m.z, m.capR * 1.3 + 1.5, 10 + Math.floor(r() * 16), m.hue);
  }
  for (const g of giants) {
    for (let k = 0; k < 6; k++) {
      const a = r() * Math.PI * 2;
      addCluster(g.x + Math.cos(a) * g.stemR * 2.5, g.z + Math.sin(a) * g.stemR * 2.5, 4, 22, g.hue, 1.3);
    }
  }
  // a welcome ring around the arrival point
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    const x = WORLD.spawn.x + Math.cos(a) * 9;
    const z = WORLD.spawn.z + Math.sin(a) * 9;
    addCluster(x, z, 2.2, 9, regionHue(x, z, r));
  }
  let clusters = 0;
  while (clusters < 300) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * 185;
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    if (Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r) continue;
    clusters++;
    addCluster(x, z, 1.5 + r() * 3, 5 + Math.floor(r() * 14), regionHue(x, z, r));
  }
  // glowing caps that live inside the hollow logs
  for (const l of HOLLOW_LOGS) {
    for (let i = 0; i < 5; i++) {
      const t = (i / 4 - 0.5) * l.length * 0.8;
      const x = l.x + Math.cos(l.yaw) * t;
      const z = l.z - Math.sin(l.yaw) * t;
      const h = 0.06 + r() * 0.08;
      smallMushrooms.push({
        x: x + Math.sin(l.yaw) * (r() - 0.5) * 0.1,
        z: z + Math.cos(l.yaw) * (r() - 0.5) * 0.1,
        y: l.y - LOG_INNER + Math.tan(l.pitch) * t + 0.01,
        height: h,
        stemR: h * 0.12,
        capR: h * 0.55,
        shape: 0,
        rotY: r() * 6.28,
        lean: 0,
        hue: HUES.amber.clone(),
      });
    }
  }
}

// ---------------------------------------------------------------- crystals

export type Crystal = { x: number; y: number; z: number; r: number; h: number; rx: number; rz: number; hue: THREE.Color };
export const crystals: Crystal[] = [];
{
  const r = mulberry32(5);
  for (let i = 0; i < 22; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.pow(r(), 0.8) * 11;
    const x = CRYSTALS.x + Math.cos(a) * d;
    const z = CRYSTALS.z + Math.sin(a) * d;
    const h = (1 - d / 13) * 12 + 1.5 + r() * 3;
    crystals.push({
      x,
      z,
      y: terrainHeight(x, z) - 0.4,
      r: 0.35 + h * 0.07,
      h,
      rx: Math.sin(a) * (d / 11) * 0.5,
      rz: -Math.cos(a) * (d / 11) * 0.5,
      hue: (r() < 0.6 ? HUES.violet : HUES.cyan).clone(),
    });
  }
}

// ---------------------------------------------------------------- lights

export type GlowLight = { pos: THREE.Vector3; color: THREE.Color; intensity: number; range: number };

export const LIGHTS: GlowLight[] = [
  ...giants.map((g) => {
    const { top } = capTop(g);
    return { pos: top.clone().add(new THREE.Vector3(0, -2.5, 0)), color: g.hue.clone(), intensity: 1.4, range: g.capR * 3.2 };
  }),
  {
    pos: new THREE.Vector3(LAKE.x, LAKE_LEVEL + 2.5, LAKE.z),
    color: HUES.teal.clone(),
    intensity: 1.2,
    range: 45,
  },
  {
    // hangs above the tallest crystal: a light touching a surface blows up to
    // infinity in the HDR buffer and bloom smears that over the whole screen
    pos: new THREE.Vector3(CRYSTALS.x, terrainHeight(CRYSTALS.x, CRYSTALS.z) + 21, CRYSTALS.z),
    color: HUES.violet.clone(),
    intensity: 2.2,
    range: 48,
  },
];

// ---------------------------------------------------------------- foliage maps

/** RGBA float texture: R height, G grass density, B leaf density, A flower density. */
export function buildFoliageMap() {
  const data = new Float32Array(GRID_N * GRID_N * 4);
  for (let iz = 0; iz < GRID_N; iz++) {
    for (let ix = 0; ix < GRID_N; ix++) {
      const x = -HALF + ix * STEP;
      const z = -HALF + iz * STEP;
      const h = heightGrid[iz * GRID_N + ix];
      const i = (iz * GRID_N + ix) * 4;
      const r = Math.hypot(x, z);
      let wet = h < LAKE_LEVEL + 0.15 && Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r * 1.5 ? 0 : 1;
      if (h < DEEP_LEVEL + 0.2 && Math.hypot(x - DEEP.x, z - DEEP.z) < DEEP.r * 1.5) wet = 0;
      // the cave has a bare rock floor with a few flowers; the falls rock is rock
      const inCave = 1 - smoothstep(CAVE.r * 0.8, CAVE.r * 1.05, Math.hypot(x - CAVE.x, z - CAVE.z));
      if (Math.hypot(x - FALLS.x, z - FALLS.z) < FALLS.r + 0.8) wet = 0;
      const edge = 1 - smoothstep(175, 200, r);
      const grass = smoothstep(-0.45, 0.35, noiseC(x * 0.017, z * 0.017)) * 0.85 + 0.15;
      const leaves = smoothstep(-0.1, 0.55, noiseD(x * 0.021 + 40, z * 0.021 - 17));
      data[i] = h;
      data[i + 1] = grass * wet * edge * (1 - inCave * 0.8);
      data[i + 2] = leaves * wet * edge * (1 - inCave);
      data[i + 3] = Math.max(smoothstep(0.15, 0.7, noiseB(x * 0.025 - 11, z * 0.025 + 5)), inCave * 0.6) * wet * edge;
    }
  }
  const tex = new THREE.DataTexture(data, GRID_N, GRID_N, THREE.RGBAFormat, THREE.FloatType);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

export const MAP_INFO = new THREE.Vector3(-HALF, STEP, GRID_N);

// ---------------------------------------------------------------- cap surface helper

/** Centre of the top surface of a mushroom's cap, in world space. */
export function capSurface(m: Mushroom) {
  const { top, up } = capTop(m);
  const center = top.clone().addScaledVector(up, 0.08 * m.capR);
  return new THREE.Vector3(center.x, center.y + capProfile(m.shape, 6)[0].y * m.capR, center.z);
}

// ---------------------------------------------------------------- hanging strands

export type Strand = { x: number; y: number; z: number; len: number; seed: number; hue: THREE.Color };

/** Glowing threads hanging from the gills of the bigger caps. */
export const strands: Strand[] = [];
{
  const r = mulberry32(919);
  for (const m of [...giants, ...groves]) {
    if (m.capR < 2.6) continue;
    const { top, up } = capTop(m);
    const under = top.clone().addScaledVector(up, 0.08 * m.capR - 0.09 * m.capR);
    const clearance = under.y - terrainHeight(under.x, under.z);
    const n = Math.round(m.capR * (m.kind === "giant" ? 4 : 2.2));
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2;
      const rr = (0.3 + Math.sqrt(r()) * 0.6) * m.capR;
      const x = under.x + Math.cos(a) * rr;
      const z = under.z + Math.sin(a) * rr;
      const len = Math.min(clearance * (0.25 + r() * 0.45), 1 + r() * (m.kind === "giant" ? 9 : 4));
      if (len < 0.6) continue;
      strands.push({ x, y: under.y + 0.02, z, len, seed: r(), hue: m.hue.clone() });
    }
  }
}

// ---------------------------------------------------------------- light orbs

export type Orb = { id: string; pos: THREE.Vector3; hint: string };

/** Twenty-four lights hidden around the cave, many on top of things. */
export const ORBS: Orb[] = [];
{
  const add = (id: string, p: THREE.Vector3, hint: string) => ORBS.push({ id, pos: p, hint });
  const above = (m: Mushroom, h = 1.1) => capSurface(m).add(new THREE.Vector3(0, h, 0));
  // a first one right in front of you
  const sx = WORLD.spawn.x;
  const sz = WORLD.spawn.z - 7;
  add("welcome", new THREE.Vector3(sx, terrainHeight(sx, sz) + 0.9, sz), "near the start");
  giants.forEach((g, i) => add(`giant-${i}`, above(g, 1.2), "on a giant cap"));
  add("stairs", above(steps[9], 1.0), "halfway up the spiral");
  [...groves]
    .sort((a, b) => b.height - a.height)
    .filter((_, i) => i % 3 === 0)
    .slice(0, 8)
    .forEach((g, i) => add(`grove-${i}`, above(g), "on a tall mushroom"));
  HOLLOW_LOGS.slice(0, 3).forEach((l, i) => add(`log-${i}`, new THREE.Vector3(l.x, l.y - 0.05, l.z), "inside a hollow log"));
  add("lake", new THREE.Vector3(LAKE.x, LAKE_LEVEL + 0.8, LAKE.z), "over the glowing lake");
  // a clear spot inside the crystal cluster
  {
    let best = new THREE.Vector3(CRYSTALS.x + 12, 0, CRYSTALS.z);
    let bestGap = -Infinity;
    for (let i = 0; i < 400; i++) {
      const a = (i / 400) * Math.PI * 2 * 7;
      const d = 3 + (i / 400) * 6;
      const x = CRYSTALS.x + Math.cos(a) * d;
      const z = CRYSTALS.z + Math.sin(a) * d;
      let gap = Infinity;
      for (const c of crystals) gap = Math.min(gap, Math.hypot(x - c.x, z - c.z) - c.r * 1.6);
      if (gap > bestGap) {
        bestGap = gap;
        best = new THREE.Vector3(x, 0, z);
      }
    }
    best.y = terrainHeight(best.x, best.z) + 0.9;
    add("crystals", best, "among the crystals");
  }
  for (const a of [2.4, 5.2]) {
    const x = Math.cos(a) * 163;
    const z = Math.sin(a) * 163;
    add(`edge-${a}`, new THREE.Vector3(x, terrainHeight(x, z) + 0.9, z), "by the cave wall");
  }
}

// ---------------------------------------------------------------- bridge deck

/** Height of the top of the bridge deck at a given z (an arch over the water). */
export function bridgeDeckY(z: number) {
  const y0 = terrainHeight(BRIDGE.x, BRIDGE.z0) + 0.1;
  const y1 = terrainHeight(BRIDGE.x, BRIDGE.z1) + 0.1;
  const t = THREE.MathUtils.clamp((z - BRIDGE.z0) / (BRIDGE.z1 - BRIDGE.z0), 0, 1);
  const arch = DEEP_LEVEL + 4.2 - (y0 + y1) / 2;
  return THREE.MathUtils.lerp(y0, y1, t) + arch * Math.sin(Math.PI * t);
}

// ---------------------------------------------------------------- falls puffball + extra orbs

pads.push({
  x: FALLS.x - FALLS.r - 1.7,
  z: FALLS.z,
  y: terrainHeight(FALLS.x - FALLS.r - 1.7, FALLS.z),
  top: terrainHeight(FALLS.x - FALLS.r - 1.7, FALLS.z) + PAD_HEIGHT,
  r: PAD_RADIUS,
  hue: HUES.teal.clone(),
  target: new THREE.Vector3(FALLS.x, FALLS_TOP, FALLS.z),
  apex: 2.6,
});

{
  const mid = TUNNEL.getPointAt(0.5);
  ORBS.push(
    { id: "cave", pos: new THREE.Vector3(CAVE.x + 6, CAVE_FLOOR + 0.9, CAVE.z + 5), hint: "inside the cave" },
    { id: "tunnel", pos: new THREE.Vector3(mid.x, mid.y - 1.0, mid.z), hint: "deep in the crystal tunnel" },
    { id: "falls", pos: new THREE.Vector3(FALLS.x, FALLS_TOP + 1.1, FALLS.z), hint: "on top of the waterfall" },
  );
}

// ---------------------------------------------------------------- potions

export type PotionKind = "color" | "fluff" | "glow" | "bounce" | "fly";
export type Potion = { id: string; kind: PotionKind; color: THREE.Color; name: string; pos: THREE.Vector3 };

export const POTION_COLORS = {
  bubblegum: { color: "#ff7ac8", name: "Bubblegum" },
  sky: { color: "#6fc3ff", name: "Sky blue" },
  mint: { color: "#5fffbe", name: "Mint" },
  sunny: { color: "#ffd45c", name: "Sunshine" },
  lilac: { color: "#b48cff", name: "Lilac" },
  panda: { color: "#d4532e", name: "Red panda" },
} as const;

export const POTIONS: Potion[] = [];
{
  const ground = (x: number, z: number, lift = 0.55) => new THREE.Vector3(x, terrainHeight(x, z) + lift, z);
  const color = (id: string, key: keyof typeof POTION_COLORS, pos: THREE.Vector3) =>
    POTIONS.push({ id, kind: "color", color: new THREE.Color(POTION_COLORS[key].color), name: POTION_COLORS[key].name, pos });
  const other = (id: string, kind: PotionKind, hex: string, name: string, pos: THREE.Vector3) =>
    POTIONS.push({ id, kind, color: new THREE.Color(hex), name, pos });

  const sx = WORLD.spawn.x;
  const sz = WORLD.spawn.z;
  other("fluff-start", "fluff", "#fff1dc", "Fluff", ground(sx + 4, sz - 4));
  color("pink-start", "bubblegum", ground(sx - 4, sz - 4));
  other("fluff-greatcap", "fluff", "#fff1dc", "Fluff", capSurface(giants[0]).add(new THREE.Vector3(3, 0.55, 2)));
  color("sky-bridge", "sky", new THREE.Vector3(BRIDGE.x, bridgeDeckY(DEEP.z) + 0.55, DEEP.z));
  color("sunny-falls", "sunny", new THREE.Vector3(FALLS.x + 1.6, FALLS_TOP + 0.55, FALLS.z + 1.2));
  {
    const o = ORBS.find((q) => q.id === "crystals")!;
    color("lilac-crystals", "lilac", ground(o.pos.x + 1.5, o.pos.z + 1.0));
  }
  {
    const p = TUNNEL.getPointAt(0.32);
    color("mint-tunnel", "mint", new THREE.Vector3(p.x, p.y - TUNNEL_RADIUS + 0.75, p.z));
  }
  {
    const l = HOLLOW_LOGS[0];
    color("panda-log", "panda", new THREE.Vector3(l.x, l.y - LOG_INNER + 0.3, l.z));
  }
  other("glow-cave", "glow", "#bff6ff", "Glow", ground(CAVE.x - 3, CAVE.z + 6));
  other("fluff-cave", "fluff", "#fff1dc", "Fluff", ground(CAVE.x + 4, CAVE.z - 6));
  other("glow-lake", "glow", "#bff6ff", "Glow", ground(LAKE.x + LAKE.r * 1.3 + 2, LAKE.z));
  other("bounce-lime", "bounce", "#9dff5a", "Bounce", ground(giants[4].x - 15, giants[4].z));
  other("bounce-lake", "bounce", "#9dff5a", "Bounce", ground(LAKE.x, LAKE.z - LAKE.r * 1.35 - 3));
  color("bubblegum-wall", "bubblegum", ground(Math.cos(0.9) * 160, Math.sin(0.9) * 160));
  other("fly-start", "fly", "#e9dcff", "Wings", ground(sx + 7, sz - 1));
  other("fly-bridge", "fly", "#e9dcff", "Wings", ground(BRIDGE.x + 4, BRIDGE.z0 - 3));
  other("fly-crystals", "fly", "#e9dcff", "Wings", ground(CRYSTALS.x + 15, CRYSTALS.z - 4));
}

// ---------------------------------------------------------------- inside the cave

export const caveCrystals: Crystal[] = [];
{
  const r = mulberry32(4242);
  for (let i = 0; i < 26; i++) {
    const a = r() * Math.PI * 2;
    // hug the walls, away from the doorway
    if (Math.abs(Math.atan2(Math.sin(a - CAVE.doorYaw), Math.cos(a - CAVE.doorYaw))) < 0.6) continue;
    const d = CAVE.r * (0.62 + r() * 0.22);
    const x = CAVE.x + Math.cos(a) * d;
    const z = CAVE.z + Math.sin(a) * d;
    const h = 1 + r() * 3.5;
    caveCrystals.push({
      x,
      z,
      y: CAVE_FLOOR - 0.3,
      r: 0.25 + h * 0.08,
      h,
      rx: -Math.sin(a) * 0.35,
      rz: Math.cos(a) * 0.35,
      hue: (r() < 0.5 ? HUES.cyan : HUES.magenta).clone(),
    });
  }
  for (let k = 0; k < 9; k++) {
    const a = r() * Math.PI * 2;
    if (Math.abs(Math.atan2(Math.sin(a - CAVE.doorYaw), Math.cos(a - CAVE.doorYaw))) < 0.5) continue;
    const d = CAVE.r * (0.35 + r() * 0.4);
    const cx = CAVE.x + Math.cos(a) * d;
    const cz = CAVE.z + Math.sin(a) * d;
    if (Math.hypot(cx - TUNNEL_HOLES[1].x, cz - TUNNEL_HOLES[1].z) < 6) continue;
    const hue = (r() < 0.5 ? HUES.amber : HUES.cyan).clone();
    for (let i = 0; i < 14; i++) {
      const aa = r() * Math.PI * 2;
      const dd = Math.sqrt(r()) * 1.6;
      const height = 0.12 + Math.pow(r(), 1.6) * 0.7;
      const capR = height * (0.35 + r() * 0.25);
      smallMushrooms.push({
        x: cx + Math.cos(aa) * dd,
        z: cz + Math.sin(aa) * dd,
        y: CAVE_FLOOR + 0.0,
        height,
        stemR: capR * 0.2,
        capR,
        shape: Math.floor(r() * 4) as CapShape,
        rotY: r() * 6.28,
        lean: (r() - 0.5) * 0.3,
        hue: hue.clone(),
      });
    }
  }
}
