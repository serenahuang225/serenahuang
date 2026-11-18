"use client";
/**
 * The big set pieces: the flooded crystal tunnel (with its gates), the cave
 * dome, the waterfall rock, the rope bridge, and the fog / underwater look.
 */
import { useFrame, useThree } from "@react-three/fiber";
import {
  CoefficientCombineRule,
  CuboidCollider,
  CylinderCollider,
  RigidBody,
  TrimeshCollider,
} from "@react-three/rapier";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { createNoise2D } from "simplex-noise";
import {
  BRIDGE,
  CAVE,
  CAVE_FLOOR,
  DEEP,
  DEEP_LEVEL,
  FALLS,
  FALLS_TOP,
  LAKE,
  LAKE_LEVEL,
  TUNNEL,
  TUNNEL_MOUTH,
  TUNNEL_GATES,
  TUNNEL_APRON,
  TUNNEL_FILLET,
  TUNNEL_RADIUS,
  WORLD,
  bridgeDeckY,
  caveCrystals,
  crystalCollider,
  inDeepWater,
  mulberry32,
  smoothstep,
  terrainHeight,
} from "./world-data";
import { GLSL_BILLBOARD, GLSL_CAMERA_FADE, GLSL_COMMON, GLSL_LIGHTS, billboardGeometry, lightUniforms, shared } from "./shared";
import { Lake, makeRockMaterial } from "./terrain";

/** Live environment state other modules (sound, HUD) can read. */
export const environment = { underwater: false, fog: 0 };

// ---------------------------------------------------------------- shared bits

/** A six-sided crystal 1 unit tall, with a pointed tip. */
function crystalGeometry() {
  const pts = [
    new THREE.Vector2(0.0001, 0),
    new THREE.Vector2(1, 0),
    new THREE.Vector2(1, 0.78),
    new THREE.Vector2(0.0001, 1),
  ];
  return new THREE.LatheGeometry(pts, 6);
}

/** Unlit, softly glowing crystal: brighter toward the tip. */
function crystalMaterial() {
  return new THREE.ShaderMaterial({
    fog: true,
    uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), uTime: shared.uTime },
    vertexShader: /* glsl */ `
      varying float vY;
      varying vec3 vColor;
      varying vec3 vN;
      varying vec3 vV;
      #include <fog_pars_vertex>
      void main() {
        vY = position.y;
        vColor = instanceColor;
        vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
        vN = normalize(mat3(modelMatrix * instanceMatrix) * normal);
        vV = normalize(cameraPosition - wp.xyz);
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying float vY;
      varying vec3 vColor;
      varying vec3 vN;
      varying vec3 vV;
      #include <fog_pars_fragment>
      void main() {
        float facet = 0.55 + 0.45 * abs(dot(normalize(vN), vV));
        float glow = 0.35 + 1.05 * smoothstep(0.2, 1.0, vY);
        vec3 col = vColor * glow * facet * (0.9 + 0.1 * sin(uTime * 0.3 + vColor.r * 9.0));
        gl_FragColor = vec4(col, 1.0);
        #include <fog_fragment>
      }
    `,
  });
}

// ---------------------------------------------------------------- crystal tunnel

/** The tube's radius at t (0 = lake end, 1 = cave end): slightly wider in the middle. */
function tunnelRadius(t: number) {
  // the shaft stays round right up to the ends; the mouths are built separately
  return TUNNEL_RADIUS * (1 + 0.07 * smoothstep(0.0, 0.05, t) * smoothstep(1.0, 0.95, t));
}

/**
 * Where a shaft meets the floor: the wall rolls over in a quarter-circle lip
 * and spreads into a flat stone collar that hides the floor's cut edge and
 * tucks under the ground, so you roll in (and out) without a bump.
 */
function buildMouth(cx: number, cz: number, tEnd: number) {
  const radial = 64;
  const eps = 0.05;
  const R = TUNNEL_RADIUS;
  const F = TUNNEL_FILLET;
  // rings of the surface, from deep in the shaft out to the collar's edge:
  // r = radius, off = height relative to the ground there, s = how far along (for the veins)
  const rows: Array<{ r: number; off: number; s: number }> = [];
  rows.push({ r: R, off: -F - 1.0 + eps, s: 0 });
  rows.push({ r: R, off: -F + eps, s: 0.1 });
  for (let i = 1; i <= 14; i++) {
    const th = (i / 14) * (Math.PI / 2);
    rows.push({ r: R + F * (1 - Math.cos(th)), off: eps - F * (1 - Math.sin(th)), s: 0.1 + (i / 14) * 0.5 });
  }
  for (let i = 1; i <= 10; i++) {
    const u = i / 10;
    rows.push({ r: TUNNEL_MOUTH + u * (TUNNEL_APRON - TUNNEL_MOUTH), off: eps - (eps + 0.1) * smoothstep(0.7, 1.0, u), s: 0.6 + u * 0.4 });
  }
  const pos: number[] = [];
  const vein: number[] = [];
  const idx: number[] = [];
  const sign = tEnd > 0.5 ? 1 : -1;
  for (const row of rows) {
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const x = cx + Math.cos(a) * row.r;
      const z = cz + Math.sin(a) * row.r;
      pos.push(x, terrainHeight(x, z) + row.off, z);
      vein.push(tEnd + sign * row.s * 0.04, j / radial);
    }
  }
  for (let i = 0; i < rows.length - 1; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j;
      const b = a + radial + 1;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("aVein", new THREE.Float32BufferAttribute(vein, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

/** The tube itself (with veins to glow along), and the crystals growing from its walls. */
function buildTunnel() {
  const tubular = 220;
  const radial = 22;
  const frames = TUNNEL.computeFrenetFrames(tubular, false);
  const pos: number[] = [];
  const vein: number[] = [];
  const idx: number[] = [];
  const p = new THREE.Vector3();
  const dir = new THREE.Vector3();
  for (let i = 0; i <= tubular; i++) {
    const t = i / tubular;
    TUNNEL.getPointAt(t, p);
    const N = frames.normals[i];
    const B = frames.binormals[i];
    for (let j = 0; j <= radial; j++) {
      const v = (j / radial) * Math.PI * 2;
      dir.copy(N).multiplyScalar(Math.cos(v)).addScaledVector(B, Math.sin(v));
      const bump = 1 + 0.07 * Math.sin(v * 5 + t * 40) * Math.sin(t * 23 + v);
      const r = tunnelRadius(t) * bump;
      pos.push(p.x + dir.x * r, p.y + dir.y * r, p.z + dir.z * r);
      vein.push(t, j / radial);
    }
  }
  for (let i = 0; i < tubular; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j;
      const b = a + radial + 1;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("aVein", new THREE.Float32BufferAttribute(vein, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();

  const tunnelLength = TUNNEL.getLength();
  // crystals growing from the walls and ceiling (never the floor you roll on)
  const r = mulberry32(31337);
  const crystals: THREE.Matrix4[] = [];
  const colors: THREE.Color[] = [];
  const palette = [new THREE.Color("#7fe8ff"), new THREE.Color("#b48cff"), new THREE.Color("#ff8be0"), new THREE.Color("#8cffd9")];
  for (let k = 0; k < 190; k++) {
    const t = 0.08 + r() * 0.84;
    // keep the crystal gates' gaps clear
    if (TUNNEL_GATES.some((g) => Math.abs(t - g.t) * tunnelLength < 1.6)) continue;
    const i = Math.round(t * tubular);
    TUNNEL.getPointAt(t, p);
    const v = r() * Math.PI * 2;
    dir.copy(frames.normals[i]).multiplyScalar(Math.cos(v)).addScaledVector(frames.binormals[i], Math.sin(v));
    if (dir.y < -0.25) continue;
    const base = p.clone().addScaledVector(dir, tunnelRadius(t) * 0.97);
    const inward = dir.clone().negate();
    const tilt = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(0.7);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), inward.add(tilt).normalize());
    const len = 0.35 + Math.pow(r(), 1.5) * (dir.y > 0.5 ? 1.2 : 0.8);
    const rad = 0.08 + len * 0.12;
    crystals.push(new THREE.Matrix4().compose(base, q, new THREE.Vector3(rad, len, rad)));
    colors.push(palette[Math.floor(r() * palette.length)].clone().multiplyScalar(1.1));
  }
  return { geo, crystals, colors };
}

/**
 * The crystal gates: a thicket of crystals grown across most of the tube,
 * leaving one gap (ringed in soft light) to squeeze through. A plain box
 * does the blocking, so the gap is exactly where it looks.
 */
function buildGates() {
  const r = mulberry32(4242);
  const palette = [new THREE.Color("#7fe8ff"), new THREE.Color("#b48cff"), new THREE.Color("#8cffd9"), new THREE.Color("#ff8be0")];
  const spikes: Array<{ m: THREE.Matrix4; c: THREE.Color }> = [];
  const boxes: Array<{ pos: [number, number, number]; rot: [number, number, number]; half: [number, number, number] }> = [];
  const R = TUNNEL_RADIUS;
  const EDGE = -0.3; // how far past the centre line the crystals reach
  for (const g of TUNNEL_GATES) {
    const b = g.blocked;
    const c = g.axis;
    const T = g.tangent;
    for (let k = 0; k < 38; k++) {
      const th = (r() - 0.5) * 2 * 1.4;
      const sl = (r() - 0.5) * 0.8;
      const base = g.center
        .clone()
        .addScaledVector(T, sl)
        .addScaledVector(b, Math.cos(th) * R * 0.98)
        .addScaledVector(c, Math.sin(th) * R * 0.98);
      const tip = g.center
        .clone()
        .addScaledVector(T, sl * 0.5 + (r() - 0.5) * 0.3)
        .addScaledVector(b, EDGE + r() * 0.25)
        .addScaledVector(c, Math.sin(th) * R * (0.25 + r() * 0.45));
      const dir = tip.clone().sub(base);
      const len = dir.length();
      const rad = 0.13 + r() * 0.17;
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
      spikes.push({ m: new THREE.Matrix4().compose(base, q, new THREE.Vector3(rad, len, rad)), c: palette[Math.floor(r() * palette.length)].clone().multiplyScalar(0.8) });
    }
    const halfB = (R + 0.6 - EDGE) / 2;
    // the blocking face leans back a little, so swimming straight into it
    // nudges Bob deeper into the crystals instead of sliding him to the gap;
    // only steering for the gap gets you through
    const lean = 0.27;
    const Tl = T.clone().addScaledVector(b, -lean).normalize();
    const bl = b.clone().addScaledVector(T, lean).normalize();
    // keep the box's axes right-handed (a mirrored basis isn't a rotation)
    const cx = new THREE.Vector3().crossVectors(c, bl).dot(Tl) < 0 ? c.clone().negate() : c;
    const rot = new THREE.Euler().setFromRotationMatrix(new THREE.Matrix4().makeBasis(cx, bl, Tl));
    boxes.push({
      pos: g.center.clone().addScaledVector(b, EDGE + halfB).toArray() as [number, number, number],
      rot: [rot.x, rot.y, rot.z],
      half: [R + 0.4, halfB, 0.32],
    });
  }
  const mat = new THREE.ShaderMaterial({
    fog: true,
    uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), uTime: shared.uTime },
    vertexShader: /* glsl */ `
      varying float vY;
      varying vec3 vColor;
      varying vec3 vN;
      varying vec3 vWP;
      #include <fog_pars_vertex>
      void main() {
        vY = position.y;
        vColor = instanceColor;
        vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
        vWP = wp.xyz;
        vN = normalize(mat3(modelMatrix * instanceMatrix) * normal);
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vY;
      varying vec3 vColor;
      varying vec3 vN;
      varying vec3 vWP;
      ${GLSL_CAMERA_FADE}
      #include <fog_pars_fragment>
      void main() {
        // crystals right at the lens dissolve, so they never block the view
        cameraFade(vWP, 0.45, 1.5);
        vec3 V = normalize(cameraPosition - vWP);
        float facet = 0.5 + 0.5 * abs(dot(normalize(vN), V));
        float glow = 0.4 + 0.75 * smoothstep(0.25, 1.0, vY);
        gl_FragColor = vec4(vColor * glow * facet, 1.0);
        #include <fog_fragment>
      }
    `,
  });
  const mesh = new THREE.InstancedMesh(crystalGeometry(), mat, spikes.length);
  spikes.forEach((sp, i) => {
    mesh.setMatrixAt(i, sp.m);
    mesh.setColorAt(i, sp.c);
  });
  mesh.computeBoundingSphere();
  // a soft, steady ring around each gap
  const ringGeo = new THREE.TorusGeometry(0.78, 0.04, 8, 48);
  const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.35, 0.85, 0.95), transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false });
  const rings = TUNNEL_GATES.map((g) => {
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), g.tangent);
    return { pos: g.gap.toArray() as [number, number, number], quat: q.toArray() as [number, number, number, number] };
  });
  return { mesh, boxes, ringGeo, ringMat, rings };
}

/** The flooded crystal tunnel from the deep lake's floor up into the cave, with its gates and exit pool. */
export function CrystalTunnel() {
  const built = useMemo(() => {
    const { geo, crystals, colors } = buildTunnel();
    const wall = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      fog: true,
      uniforms: {
        ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
        uTime: shared.uTime,
        uTrail: shared.uTrail,
        ...lightUniforms(),
      },
      vertexShader: /* glsl */ `
        attribute vec2 aVein;
        varying vec2 vVein;
        varying vec3 vWP;
        varying vec3 vN;
        #include <fog_pars_vertex>
        void main() {
          vVein = aVein;
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWP = wp.xyz;
          vN = normalize(mat3(modelMatrix) * normal);
          vec4 mvPosition = viewMatrix * wp;
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }
      `,
      fragmentShader: /* glsl */ `
        ${GLSL_COMMON}
        ${GLSL_LIGHTS}
        varying vec2 vVein;
        varying vec3 vWP;
        varying vec3 vN;
        #include <fog_pars_fragment>
        void main() {
          vec3 n = normalize(gl_FrontFacing ? vN : -vN);
          vec3 rock = vec3(0.06, 0.05, 0.09);
          vec3 lit = rock * (vec3(0.18, 0.2, 0.28) + glowLights(vWP, n, 0.6) * 1.4);
          // glowing crystal veins running along the walls
          float a = vVein.x * 140.0;
          float b = vVein.y * 6.2831;
          float vein = abs(sin(a * 0.55 + sin(b * 3.0 + a * 0.13) * 2.2));
          vein = 1.0 - smoothstep(0.0, 0.07, vein);
          float vein2 = 1.0 - smoothstep(0.0, 0.05, abs(sin(b * 4.0 + sin(a * 0.31) * 1.6)));
          vec3 veinCol = mix(vec3(0.25, 0.85, 1.0), vec3(0.75, 0.45, 1.0), 0.5 + 0.5 * sin(a * 0.07));
          float breathe = 0.8 + 0.2 * sin(uTime * 0.25 + vVein.x * 12.0);
          vec3 col = lit + veinCol * (vein * 0.55 + vein2 * 0.25) * breathe;
          gl_FragColor = vec4(col, 1.0);
          #include <fog_fragment>
        }
      `,
    });
    const crystalMesh = new THREE.InstancedMesh(crystalGeometry(), crystalMaterial(), crystals.length);
    crystals.forEach((m, i) => {
      crystalMesh.setMatrixAt(i, m);
      crystalMesh.setColorAt(i, colors[i]);
    });
    crystalMesh.computeBoundingSphere();
    const positions = new Float32Array(geo.getAttribute("position").array);
    const indices = new Uint32Array(geo.getIndex()!.array);
    const exit = TUNNEL.getPointAt(1);
    const start = TUNNEL.getPointAt(0);
    const mouths = [buildMouth(start.x, start.z, 0), buildMouth(exit.x, exit.z, 1)].map((g) => ({
      geo: g,
      positions: new Float32Array(g.getAttribute("position").array),
      indices: new Uint32Array(g.getIndex()!.array),
    }));
    const gates = buildGates();
    return { geo, wall, crystalMesh, positions, indices, exit, mouths, gates };
  }, []);

  return (
    <>
      <mesh geometry={built.geo} material={built.wall} />
      <primitive object={built.crystalMesh} />
      <RigidBody type="fixed" colliders={false} friction={1}>
        <TrimeshCollider args={[built.positions, built.indices]} />
        {built.mouths.map((m, i) => (
          <TrimeshCollider key={i} args={[m.positions, m.indices]} />
        ))}
      </RigidBody>
      {built.mouths.map((m, i) => (
        <mesh key={i} geometry={m.geo} material={built.wall} />
      ))}
      <primitive object={built.gates.mesh} />
      {/* frictionless, so a spinning ball can't climb the gate and roll over it */}
      <RigidBody type="fixed" colliders={false}>
        {built.gates.boxes.map((c, i) => (
          <CuboidCollider key={i} args={c.half} position={c.pos} rotation={c.rot} friction={0} frictionCombineRule={CoefficientCombineRule.Min} />
        ))}
      </RigidBody>
      {built.gates.rings.map((r, i) => (
        <mesh key={i} geometry={built.gates.ringGeo} material={built.gates.ringMat} position={r.pos} quaternion={r.quat} renderOrder={3} />
      ))}
      {/* the pool where the tunnel surfaces inside the cave */}
      <Lake x={built.exit.x} z={built.exit.z} r={TUNNEL_RADIUS + 0.2} level={DEEP_LEVEL} tint={[0.2, 1.0, 1.6]} />
    </>
  );
}

// ---------------------------------------------------------------- the cave

/** The cave: a lumpy half-dome with an arched doorway cut out of it. */
function buildCave() {
  const R = CAVE.r - 1;
  const noise = createNoise2D(mulberry32(515));
  const sphere = new THREE.SphereGeometry(1, 90, 30, 0, Math.PI * 2, 0, Math.PI / 2);
  const src = sphere.attributes.position;
  const verts: THREE.Vector3[] = [];
  for (let i = 0; i < src.count; i++) {
    const x = src.getX(i);
    const y = src.getY(i);
    const z = src.getZ(i);
    const a = Math.atan2(z, x);
    const bump = 1 + noise(Math.cos(a) * 2.5 + y * 2, Math.sin(a) * 2.5 - y * 2) * 0.07 + noise(a * 6, y * 5) * 0.03;
    verts.push(new THREE.Vector3(x * R * bump, y * CAVE.height * bump, z * R * bump));
  }
  // cut a doorway
  const index = sphere.getIndex()!;
  const keep: number[] = [];
  for (let t = 0; t < index.count; t += 3) {
    const ia = index.getX(t);
    const ib = index.getX(t + 1);
    const ic = index.getX(t + 2);
    const cx = (verts[ia].x + verts[ib].x + verts[ic].x) / 3;
    const cy = (src.getY(ia) + src.getY(ib) + src.getY(ic)) / 3;
    const cz = (verts[ia].z + verts[ib].z + verts[ic].z) / 3;
    const a = Math.atan2(cz, cx);
    const da = Math.abs(Math.atan2(Math.sin(a - CAVE.doorYaw), Math.cos(a - CAVE.doorYaw)));
    // rounded arch: wider at the bottom
    const archTop = 0.62 * Math.sqrt(Math.max(0, 1 - (da / 0.34) ** 2));
    if (da < 0.34 && cy < archTop) continue;
    keep.push(ia, ib, ic);
  }
  const pos = new Float32Array(verts.length * 3);
  const colors = new Float32Array(verts.length * 3);
  const moss = new Float32Array(verts.length);
  verts.forEach((v, i) => {
    pos.set([v.x, v.y, v.z], i * 3);
    colors.set([0.09, 0.08, 0.12], i * 3);
    moss[i] = 0.35 + 0.35 * Math.sin(v.x * 0.4 + v.y * 0.7) * Math.sin(v.z * 0.5);
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.setAttribute("aMoss", new THREE.BufferAttribute(moss, 1));
  geo.setIndex(keep);
  geo.computeVertexNormals();
  return { geo, R };
}

/** The cave dome (solid), glowworms inside it and crystals around its walls. */
export function Cave() {
  const built = useMemo(() => {
    const { geo, R } = buildCave();
    const mat = makeRockMaterial();
    mat.side = THREE.DoubleSide;
    const positions = new Float32Array(geo.getAttribute("position").array);
    const indices = new Uint32Array(geo.getIndex()!.array);

    // glowworms on the inside of the dome
    const r = mulberry32(88);
    const n = 260;
    const wp = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    for (let k = 0; k < n; k++) {
      const a = r() * Math.PI * 2;
      const y = 0.35 + r() * 0.62;
      const rr = Math.sqrt(1 - y * y) * R * 0.95;
      wp.set([Math.cos(a) * rr, y * CAVE.height * 0.95, Math.sin(a) * rr], k * 3);
      seed[k] = r();
    }
    const wormGeo = new THREE.BufferGeometry();
    wormGeo.setAttribute("position", new THREE.BufferAttribute(wp, 3));
    wormGeo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    const wormMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: shared.uTime },
      vertexShader: /* glsl */ `
        uniform float uTime;
        attribute float aSeed;
        varying float vA;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          vA = 0.75 + 0.25 * sin(uTime * 0.15 + aSeed * 40.0);
          gl_PointSize = max(4.0, 60.0 / -mv.z);
        }
      `,
      fragmentShader: /* glsl */ `
        varying float vA;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d);
          gl_FragColor = vec4(vec3(0.25, 0.85, 1.0) * a * vA * 0.8, a * vA);
        }
      `,
    });

    const crystals = new THREE.InstancedMesh(crystalGeometry(), crystalMaterial(), caveCrystals.length);
    const colliders = caveCrystals.map((c, i) => {
      const col = crystalCollider(c);
      crystals.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(c.x, c.y, c.z), col.q, new THREE.Vector3(c.r, c.h, c.r)));
      crystals.setColorAt(i, c.hue.clone().multiplyScalar(1.1));
      return col;
    });
    crystals.computeBoundingSphere();
    return { geo, mat, positions, indices, wormGeo, wormMat, crystals, colliders };
  }, []);

  const origin: [number, number, number] = [CAVE.x, CAVE_FLOOR - 0.6, CAVE.z];
  return (
    <>
      <group position={origin}>
        <mesh geometry={built.geo} material={built.mat} />
        <points geometry={built.wormGeo} material={built.wormMat} frustumCulled={false} />
      </group>
      <RigidBody type="fixed" colliders={false} position={origin} friction={1}>
        <TrimeshCollider args={[built.positions, built.indices]} />
      </RigidBody>
      <primitive object={built.crystals} />
      <RigidBody type="fixed" colliders={false}>
        {built.colliders.map((c, i) => (
          <CylinderCollider key={i} args={c.args} position={c.pos} rotation={c.rot} />
        ))}
      </RigidBody>
    </>
  );
}

// ---------------------------------------------------------------- falls rock + waterfall

/** The rock spire on the lake shore, its waterfall (ropes of water, droplets, splash, mist, foam) and the spring on top. */
export function Waterfall() {
  const built = useMemo(() => {
    const ground = terrainHeight(FALLS.x, FALLS.z) - 1.2;
    const height = FALLS_TOP - ground;
    const noise = createNoise2D(mulberry32(73));
    const rockGeo = new THREE.CylinderGeometry(FALLS.r * 0.86, FALLS.r * 1.15, height, 44, 18, false);
    const rp = rockGeo.attributes.position;
    const colors = new Float32Array(rp.count * 3);
    const moss = new Float32Array(rp.count);
    for (let i = 0; i < rp.count; i++) {
      const x = rp.getX(i);
      const y = rp.getY(i);
      const z = rp.getZ(i);
      const rr = Math.hypot(x, z);
      const top = y > height / 2 - 0.01;
      if (rr > 0.01 && !top) {
        const a = Math.atan2(z, x);
        const k = 1 + noise(Math.cos(a) * 2 + y * 0.12, Math.sin(a) * 2 - y * 0.12) * 0.09;
        rp.setX(i, x * k);
        rp.setZ(i, z * k);
      }
      colors.set([0.1, 0.09, 0.13], i * 3);
      moss[i] = top ? 0.9 : 0.3 + 0.3 * Math.sin(y * 0.8 + x);
    }
    rockGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    rockGeo.setAttribute("aMoss", new THREE.BufferAttribute(moss, 1));
    rockGeo.computeVertexNormals();
    const rockMat = makeRockMaterial();

    // the falling water: a handful of ropes of water that pour off the lip in
    // real arcs, thin out and break into clumps and droplets, then splash
    const dir = new THREE.Vector3(DEEP.x - FALLS.x, 0, DEEP.z - FALLS.z).normalize();
    const side = new THREE.Vector3(-dir.z, 0, dir.x);
    const lip = new THREE.Vector3(FALLS.x, FALLS_TOP - 0.15, FALLS.z).addScaledVector(dir, FALLS.r * 0.82 + 0.6);
    const drop = FALLS_TOP - DEEP_LEVEL + 0.3;
    const G = 12;
    const flight = Math.sqrt((2 * drop) / G);
    const width = 3.6;
    const r = mulberry32(9);
    const strands = 9;
    const seg = 56;
    const sPos: number[] = [];
    const sTan: number[] = [];
    const sSide: number[] = [];
    const sV: number[] = [];
    const sSeed: number[] = [];
    const sWidth: number[] = [];
    const sIdx: number[] = [];
    const along = (u: number, v0: number, v: number) => {
      const t = Math.sqrt((2 * v * drop) / G);
      return lip
        .clone()
        .addScaledVector(dir, v0 * t)
        .addScaledVector(side, u * (1 + 0.3 * v))
        .add(new THREE.Vector3(0, -v * drop, 0));
    };
    let avgOut = 0;
    for (let k = 0; k < strands; k++) {
      const u = ((k + 0.5) / strands - 0.5) * width + (r() - 0.5) * 0.25;
      const v0 = 1.5 + r() * 0.8;
      avgOut += v0 * flight;
      const w = 0.32 + r() * 0.38;
      const seed = r();
      const base = sPos.length / 3;
      for (let i = 0; i <= seg; i++) {
        const v = i / seg;
        const p = along(u, v0, v);
        const t = along(u, v0, Math.min(1, v + 0.01)).sub(along(u, v0, Math.max(0, v - 0.01))).normalize();
        for (const sd of [-1, 1]) {
          sPos.push(p.x, p.y, p.z);
          sTan.push(t.x, t.y, t.z);
          sSide.push(sd);
          sV.push(v);
          sSeed.push(seed);
          sWidth.push(w);
        }
      }
      for (let i = 0; i < seg; i++) {
        const a = base + i * 2;
        sIdx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
    avgOut /= strands;
    const waterGeo = new THREE.BufferGeometry();
    waterGeo.setAttribute("position", new THREE.Float32BufferAttribute(sPos, 3));
    waterGeo.setAttribute("aTan", new THREE.Float32BufferAttribute(sTan, 3));
    waterGeo.setAttribute("aSide", new THREE.Float32BufferAttribute(sSide, 1));
    waterGeo.setAttribute("aV", new THREE.Float32BufferAttribute(sV, 1));
    waterGeo.setAttribute("aSeed", new THREE.Float32BufferAttribute(sSeed, 1));
    waterGeo.setAttribute("aWidth", new THREE.Float32BufferAttribute(sWidth, 1));
    waterGeo.setIndex(sIdx);
    waterGeo.computeBoundingSphere();

    const NOISE = /* glsl */ `
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vnoise(vec2 p) {
        vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
      }
    `;
    const waterMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: true,
      uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), uTime: shared.uTime, uSideDir: { value: side } },
      vertexShader: /* glsl */ `
        uniform float uTime;
        uniform vec3 uSideDir;
        attribute vec3 aTan;
        attribute float aSide;
        attribute float aV;
        attribute float aSeed;
        attribute float aWidth;
        varying vec2 vUv;
        varying float vSeed;
        #include <fog_pars_vertex>
        void main() {
          vec3 c = position;
          // the ropes sway a little as they fall
          c += uSideDir * sin(uTime * 1.3 + aSeed * 20.0 + aV * 5.0) * 0.12 * aV;
          // each rope turns to face the camera, so it's never a flat card
          vec3 toCam = normalize(cameraPosition - c);
          vec3 s = cross(aTan, toCam);
          s = length(s) > 0.001 ? normalize(s) : uSideDir;
          // thins as it speeds up, then frays wider near the bottom
          float w = aWidth * mix(1.0, 0.7, smoothstep(0.0, 0.4, aV)) * (1.0 + smoothstep(0.55, 1.0, aV) * 0.9);
          c += s * aSide * w * 0.5;
          vUv = vec2(aSide * 0.5 + 0.5, aV);
          vSeed = aSeed;
          vec4 mvPosition = modelViewMatrix * vec4(c, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        varying vec2 vUv;
        varying float vSeed;
        #include <fog_pars_fragment>
        ${NOISE}
        void main() {
          // scroll in flight time, so the streaks speed up as they fall
          float t = sqrt(clamp(vUv.y, 0.0, 1.0));
          float x = vUv.x * 2.0 - 1.0;
          vec2 p = vec2(vUv.x * 3.0 + vSeed * 13.0, t * 5.0 - uTime * 3.2);
          float n = vnoise(p) * 0.6 + vnoise(p * vec2(2.7, 1.6) + 5.0) * 0.4;
          float core = 1.0 - x * x;
          // lower down the rope breaks into clumps
          float clump = vnoise(vec2(vUv.x * 4.0 + vSeed * 7.0, t * 16.0 - uTime * 7.0));
          float breakup = smoothstep(0.3, 0.95, vUv.y);
          float a = core * (0.3 + 0.6 * n);
          a *= mix(1.0, smoothstep(0.42, 0.68, clump), breakup);
          a *= smoothstep(0.0, 0.03, vUv.y);
          // dissolve into the splash instead of ending in a hard edge
          a *= 1.0 - smoothstep(0.86, 0.99, vUv.y);
          float white = clamp(n * 0.5 + breakup * 0.35 + (1.0 - core) * 0.25, 0.0, 1.0);
          vec3 col = mix(vec3(0.1, 0.45, 0.58), vec3(0.78, 0.97, 1.0), white) * 0.85;
          gl_FragColor = vec4(col, a * 0.85);
          #include <fog_fragment>
        }
      `,
    });

    // droplets flung off the ropes, following the same arcs
    const foot = lip.clone().addScaledVector(dir, avgOut);
    foot.y = DEEP_LEVEL + 0.02;
    const dropN = 320;
    const dSeed = new Float32Array(dropN * 4);
    for (let i = 0; i < dropN; i++) dSeed.set([r() - 0.5, 1.3 + r() * 1.2, r(), r()], i * 4);
    const dropsGeo = billboardGeometry(dropN, { aSeed: { data: dSeed, size: 4 } });
    const fallUniforms = {
      uTime: shared.uTime,
      uProj: shared.uProj,
      uLip: { value: lip },
      uDir: { value: dir },
      uSideDir: { value: side },
      uFoot: { value: foot },
      uWidth: { value: width },
      uWater: { value: DEEP_LEVEL },
      uG: { value: G },
      uFlight: { value: flight },
    };
    const DROP_FRAG = /* glsl */ `
      varying float vA;
      varying vec2 vUv;
      void main() {
        float d = length(vUv - 0.5);
        float a = smoothstep(0.5, 0.1, d) * vA;
        gl_FragColor = vec4(vec3(0.72, 0.95, 1.0) * 0.85, a);
      }
    `;
    const dropsMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: fallUniforms,
      vertexShader: /* glsl */ `
        uniform float uTime;
        uniform vec3 uLip;
        uniform vec3 uDir;
        uniform vec3 uSideDir;
        uniform float uWidth;
        uniform float uWater;
        uniform float uG;
        uniform float uFlight;
        attribute vec4 aSeed;
        varying float vA;
        ${GLSL_BILLBOARD}
        void main() {
          float life = fract(uTime / (uFlight * 1.05) + aSeed.z);
          float t = life * uFlight * 1.05;
          vec3 p = uLip + uDir * (aSeed.y * t) + uSideDir * aSeed.x * uWidth * (1.0 + 0.5 * t);
          p.y -= 0.5 * uG * t * t;
          // spray drifts off sideways a little
          p += uSideDir * sin(aSeed.w * 40.0) * 0.5 * t * t;
          float tiny = billboard(p, 0.035 + aSeed.w * 0.04, 2.0);
          float f = t / uFlight;
          vA = smoothstep(0.1, 0.4, f) * (1.0 - smoothstep(-0.1, 0.1, uWater - p.y)) * tiny * 0.8;
        }
      `,
      fragmentShader: DROP_FRAG,
    });

    // splash: drops bouncing up where the water lands
    const splashN = 200;
    const pSeed = new Float32Array(splashN * 4);
    for (let i = 0; i < splashN; i++) pSeed.set([r() * Math.PI * 2, r(), r(), r()], i * 4);
    const splashGeo = billboardGeometry(splashN, { aSeed: { data: pSeed, size: 4 } });
    const splashMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: fallUniforms,
      vertexShader: /* glsl */ `
        uniform float uTime;
        uniform vec3 uFoot;
        uniform vec3 uSideDir;
        uniform float uWidth;
        uniform float uWater;
        attribute vec4 aSeed;
        varying float vA;
        ${GLSL_BILLBOARD}
        void main() {
          float life = fract(uTime * 1.1 + aSeed.z);
          float t = life * 0.75;
          vec3 out1 = vec3(cos(aSeed.x), 0.0, sin(aSeed.x));
          float up = 2.2 + aSeed.y * 2.6;
          vec3 p = uFoot + uSideDir * (aSeed.w - 0.5) * uWidth * 1.3 + out1 * (0.3 + (0.8 + aSeed.y) * t);
          p.y += up * t - 0.5 * 12.0 * t * t;
          float tiny = billboard(p, 0.04 + aSeed.w * 0.05, 2.0);
          vA = (1.0 - smoothstep(-0.05, 0.05, uWater - p.y)) * (1.0 - life) * tiny * 0.85;
        }
      `,
      fragmentShader: DROP_FRAG,
    });

    // soft mist rolling off the splash
    const mistN = 60;
    const mSeed = new Float32Array(mistN * 4);
    for (let i = 0; i < mistN; i++) mSeed.set([r() - 0.5, r() - 0.5, r(), r()], i * 4);
    const mistGeo = billboardGeometry(mistN, { aSeed: { data: mSeed, size: 4 } });
    const mistMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: fallUniforms,
      vertexShader: /* glsl */ `
        uniform float uTime;
        uniform vec3 uFoot;
        uniform vec3 uSideDir;
        uniform vec3 uDir;
        uniform float uWidth;
        attribute vec4 aSeed;
        varying float vA;
        ${GLSL_BILLBOARD}
        void main() {
          float life = fract(uTime * 0.09 + aSeed.z);
          vec3 p = uFoot + uSideDir * aSeed.x * uWidth * 1.4 + uDir * aSeed.y * 3.0;
          p += vec3(sin(aSeed.w * 30.0), 0.0, cos(aSeed.w * 20.0)) * life * 1.5 + vec3(0.0, 0.2 + life * 3.5, 0.0);
          billboard(p, 0.7 + life * 1.3, 4.0);
          vA = sin(life * 3.14159) * 0.11;
        }
      `,
      fragmentShader: /* glsl */ `
        varying float vA;
        varying vec2 vUv;
        void main() {
          float d = length(vUv - 0.5);
          float a = smoothstep(0.5, 0.0, d);
          a *= a * vA;
          gl_FragColor = vec4(vec3(0.6, 0.9, 1.0), a);
        }
      `,
    });

    // churning foam on the surface where it lands
    const foamGeo = new THREE.CircleGeometry(3.4, 48);
    foamGeo.rotateX(-Math.PI / 2);
    foamGeo.translate(foot.x, DEEP_LEVEL + 0.04, foot.z);
    const foamMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      fog: true,
      uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), uTime: shared.uTime },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        #include <fog_pars_vertex>
        void main() {
          vUv = uv;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        varying vec2 vUv;
        #include <fog_pars_fragment>
        ${NOISE}
        void main() {
          vec2 c = vUv - 0.5;
          float d = length(c) * 2.0;
          // foam pattern that spreads outward from the middle
          vec2 q = c / max(d, 0.001) * (d * 5.0 - uTime * 1.2);
          float n = vnoise(q * 1.6 + 11.0) * 0.55 + vnoise(c * 14.0 + vec2(uTime * 0.3, -uTime * 0.25)) * 0.45;
          float foam = smoothstep(0.45, 0.75, n) * (1.0 - smoothstep(0.35, 1.0, d)) + (1.0 - smoothstep(0.0, 0.5, d)) * 0.35 * n;
          gl_FragColor = vec4(vec3(0.75, 0.95, 1.0) * 0.8, clamp(foam, 0.0, 1.0) * 0.7);
          #include <fog_fragment>
        }
      `,
    });
    return { rockGeo, rockMat, height, ground, waterGeo, waterMat, dropsGeo, dropsMat, splashGeo, splashMat, mistGeo, mistMat, foamGeo, foamMat };
  }, []);

  return (
    <>
      <mesh geometry={built.rockGeo} material={built.rockMat} position={[FALLS.x, built.ground + built.height / 2, FALLS.z]} />
      <RigidBody type="fixed" colliders={false} friction={1}>
        <CylinderCollider args={[built.height / 2, FALLS.r * 0.98]} position={[FALLS.x, built.ground + built.height / 2, FALLS.z]} />
      </RigidBody>
      <mesh geometry={built.foamGeo} material={built.foamMat} renderOrder={2} />
      <mesh geometry={built.waterGeo} material={built.waterMat} renderOrder={3} frustumCulled={false} />
      <mesh geometry={built.dropsGeo} material={built.dropsMat} frustumCulled={false} renderOrder={4} />
      <mesh geometry={built.splashGeo} material={built.splashMat} frustumCulled={false} renderOrder={4} />
      <mesh geometry={built.mistGeo} material={built.mistMat} frustumCulled={false} renderOrder={5} />
      {/* a little glowing spring on top feeds the falls */}
      <Lake x={FALLS.x} z={FALLS.z} r={2.2} level={FALLS_TOP + 0.03} tint={[0.2, 1.1, 1.5]} />
    </>
  );
}

// ---------------------------------------------------------------- rope bridge

/** The rope bridge over the deep lake: planks, posts with lanterns, ropes, and invisible rails. */
export function Bridge() {
  const built = useMemo(() => {
    const r = mulberry32(64);
    const { x, z0, z1, width } = BRIDGE;
    const planks: THREE.Matrix4[] = [];
    for (let z = z0; z <= z1; z += 0.92) {
      const y = bridgeDeckY(z);
      const slope = (bridgeDeckY(z + 0.3) - bridgeDeckY(z - 0.3)) / 0.6;
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.atan(slope) + (r() - 0.5) * 0.04, (r() - 0.5) * 0.05, (r() - 0.5) * 0.03));
      planks.push(new THREE.Matrix4().compose(new THREE.Vector3(x + (r() - 0.5) * 0.08, y - 0.06, z), q, new THREE.Vector3(width + (r() - 0.5) * 0.2, 0.12, 0.8)));
    }
    const plankMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: "#4a3442", roughness: 0.9 }),
      planks.length,
    );
    planks.forEach((m, i) => plankMesh.setMatrixAt(i, m));
    plankMesh.computeBoundingSphere();

    const posts: THREE.Matrix4[] = [];
    const lanterns: THREE.Matrix4[] = [];
    for (let z = z0; z <= z1 + 0.01; z += (z1 - z0) / 12) {
      const y = bridgeDeckY(z);
      for (const s of [-1, 1]) {
        posts.push(new THREE.Matrix4().compose(new THREE.Vector3(x + s * (width / 2 + 0.08), y + 0.35, z), new THREE.Quaternion(), new THREE.Vector3(0.09, 1.35, 0.09)));
        lanterns.push(new THREE.Matrix4().compose(new THREE.Vector3(x + s * (width / 2 + 0.08), y + 1.12, z), new THREE.Quaternion(), new THREE.Vector3(0.13, 0.17, 0.13)));
      }
    }
    const postMesh = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(1, 1, 1, 8),
      new THREE.MeshStandardMaterial({ color: "#3a2a36", roughness: 0.95 }),
      posts.length,
    );
    posts.forEach((m, i) => postMesh.setMatrixAt(i, m));
    postMesh.computeBoundingSphere();
    const lanternMesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(1, 16, 12),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 0.85, 0.4) }),
      lanterns.length,
    );
    lanterns.forEach((m, i) => lanternMesh.setMatrixAt(i, m));
    lanternMesh.computeBoundingSphere();

    const ropes = [-1, 1].map((s) => {
      const pts: THREE.Vector3[] = [];
      for (let z = z0; z <= z1 + 0.01; z += 1) pts.push(new THREE.Vector3(x + s * (width / 2 + 0.08), bridgeDeckY(z) + 0.92 - Math.sin(((z - z0) / ((z1 - z0) / 12)) * Math.PI) ** 2 * 0.12, z));
      return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.035, 6, false);
    });
    const ropeMat = new THREE.MeshStandardMaterial({ color: "#c9a27a", roughness: 0.9, emissive: "#3a2410", emissiveIntensity: 0.4 });

    // physics: deck segments plus low invisible rails so you don't roll off
    const segs: Array<{ pos: [number, number, number]; rot: [number, number, number]; half: number }> = [];
    const step = 2;
    for (let z = z0; z < z1; z += step) {
      const za = z;
      const zb = Math.min(z + step, z1);
      const ya = bridgeDeckY(za);
      const yb = bridgeDeckY(zb);
      const len = Math.hypot(zb - za, yb - ya);
      const ang = -Math.atan2(yb - ya, zb - za);
      segs.push({ pos: [x, (ya + yb) / 2 - 0.1, (za + zb) / 2], rot: [ang, 0, 0], half: len / 2 + 0.06 });
    }
    return { plankMesh, postMesh, lanternMesh, ropes, ropeMat, segs };
  }, []);

  return (
    <>
      <primitive object={built.plankMesh} />
      <primitive object={built.postMesh} />
      <primitive object={built.lanternMesh} />
      {built.ropes.map((g, i) => (
        <mesh key={i} geometry={g} material={built.ropeMat} />
      ))}
      <RigidBody type="fixed" colliders={false} friction={1.2}>
        {built.segs.map((s, i) => {
          // rails sit 0.6 m "up" in the tilted frame of each deck segment
          const ang = s.rot[0];
          const up: [number, number] = [0.6 * Math.cos(ang), 0.6 * Math.sin(ang)];
          return [
            <CuboidCollider key={`d${i}`} args={[BRIDGE.width / 2, 0.1, s.half]} position={s.pos} rotation={s.rot} />,
            ...[-1, 1].map((side) => (
              <CuboidCollider
                key={`r${i}${side}`}
                args={[0.06, 0.55, s.half]}
                position={[s.pos[0] + side * (BRIDGE.width / 2 + 0.1), s.pos[1] + up[0], s.pos[2] + up[1]]}
                rotation={s.rot}
              />
            )),
          ];
        })}
      </RigidBody>
    </>
  );
}

// ---------------------------------------------------------------- fog: slow cycle, and underwater

const FOG_AIR = new THREE.Color(WORLD.fogColor);
const FOG_WATER = new THREE.Color("#03303c");

/**
 * The fog: it slowly thickens and clears (a 2½ minute cycle) and turns thick
 * and teal underwater. Also keeps uProj (pixels per metre) up to date.
 */
export function Atmosphere() {
  const scene = useThree((s) => s.scene);
  const fog = useMemo(() => new THREE.FogExp2(WORLD.fogColor, WORLD.fogDensity), []);
  const bg = useMemo(() => new THREE.Color(WORLD.fogColor), []);
  useEffect(() => {
    scene.fog = fog;
    scene.background = bg;
    return () => {
      scene.fog = null;
      scene.background = null;
    };
  }, [scene, fog, bg]);
  const state = useMemo(() => ({ water: 0, t: 0 }), []);
  useFrame(({ camera, size, gl }, delta) => {
    const dt = Math.min(delta, 0.05);
    state.t += dt;
    const cam = camera as THREE.PerspectiveCamera;
    shared.uProj.value = (size.height * gl.getPixelRatio()) / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2));
    const c = camera.position;
    // only once the camera is properly below the surface, so skimming it doesn't
    // flicker the screen dark teal and back
    const under =
      inDeepWater(c.x, c.y + 0.3, c.z) ||
      (c.y < LAKE_LEVEL - 0.3 && Math.hypot(c.x - LAKE.x, c.z - LAKE.z) < LAKE.r * 1.3);
    environment.underwater = under;
    state.water = THREE.MathUtils.damp(state.water, under ? 1 : 0, 6, dt);
    // a slow breath of fog: about two and a half minutes from clear to thick and back
    const cycle = 0.5 - 0.5 * Math.cos((state.t / 150) * Math.PI * 2);
    environment.fog = cycle;
    const air = THREE.MathUtils.lerp(0.009, 0.028, cycle);
    fog.density = THREE.MathUtils.lerp(air, 0.075, state.water);
    fog.color.copy(FOG_AIR).lerp(FOG_WATER, state.water);
    bg.copy(fog.color);
  });
  return null;
}
