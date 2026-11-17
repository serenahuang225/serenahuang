"use client";
import { useFrame, useThree } from "@react-three/fiber";
import {
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
  TUNNEL_RADIUS,
  WORLD,
  bridgeDeckY,
  caveCrystals,
  inDeepWater,
  mulberry32,
  smoothstep,
  terrainHeight,
} from "./world-data";
import { GLSL_COMMON, GLSL_LIGHTS, lightUniforms, shared } from "./shared";
import { Lake, makeRockMaterial } from "./terrain";

/** Live environment state other modules (sound, HUD) can read. */
export const environment = { underwater: false, fog: 0 };

// ---------------------------------------------------------------- shared bits

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

function tunnelRadius(t: number) {
  const mouth = smoothstep(0.065, 0.0, t) + smoothstep(0.935, 1.0, t);
  return TUNNEL_RADIUS + (TUNNEL_MOUTH - TUNNEL_RADIUS) * mouth;
}

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

  // crystals growing from the walls and ceiling (never the floor you roll on)
  const r = mulberry32(31337);
  const crystals: THREE.Matrix4[] = [];
  const colors: THREE.Color[] = [];
  const palette = [new THREE.Color("#7fe8ff"), new THREE.Color("#b48cff"), new THREE.Color("#ff8be0"), new THREE.Color("#8cffd9")];
  for (let k = 0; k < 190; k++) {
    const t = 0.08 + r() * 0.84;
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
    return { geo, wall, crystalMesh, positions, indices, exit };
  }, []);

  return (
    <>
      <mesh geometry={built.geo} material={built.wall} />
      <primitive object={built.crystalMesh} />
      <RigidBody type="fixed" colliders={false} friction={1}>
        <TrimeshCollider args={[built.positions, built.indices]} />
      </RigidBody>
      {/* the pool where the tunnel surfaces inside the cave */}
      <Lake x={built.exit.x} z={built.exit.z} r={TUNNEL_MOUTH * 0.75} level={DEEP_LEVEL} tint={[0.2, 1.0, 1.6]} />
    </>
  );
}

// ---------------------------------------------------------------- the cave

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
    let k = 0;
    while (k < n) {
      const a = r() * Math.PI * 2;
      const y = 0.35 + r() * 0.62;
      const rr = Math.sqrt(1 - y * y) * R * 0.95;
      wp.set([Math.cos(a) * rr, y * CAVE.height * 0.95, Math.sin(a) * rr], k * 3);
      seed[k] = r();
      k++;
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
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(c.rx, 0, c.rz));
      crystals.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(c.x, c.y, c.z), q, new THREE.Vector3(c.r, c.h, c.r)));
      crystals.setColorAt(i, c.hue.clone().multiplyScalar(1.1));
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
      const center = new THREE.Vector3(c.x, c.y, c.z).addScaledVector(up, c.h * 0.45);
      return { pos: center.toArray() as [number, number, number], rot: [c.rx, 0, c.rz] as [number, number, number], args: [c.h * 0.45, c.r * 0.9] as [number, number] };
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

    // the falling sheet of water
    const dir = new THREE.Vector3(DEEP.x - FALLS.x, 0, DEEP.z - FALLS.z).normalize();
    const side = new THREE.Vector3(-dir.z, 0, dir.x);
    const lip = new THREE.Vector3(FALLS.x, FALLS_TOP - 0.15, FALLS.z).addScaledVector(dir, FALLS.r * 0.82);
    const drop = FALLS_TOP - DEEP_LEVEL + 0.3;
    const seg = 40;
    const width = 3.4;
    const wpos: number[] = [];
    const wuv: number[] = [];
    const widx: number[] = [];
    for (let i = 0; i <= seg; i++) {
      const v = i / seg;
      const out = 0.35 + 3.2 * Math.pow(v, 1.4);
      const spread = 1 + v * 0.35;
      for (let j = 0; j <= 1; j++) {
        const u = j;
        const p = lip
          .clone()
          .addScaledVector(dir, out)
          .addScaledVector(side, (u - 0.5) * width * spread)
          .add(new THREE.Vector3(0, -v * drop, 0));
        wpos.push(p.x, p.y, p.z);
        wuv.push(u, v);
      }
    }
    for (let i = 0; i < seg; i++) {
      const a = i * 2;
      widx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
    const waterGeo = new THREE.BufferGeometry();
    waterGeo.setAttribute("position", new THREE.Float32BufferAttribute(wpos, 3));
    waterGeo.setAttribute("uv", new THREE.Float32BufferAttribute(wuv, 2));
    waterGeo.setIndex(widx);
    const waterMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
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
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float vnoise(vec2 p) {
          vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
        }
        void main() {
          vec2 p = vec2(vUv.x * 16.0, vUv.y * 5.0 - uTime * 1.1);
          float streak = vnoise(p) * 0.6 + vnoise(p * vec2(2.3, 1.7) + 7.0) * 0.4;
          float edge = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x);
          float a = (0.42 + streak * 0.45) * edge * smoothstep(0.0, 0.05, vUv.y);
          vec3 col = mix(vec3(0.12, 0.55, 0.65), vec3(0.6, 1.0, 1.0), streak) * (0.55 + 0.25 * streak);
          gl_FragColor = vec4(col, a);
          #include <fog_fragment>
        }
      `,
    });

    // soft mist where it lands
    const r = mulberry32(9);
    const mistN = 70;
    const mp = new Float32Array(mistN * 3);
    const ms = new Float32Array(mistN);
    const foot = lip.clone().addScaledVector(dir, 3.6);
    for (let i = 0; i < mistN; i++) {
      mp.set([foot.x + (r() - 0.5) * 4.5, DEEP_LEVEL, foot.z + (r() - 0.5) * 4.5], i * 3);
      ms[i] = r();
    }
    const mistGeo = new THREE.BufferGeometry();
    mistGeo.setAttribute("position", new THREE.BufferAttribute(mp, 3));
    mistGeo.setAttribute("aSeed", new THREE.BufferAttribute(ms, 1));
    const mistMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uTime: shared.uTime },
      vertexShader: /* glsl */ `
        uniform float uTime;
        attribute float aSeed;
        varying float vA;
        void main() {
          float life = fract(uTime * 0.08 + aSeed);
          vec3 p = position + vec3(sin(aSeed * 30.0) * life, life * 3.0, cos(aSeed * 20.0) * life);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          vA = sin(life * 3.14159) * 0.22;
          gl_PointSize = (1.6 + life * 2.5) * 280.0 / max(-mv.z, 0.5);
        }
      `,
      fragmentShader: /* glsl */ `
        varying float vA;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d) * vA;
          gl_FragColor = vec4(vec3(0.55, 0.9, 1.0) * a, a);
        }
      `,
    });
    return { rockGeo, rockMat, height, ground, waterGeo, waterMat, mistGeo, mistMat };
  }, []);

  return (
    <>
      <mesh geometry={built.rockGeo} material={built.rockMat} position={[FALLS.x, built.ground + built.height / 2, FALLS.z]} />
      <RigidBody type="fixed" colliders={false} friction={1}>
        <CylinderCollider args={[built.height / 2, FALLS.r * 0.98]} position={[FALLS.x, built.ground + built.height / 2, FALLS.z]} />
      </RigidBody>
      <mesh geometry={built.waterGeo} material={built.waterMat} renderOrder={3} />
      <points geometry={built.mistGeo} material={built.mistMat} frustumCulled={false} renderOrder={4} />
      {/* a little glowing spring on top feeds the falls */}
      <Lake x={FALLS.x} z={FALLS.z} r={2.2} level={FALLS_TOP + 0.03} tint={[0.2, 1.1, 1.5]} />
    </>
  );
}

// ---------------------------------------------------------------- rope bridge

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
    const under =
      inDeepWater(c.x, c.y, c.z) ||
      (c.y < LAKE_LEVEL && Math.hypot(c.x - LAKE.x, c.z - LAKE.z) < LAKE.r * 1.3);
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
