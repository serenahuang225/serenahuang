"use client";
import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import {
  CAVE,
  DEEP,
  DEEP_LEVEL,
  LAKE,
  LAKE_LEVEL,
  type Mushroom,
  groves,
  inDeepWater,
  mulberry32,
  nearNewLandmarks,
  solidMushrooms,
  terrainHeight,
} from "./world-data";
import { player } from "./shared";
import { sound } from "./audio";
import { guideStore } from "./guide-store";

/*
 * Puffkins: round, fluffy little critters with big eyes, rosy cheeks and a
 * glowing antenna. They hop around their home, turn to watch you, squeak and
 * scatter if you roll too close, and tumble if you bump them.
 * Fish swim in the lakes; glow-snails creep around mushroom stems.
 */

// scratch objects, reused every frame so posing ~150 critters doesn't churn the garbage collector
const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpQ2 = new THREE.Quaternion();
const tmpQ3 = new THREE.Quaternion();
const tmpE = new THREE.Euler();
const tmpV = new THREE.Vector3();
const tmpS = new THREE.Vector3();
const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();
const tmpC = new THREE.Vector3();
const tmpDir = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const RIGHT = new THREE.Vector3(1, 0, 0);
const FWD = new THREE.Vector3(0, 0, 1);
/** A zero-size matrix: how an instance is hidden. */
const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);

let lastSqueak = 0;
/** Squeak, but no more than about four times a second, however many puffkins scatter at once. */
function squeak(pitch: number) {
  const now = performance.now();
  if (now - lastSqueak < 260) return;
  lastSqueak = now;
  sound.squeak(pitch);
}

/** A soft, fluffy-looking material that glows a little in its own colour, more at the edges. */
function softMaterial(emissive = 0.3) {
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0 });
  mat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <emissivemap_fragment>",
      `#include <emissivemap_fragment>
      {
        float rim = pow(clamp(1.0 - abs(dot(normal, normalize(vViewPosition))), 0.0, 1.0), 2.0);
        #if defined( USE_COLOR )
          totalEmissiveRadiance += vColor.rgb * (${emissive.toFixed(2)} + rim * 0.55);
        #endif
      }`,
    );
  };
  return mat;
}

/** An instanced mesh whose instances move every frame (always drawn: they wander too far to cull safely). */
function instanced(geo: THREE.BufferGeometry, mat: THREE.Material, count: number) {
  const m = new THREE.InstancedMesh(geo, mat, count);
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  m.frustumCulled = false;
  return m;
}

// ---------------------------------------------------------------- puffkins

type Puff = {
  x: number;
  z: number;
  y: number;
  yaw: number;
  size: number;
  hue: THREE.Color;
  homeX: number;
  homeZ: number;
  homeR: number;
  stems: Mushroom[];
  state: "idle" | "hop" | "tumble";
  timer: number;
  fromX: number;
  fromZ: number;
  toX: number;
  toZ: number;
  targetX: number;
  targetZ: number;
  hopT: number;
  hopDur: number;
  hopH: number;
  fleeing: number;
  vx: number;
  vy: number;
  vz: number;
  spin: number;
  air: number;
  blink: number;
  nextBlink: number;
  pitch: number;
  phase: number;
};

const PASTELS = ["#ffb3d9", "#aaf5d2", "#c9b6ff", "#ffcfa3", "#a8dcff", "#fff3a6"].map((h) => new THREE.Color(h));

/** Families of 3–5 puffkins around 18 homes, each family mostly one pastel colour. */
function buildPuffkins() {
  const r = mulberry32(1313);
  const list: Puff[] = [];
  const homes: Array<[number, number, number]> = [[CAVE.x + 4, CAVE.z + 3, 5]];
  let tries = 0;
  while (homes.length < 17 && tries < 2000) {
    tries++;
    const a = r() * Math.PI * 2;
    const d = 20 + Math.sqrt(r()) * 150;
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    if (Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r * 1.4) continue;
    if (nearNewLandmarks(x, z, 4)) continue;
    homes.push([x, z, 7]);
  }
  // one family close to where you arrive
  homes.push([9, 47, 6]);
  for (const [hx, hz, hr] of homes) {
    const stems = solidMushrooms.filter((m) => Math.hypot(m.x - hx, m.z - hz) < hr + m.stemR + 10);
    const n = 3 + Math.floor(r() * 3);
    const hue = PASTELS[Math.floor(r() * PASTELS.length)];
    for (let i = 0; i < n; i++) {
      const x = hx + (r() - 0.5) * 3;
      const z = hz + (r() - 0.5) * 3;
      list.push({
        x,
        z,
        y: terrainHeight(x, z),
        yaw: r() * Math.PI * 2,
        size: 0.16 + r() * 0.1,
        hue: (r() < 0.7 ? hue : PASTELS[Math.floor(r() * PASTELS.length)]).clone(),
        homeX: hx,
        homeZ: hz,
        homeR: hr,
        stems,
        state: "idle",
        timer: r() * 2,
        fromX: x,
        fromZ: z,
        toX: x,
        toZ: z,
        targetX: x,
        targetZ: z,
        hopT: 0,
        hopDur: 0.4,
        hopH: 0.3,
        fleeing: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        spin: 0,
        air: 0,
        blink: 0,
        nextBlink: 1 + r() * 4,
        pitch: 0.85 + r() * 0.4,
        phase: r() * 10,
      });
    }
  }
  return list;
}

/** Can this puffkin hop here? (near home, not in water, not inside a mushroom stem) */
function okSpot(p: Puff, x: number, z: number) {
  if (Math.hypot(x - p.homeX, z - p.homeZ) > p.homeR + 3) return false;
  const g = terrainHeight(x, z);
  if (g < LAKE_LEVEL + 0.15 && Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r * 1.5) return false;
  if (inDeepWater(x, g + 0.2, z)) return false;
  for (const m of p.stems) if (Math.hypot(x - m.x, z - m.z) < m.stemR * 1.4 + 0.45) return false;
  return true;
}

/** The wild puffkins: they hop about, watch Bob, scatter when he gets close and tumble if bumped. */
export function Puffkins() {
  const built = useMemo(() => {
    const list = buildPuffkins();
    const n = list.length;
    const body = instanced(new THREE.SphereGeometry(1, 28, 20), softMaterial(0.32), n);
    // lit (not self-lit) eyes, so blinking from far away doesn't read as a flashing light
    const eyes = instanced(
      new THREE.SphereGeometry(1, 16, 12),
      new THREE.MeshStandardMaterial({ color: "#fbf8ff", emissive: "#fbf8ff", emissiveIntensity: 0.22, roughness: 0.3 }),
      n * 2,
    );
    const pupils = instanced(new THREE.SphereGeometry(1, 12, 10), new THREE.MeshBasicMaterial({ color: "#1a0f24" }), n * 2);
    const shine = instanced(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: "#ffffff" }), n * 2);
    const cheeks = instanced(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.5, 0.68) }), n * 2);
    const stalks = instanced(new THREE.CylinderGeometry(1, 1, 1, 6).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ color: "#3a2f45", roughness: 0.8 }), n);
    const bulbs = instanced(new THREE.SphereGeometry(1, 12, 10), new THREE.MeshBasicMaterial({ color: "#ffffff" }), n);
    list.forEach((p, i) => {
      body.setColorAt(i, p.hue);
      bulbs.setColorAt(i, p.hue.clone().lerp(new THREE.Color("#ffffff"), 0.35).multiplyScalar(0.9));
    });
    for (const m of [body, bulbs]) if (m.instanceColor) m.instanceColor.needsUpdate = true;
    return { list, body, eyes, pupils, shine, cheeks, stalks, bulbs };
  }, []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const time = state.clock.elapsedTime;
    const ball = player.position;
    const bvx = player.velocity.x;
    const bvz = player.velocity.z;
    const ballSpeed = Math.hypot(bvx, bvz);
    const { list, body, eyes, pupils, shine, cheeks, stalks, bulbs } = built;
    /** Pose one puffkin (body, eyes, cheeks, antenna) from its current state. */
    const draw = (i: number, p: Puff) => {
      const R = p.size;
      p.blink -= dt;
      p.nextBlink -= dt;
      if (p.nextBlink <= 0) {
        p.blink = 0.13;
        p.nextBlink = 2 + Math.random() * 4;
      }
      // squash and stretch: a gentle breath, a squish at each end of a hop
      let lift = 0;
      let sy = 1 + Math.sin(time * 2.2 + p.phase) * 0.03;
      if (p.state === "hop") {
        const t = p.hopT;
        lift = Math.sin(Math.PI * t) * p.hopH;
        sy = t < 0.12 || t > 0.88 ? 0.82 : 1 + Math.sin(Math.PI * t) * 0.16;
      } else if (p.state === "tumble") {
        lift = p.air;
        sy = 1.05;
      }
      const sxz = 1 / Math.sqrt(sy);
      tmpQ.setFromAxisAngle(UP, p.yaw);
      if (p.state === "tumble") tmpQ.multiply(tmpQ2.setFromAxisAngle(RIGHT, p.spin));
      const center = tmpV.set(p.x, p.y + lift + R * sy, p.z);
      tmpM.compose(center, tmpQ, tmpS.set(R * sxz, R * sy, R * sxz));
      body.setMatrixAt(i, tmpM);

      const blinkS = p.blink > 0 ? 0.12 : 1;
      for (let e = 0; e < 2; e++) {
        const side = e === 0 ? -1 : 1;
        // eyes sit a little up and to each side of the front
        const a = side * 0.36;
        const el = 0.22;
        const dir = tmpDir.set(Math.sin(a) * Math.cos(el), Math.sin(el), Math.cos(a) * Math.cos(el)).applyQuaternion(tmpQ);
        tmpM.compose(tmpA.copy(center).addScaledVector(dir, R * 0.86 * sxz), tmpQ, tmpS.set(R * 0.25, R * 0.29 * blinkS, R * 0.2));
        eyes.setMatrixAt(i * 2 + e, tmpM);
        const pupil = tmpB.copy(center).addScaledVector(dir, R * 1.0 * sxz);
        tmpM.compose(pupil, tmpQ, tmpS.set(R * 0.15, R * 0.19 * blinkS, R * 0.1));
        pupils.setMatrixAt(i * 2 + e, tmpM);
        const glint = tmpA.copy(pupil).add(tmpC.set(R * 0.05, R * 0.07, 0).applyQuaternion(tmpQ)).addScaledVector(dir, R * 0.06);
        tmpM.compose(glint, tmpQ, tmpS.setScalar(blinkS > 0.5 ? R * 0.05 : 0));
        shine.setMatrixAt(i * 2 + e, tmpM);
        // cheeks, lower and further round
        const ca = side * 0.82;
        const cdir = tmpDir.set(Math.sin(ca) * Math.cos(-0.12), Math.sin(-0.12), Math.cos(ca) * Math.cos(-0.12)).applyQuaternion(tmpQ);
        tmpQ2.setFromUnitVectors(FWD, cdir);
        tmpM.compose(tmpA.copy(center).addScaledVector(cdir, R * 0.92 * sxz), tmpQ2, tmpS.set(R * 0.17, R * 0.1, R * 0.06));
        cheeks.setMatrixAt(i * 2 + e, tmpM);
      }
      // antenna wobbles as they hop
      const wob = Math.sin(time * 6 + p.phase) * (p.state === "hop" ? 0.35 : 0.1);
      const top = tmpB.copy(center).add(tmpC.set(0, R * sy * 0.92, 0));
      const tilt = tmpQ2.setFromEuler(tmpE.set(0.35 + wob, p.yaw, wob * 0.5, "YXZ"));
      tmpM.compose(top, tilt, tmpS.set(R * 0.05, R * 0.85, R * 0.05));
      stalks.setMatrixAt(i, tmpM);
      const tip = tmpA.copy(top).add(tmpC.set(0, R * 0.85, 0).applyQuaternion(tilt));
      tmpM.compose(tip, tmpQ, tmpS.setScalar(R * 0.17));
      bulbs.setMatrixAt(i, tmpM);
    };
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      const R = p.size;
      const dx = p.x - ball.x;
      const dz = p.z - ball.z;
      const dist = Math.hypot(dx, dz);
      const dy = ball.y - (p.y + R);
      const near = dist < 12 && Math.abs(dy) < 3;
      if (near && dist < 6) guideStore.discover("puffkin");

      // ---- behaviour
      if (p.state === "tumble") {
        p.vy -= 22 * dt;
        p.x += p.vx * dt;
        p.z += p.vz * dt;
        p.air += p.vy * dt;
        p.spin += dt * 9;
        const g = terrainHeight(p.x, p.z);
        p.y = g;
        if (p.air <= 0) {
          p.air = 0;
          p.state = "idle";
          p.timer = 0.9;
          p.spin = 0;
        }
      } else if (near && dist < 0.5 + R && ballSpeed > 2.2 && Math.abs(dy) < 0.9) {
        // bumped! a little tumble
        const k = 1 / Math.max(dist, 0.01);
        p.state = "tumble";
        p.vy = 4.5;
        p.air = 0.01;
        p.vx = dx * k * 2.6 + bvx * 0.35;
        p.vz = dz * k * 2.6 + bvz * 0.35;
        squeak(p.pitch * 1.15);
      } else if (p.state === "hop") {
        p.hopT += dt / p.hopDur;
        if (p.hopT >= 1) {
          p.x = p.toX;
          p.z = p.toZ;
          p.state = "idle";
          p.timer = p.fleeing > 0 ? 0.05 : 0.12 + Math.random() * 0.25;
        } else {
          p.x = THREE.MathUtils.lerp(p.fromX, p.toX, p.hopT);
          p.z = THREE.MathUtils.lerp(p.fromZ, p.toZ, p.hopT);
        }
        p.y = terrainHeight(p.x, p.z);
      } else {
        p.timer -= dt;
        p.fleeing = Math.max(0, p.fleeing - dt);
        if (near && dist < 2.3 && p.fleeing <= 0) {
          // too close: scatter
          p.fleeing = 1.8;
          const k = 1 / Math.max(dist, 0.01);
          p.targetX = p.x + dx * k * 3.2 + (Math.random() - 0.5);
          p.targetZ = p.z + dz * k * 3.2 + (Math.random() - 0.5);
          p.timer = 0;
          squeak(p.pitch);
        } else if (near && dist < 6 && p.fleeing <= 0) {
          // curious: turn to look at you
          const want = Math.atan2(-dx, -dz);
          let d = want - p.yaw;
          d = Math.atan2(Math.sin(d), Math.cos(d));
          p.yaw += d * Math.min(1, dt * 5);
          p.targetX = p.x;
          p.targetZ = p.z;
          if (p.timer < 0) p.timer = 0.6 + Math.random() * 1.2;
        }
        if (p.timer <= 0) {
          let tx = p.targetX;
          let tz = p.targetZ;
          if (Math.hypot(tx - p.x, tz - p.z) < 0.3) {
            // pick somewhere new to wander
            for (let tries = 0; tries < 6; tries++) {
              const a = Math.random() * Math.PI * 2;
              const d = Math.sqrt(Math.random()) * p.homeR;
              const cx = p.homeX + Math.cos(a) * d;
              const cz = p.homeZ + Math.sin(a) * d;
              if (okSpot(p, cx, cz)) {
                tx = cx;
                tz = cz;
                break;
              }
            }
            p.targetX = tx;
            p.targetZ = tz;
            if (Math.hypot(tx - p.x, tz - p.z) < 0.3) {
              p.timer = 1 + Math.random() * 2.5;
              draw(i, p);
              continue;
            }
            p.timer = 0;
          }
          const ddx = tx - p.x;
          const ddz = tz - p.z;
          const len = Math.hypot(ddx, ddz);
          const fleeing = p.fleeing > 0;
          const stepLen = Math.min(len, fleeing ? 1.3 : 0.8);
          const nx = p.x + (ddx / len) * stepLen;
          const nz = p.z + (ddz / len) * stepLen;
          if (!okSpot(p, nx, nz) && !fleeing) {
            p.targetX = p.x;
            p.targetZ = p.z;
            p.timer = 0.5;
          } else {
            p.fromX = p.x;
            p.fromZ = p.z;
            p.toX = nx;
            p.toZ = nz;
            p.yaw = Math.atan2(ddx, ddz);
            p.hopT = 0;
            p.hopDur = fleeing ? 0.3 : 0.42;
            p.hopH = fleeing ? 0.42 : 0.28;
            p.state = "hop";
          }
        }
      }
      draw(i, p);
    }
    for (const m of [body, eyes, pupils, shine, cheeks, stalks, bulbs]) m.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      {[built.body, built.eyes, built.pupils, built.shine, built.cheeks, built.stalks, built.bulbs].map((m, i) => (
        <primitive key={i} object={m} />
      ))}
    </>
  );
}

// ---------------------------------------------------------------- fish

type Fish = {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  size: number;
  cx: number;
  cz: number;
  r: number;
  level: number;
  dir: number;
  depth: number;
  phase: number;
};

/** Lantern fish swirling around both lakes; they dart away from Bob. */
export function Fishes() {
  const built = useMemo(() => {
    const r = mulberry32(777);
    const list: Fish[] = [];
    const add = (cx: number, cz: number, rad: number, level: number, n: number) => {
      for (let i = 0; i < n; i++) {
        const a = r() * Math.PI * 2;
        const d = Math.sqrt(r()) * rad * 0.7;
        const x = cx + Math.cos(a) * d;
        const z = cz + Math.sin(a) * d;
        const floor = terrainHeight(x, z);
        list.push({
          pos: new THREE.Vector3(x, (floor + level) / 2, z),
          vel: new THREE.Vector3(),
          size: 0.16 + r() * 0.18,
          cx,
          cz,
          r: rad,
          level,
          dir: r() < 0.5 ? 1 : -1,
          depth: r(),
          phase: r() * 10,
        });
      }
    };
    add(DEEP.x, DEEP.z, DEEP.r, DEEP_LEVEL, 38);
    add(LAKE.x, LAKE.z, LAKE.r, LAKE_LEVEL, 14);
    const n = list.length;
    const body = instanced(new THREE.SphereGeometry(1, 16, 12), softMaterial(0.45), n);
    const tail = instanced(new THREE.ConeGeometry(1, 1, 4).rotateX(-Math.PI / 2).translate(0, 0, -0.5), softMaterial(0.5), n);
    const pal = [new THREE.Color("#7fe8ff"), new THREE.Color("#ffb3d9"), new THREE.Color("#c9b6ff"), new THREE.Color("#ffe08a")];
    list.forEach((_, i) => {
      const c = pal[i % pal.length];
      body.setColorAt(i, c);
      tail.setColorAt(i, c.clone().offsetHSL(0.05, 0, -0.05));
    });
    for (const m of [body, tail]) if (m.instanceColor) m.instanceColor.needsUpdate = true;
    return { list, body, tail };
  }, []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const time = state.clock.elapsedTime;
    const ball = player.position;
    const { list, body, tail } = built;
    const desired = new THREE.Vector3();
    for (let i = 0; i < list.length; i++) {
      const f = list[i];
      const rx = f.pos.x - f.cx;
      const rz = f.pos.z - f.cz;
      const rr = Math.max(Math.hypot(rx, rz), 0.01);
      // swirl around the lake, drift toward a comfy radius and depth
      desired.set((-rz / rr) * f.dir, 0, (rx / rr) * f.dir).multiplyScalar(1.3);
      desired.x += (-rx / rr) * (rr - f.r * 0.55) * 0.15;
      desired.z += (-rz / rr) * (rr - f.r * 0.55) * 0.15;
      const floor = terrainHeight(f.pos.x, f.pos.z);
      const targetY = THREE.MathUtils.lerp(floor + 0.6, f.level - 0.5, 0.25 + f.depth * 0.6);
      desired.y = (targetY - f.pos.y) * 0.8 + Math.sin(time * 0.7 + f.phase) * 0.2;
      desired.x += Math.sin(time * 0.5 + f.phase) * 0.4;
      desired.z += Math.cos(time * 0.4 + f.phase * 1.3) * 0.4;
      // dart away from the ball
      const bx = f.pos.x - ball.x;
      const by = f.pos.y - ball.y;
      const bz = f.pos.z - ball.z;
      const bd = Math.hypot(bx, by, bz);
      if (bd < 7) guideStore.discover("fish");
      if (bd < 3) desired.add(tmpA.set(bx, by, bz).multiplyScalar(((3 - bd) / Math.max(bd, 0.1)) * 3));
      f.vel.lerp(desired, Math.min(1, dt * 1.6));
      if (f.vel.length() > 3.2) f.vel.setLength(3.2);
      f.pos.addScaledVector(f.vel, dt);
      // stay in the water
      const fl = terrainHeight(f.pos.x, f.pos.z);
      f.pos.y = THREE.MathUtils.clamp(f.pos.y, fl + 0.3, f.level - 0.3);
      const out = Math.hypot(f.pos.x - f.cx, f.pos.z - f.cz);
      if (out > f.r * 1.05 || fl > f.level - 0.5) {
        f.pos.x -= (f.pos.x - f.cx) * 0.02;
        f.pos.z -= (f.pos.z - f.cz) * 0.02;
      }
      const dir = tmpV.copy(f.vel);
      if (dir.lengthSq() < 0.0001) dir.set(0, 0, 1);
      dir.normalize();
      tmpQ.setFromUnitVectors(FWD, dir);
      const s = f.size;
      tmpM.compose(f.pos, tmpQ, tmpS.set(s * 0.42, s * 0.5, s));
      body.setMatrixAt(i, tmpM);
      const wag = Math.sin(time * (6 + f.vel.length() * 3) + f.phase) * 0.45;
      tmpQ2.copy(tmpQ).multiply(tmpQ3.setFromAxisAngle(UP, wag));
      const tailPos = tmpA.copy(f.pos).addScaledVector(dir, -s * 0.85);
      tmpM.compose(tailPos, tmpQ2, tmpS.set(s * 0.45, s * 0.12, s * 0.75));
      tail.setMatrixAt(i, tmpM);
    }
    body.instanceMatrix.needsUpdate = true;
    tail.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <primitive object={built.body} />
      <primitive object={built.tail} />
    </>
  );
}

// ---------------------------------------------------------------- glow snails

/** A glow-snail circling a mushroom stem. hide: 0 = out, 1 = tucked into its shell. */
type Snail = { m: Mushroom; angle: number; dir: number; hide: number; size: number; hue: THREE.Color };

/** Glow-snails creeping around mushroom stems; they hide in their shells when Bob comes close. */
export function Snails() {
  const built = useMemo(() => {
    const r = mulberry32(4040);
    const homes = [...groves].sort(() => r() - 0.5).slice(0, 22);
    const list: Snail[] = homes.map((m) => ({
      m,
      angle: r() * Math.PI * 2,
      dir: r() < 0.5 ? 1 : -1,
      hide: 0,
      size: 0.8 + r() * 0.5,
      hue: [new THREE.Color("#7fe8ff"), new THREE.Color("#ffb3d9"), new THREE.Color("#b6ff8a")][Math.floor(r() * 3)],
    }));
    const n = list.length;
    const body = instanced(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshStandardMaterial({ color: "#b9a6c9", roughness: 0.7 }), n);
    const shell = instanced(new THREE.TorusGeometry(1, 0.55, 12, 24), softMaterial(0.55), n);
    const stalk = instanced(new THREE.CylinderGeometry(1, 1, 1, 5).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ color: "#b9a6c9" }), n * 2);
    const tips = instanced(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: "#ffffff" }), n * 2);
    list.forEach((s, i) => {
      shell.setColorAt(i, s.hue);
      tips.setColorAt(i * 2, s.hue.clone().multiplyScalar(1.2));
      tips.setColorAt(i * 2 + 1, s.hue.clone().multiplyScalar(1.2));
    });
    for (const m of [shell, tips]) if (m.instanceColor) m.instanceColor.needsUpdate = true;
    return { list, body, shell, stalk, tips };
  }, []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const ball = player.position;
    const { list, body, shell, stalk, tips } = built;
    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      const ringR = s.m.stemR * 1.4 + 0.35;
      const x = s.m.x + Math.cos(s.angle) * ringR;
      const z = s.m.z + Math.sin(s.angle) * ringR;
      const y = terrainHeight(x, z);
      const scared = Math.hypot(x - ball.x, z - ball.z) < 2.6 && Math.abs(ball.y - y) < 2;
      if (Math.hypot(x - ball.x, z - ball.z) < 5 && Math.abs(ball.y - y) < 3) guideStore.discover("snail");
      s.hide = THREE.MathUtils.damp(s.hide, scared ? 1 : 0, scared ? 10 : 1.5, dt);
      if (s.hide < 0.2) s.angle += (0.11 / ringR) * s.dir * dt;
      const yaw = Math.atan2(-Math.sin(s.angle) * s.dir, Math.cos(s.angle) * s.dir);
      tmpQ.setFromAxisAngle(UP, yaw);
      const k = s.size * 0.1;
      const out = 1 - s.hide;
      tmpM.compose(tmpV.set(x, y + k * 0.5, z), tmpQ, tmpS.set(k * 0.9 * (0.4 + out * 0.6), k * 0.55, k * 2.4 * (0.35 + out * 0.65)));
      body.setMatrixAt(i, tmpM);
      tmpQ2.copy(tmpQ).multiply(tmpQ3.setFromAxisAngle(UP, Math.PI / 2));
      const shellPos = tmpA.set(0, k * 1.35, -k * 0.3).applyQuaternion(tmpQ).add(tmpB.set(x, y, z));
      tmpM.compose(shellPos, tmpQ2, tmpS.set(k * 1.05, k * 1.05, k * 0.8));
      shell.setMatrixAt(i, tmpM);
      for (let e = 0; e < 2; e++) {
        const side = e === 0 ? -1 : 1;
        if (out < 0.25) {
          stalk.setMatrixAt(i * 2 + e, HIDDEN);
          tips.setMatrixAt(i * 2 + e, HIDDEN);
          continue;
        }
        // eye stalks, pulled in when scared
        const base = tmpA.set(side * k * 0.35, k * 0.8, k * 1.9).applyQuaternion(tmpQ).add(tmpB.set(x, y, z));
        const q = tmpQ2.copy(tmpQ).multiply(tmpQ3.setFromEuler(tmpE.set(0.5, 0, side * 0.3)));
        const len = k * 1.6 * out;
        tmpM.compose(base, q, tmpS.set(k * 0.12, len, k * 0.12));
        stalk.setMatrixAt(i * 2 + e, tmpM);
        const tip = tmpB.copy(base).add(tmpC.set(0, len, 0).applyQuaternion(q));
        tmpM.compose(tip, tmpQ, tmpS.setScalar(k * 0.28));
        tips.setMatrixAt(i * 2 + e, tmpM);
      }
    }
    for (const m of [body, shell, stalk, tips]) m.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      {[built.body, built.shell, built.stalk, built.tips].map((m, i) => (
        <primitive key={i} object={m} />
      ))}
    </>
  );
}
