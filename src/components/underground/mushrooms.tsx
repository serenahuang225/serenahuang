"use client";
import { useFrame } from "@react-three/fiber";
import {
  ConvexHullCollider,
  CuboidCollider,
  CylinderCollider,
  RigidBody,
} from "@react-three/rapier";
import { useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  CAP_HEIGHT,
  HOLLOW_LOGS,
  LOG_RADII,
  PAD_HEIGHT,
  pads,
  type CapShape,
  type Mushroom,
  capProfile,
  capTop,
  crystals,
  mulberry32,
  smallMushrooms,
  solidMushrooms,
} from "./world-data";
import { GLSL_COMMON, shared } from "./shared";

// ---------------------------------------------------------------- material

function makeMushroomMaterial(opts: { push?: boolean; squash?: boolean; flat?: boolean; glow?: number }) {
  const mat = new THREE.MeshStandardMaterial({
    roughness: 0.5,
    metalness: 0,
    flatShading: !!opts.flat,
  });
  const defines: Record<string, string> = {};
  if (opts.push) defines.USE_PUSH = "";
  if (opts.squash) defines.USE_SQUASH = "";
  mat.defines = defines;
  const glow = (opts.glow ?? 1).toFixed(3);
  mat.customProgramCacheKey = () => `mush-${!!opts.push}-${!!opts.squash}-${!!opts.flat}-${glow}`;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = shared.uTime;
    shader.uniforms.uTrail = shared.uTrail;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        ${GLSL_COMMON}
        attribute float aGlow;
        attribute float aCap;
        varying float vGlow;
        varying float vCap;
        varying float vPhase;
        varying vec3 vLocal;
        #ifdef USE_SQUASH
          attribute float aSquash;
        #endif
        #ifdef USE_PUSH
          attribute vec4 aBase;
        #endif`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vLocal = position;
        #ifdef USE_SQUASH
          transformed.y *= 1.0 - aSquash;
          transformed.xz *= 1.0 + aSquash * 0.6;
        #endif
        vGlow = aGlow;
        vCap = aCap;
        #ifdef USE_INSTANCING
          vPhase = hash12(instanceMatrix[3].xz * 1.37) * 6.2831;
        #else
          vPhase = 0.0;
        #endif`,
      )
      .replace(
        "#include <project_vertex>",
        `vec4 wp4 = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          wp4 = instanceMatrix * wp4;
        #endif
        wp4 = modelMatrix * wp4;
        #ifdef USE_PUSH
        {
          float k = clamp((wp4.y - aBase.y) / max(aBase.w, 0.01), 0.0, 1.25);
          float reach = 0.42 + aBase.w * 0.55;
          vec2 p = pushAt(aBase.xyz, aBase.w, reach);
          float pressed = flattenAt(aBase.xyz, aBase.w, reach);
          float sway = sin(uTime * 1.3 + aBase.x * 0.7 + aBase.z * 0.5) * 0.035;
          vec2 bend = (p * 0.9 + vec2(sway, sway * 0.6)) * aBase.w;
          wp4.xz += bend * k * k;
          wp4.y -= length(bend) * k * k * 0.5;
          // squashed under the ball
          wp4.y = mix(wp4.y, aBase.y + (wp4.y - aBase.y) * 0.3, pressed * 0.75);
        }
        #endif
        vec4 mvPosition = viewMatrix * wp4;
        gl_Position = projectionMatrix * mvPosition;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        ${GLSL_COMMON}
        varying float vGlow;
        varying float vCap;
        varying float vPhase;
        varying vec3 vLocal;`,
      )
      .replace(
        "#include <color_fragment>",
        `vec3 hue = vec3(1.0);
        #if defined( USE_COLOR )
          hue = vColor.rgb;
        #endif
        vec3 stemCol = vec3(0.30, 0.28, 0.36);
        vec3 capCol = hue * 0.2 + 0.025;
        diffuseColor.rgb = mix(stemCol, capCol, vCap);`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        {
          float pulse = 0.82 + 0.18 * sin(uTime * 0.22 + vPhase);
          vec3 V = normalize(vViewPosition);
          float rim = pow(1.0 - abs(dot(normal, V)), 2.5);
          vec3 g = hue * (vGlow * 1.9 * pulse + rim * vCap * 0.7);
          // glowing spots on the upper surface of some caps
          vec2 sp = vLocal.xz * 4.0;
          vec2 cell = floor(sp);
          vec2 cc = cell + 0.5 + 0.3 * (vec2(hash12(cell + vPhase), hash12(cell - vPhase)) - 0.5);
          float spot = 1.0 - smoothstep(0.12, 0.2, length(sp - cc));
          spot *= step(0.45, hash12(cell + 3.7 + vPhase)) * step(0.02, vLocal.y) * vCap;
          spot *= step(3.0, vPhase);
          g += mix(hue, vec3(1.0), 0.4) * spot * 0.8 * pulse;
          #ifdef USE_PUSH
            // tiny far-off caps shrink below a pixel and sparkle; let them fade
            g *= 1.0 - 0.8 * smoothstep(16.0, 38.0, length(vViewPosition));
          #endif
          totalEmissiveRadiance += g * ${glow};
        }`,
      );
  };
  return mat;
}

// ---------------------------------------------------------------- geometry

function stemGeometry(radial: number, detail: number) {
  const pts: THREE.Vector2[] = [new THREE.Vector2(0.0001, 0)];
  const prof = [
    [1.35, 0],
    [1.12, 0.04],
    [0.98, 0.12],
  ];
  for (const [r, y] of prof) pts.push(new THREE.Vector2(r, y));
  for (let i = 1; i <= detail; i++) {
    const t = 0.12 + (i / detail) * 0.88;
    pts.push(new THREE.Vector2(0.95 - 0.16 * t + 0.05 * Math.sin(t * 7), t));
  }
  pts.push(new THREE.Vector2(0.0001, 1));
  const geo = new THREE.LatheGeometry(pts, radial);
  const pos = geo.attributes.position;
  const glow = new Float32Array(pos.count);
  const cap = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    glow[i] = THREE.MathUtils.smoothstep(y, 0.7, 1.0) * 0.35 + (1 - THREE.MathUtils.smoothstep(y, 0, 0.1)) * 0.12;
  }
  geo.setAttribute("aGlow", new THREE.BufferAttribute(glow, 1));
  geo.setAttribute("aCap", new THREE.BufferAttribute(cap, 1));
  return geo;
}

function capGeometry(shape: CapShape, radial: number, steps: number) {
  const pts = capProfile(shape, steps).reverse();
  const geo = new THREE.LatheGeometry(pts, radial);
  const pos = geo.attributes.position;
  const glow = new Float32Array(pos.count);
  const cap = new Float32Array(pos.count).fill(1);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const r = Math.hypot(x, z);
    glow[i] = y < -0.02 ? 0.95 : 0.1 + 0.75 * THREE.MathUtils.smoothstep(r, 0.8, 1.0);
  }
  geo.setAttribute("aGlow", new THREE.BufferAttribute(glow, 1));
  geo.setAttribute("aCap", new THREE.BufferAttribute(cap, 1));
  return geo;
}

function hullPoints(shape: CapShape, capR: number) {
  const prof = capProfile(shape, 6);
  const out: number[] = [];
  const seg = 12;
  for (const p of prof) {
    for (let s = 0; s < seg; s++) {
      const a = (s / seg) * Math.PI * 2;
      out.push(Math.cos(a) * p.x * capR, p.y * capR, Math.sin(a) * p.x * capR);
    }
  }
  return new Float32Array(out);
}

// ---------------------------------------------------------------- solid mushrooms

type CapInfo = {
  m: Mushroom;
  center: THREE.Vector3;
  topY: number;
  shape: CapShape;
  slot: number;
};

/** Cap lookup used by the ball to know which mushroom it just landed on. */
export const caps: CapInfo[] = [];
const jiggles = new Map<number, { t: number; amp: number }>();

export function findCap(pos: THREE.Vector3, radius: number) {
  let best = -1;
  let bestY = -Infinity;
  for (let i = 0; i < caps.length; i++) {
    const c = caps[i];
    const dx = pos.x - c.center.x;
    const dz = pos.z - c.center.z;
    const reach = c.m.capR + radius * 0.4;
    if (dx * dx + dz * dz > reach * reach) continue;
    if (pos.y < c.center.y - 0.05) continue;
    if (pos.y > c.topY + radius + 1.5) continue;
    if (c.center.y > bestY) {
      bestY = c.center.y;
      best = i;
    }
  }
  return best;
}

export function jiggleCap(i: number, strength: number) {
  jiggles.set(i, { t: 0, amp: Math.min(0.32, strength) });
}

export function SolidMushrooms() {
  const built = useMemo(() => {
    const stemMat = makeMushroomMaterial({});
    const capMat = makeMushroomMaterial({ squash: true });
    const stems = new THREE.InstancedMesh(stemGeometry(28, 14), stemMat, solidMushrooms.length);
    const byShape: Mushroom[][] = [[], [], [], []];
    for (const m of solidMushrooms) byShape[m.shape].push(m);
    const capMeshes = byShape.map((list, shape) => {
      const geo = capGeometry(shape as CapShape, 48, 18);
      const squash = new Float32Array(list.length);
      geo.setAttribute("aSquash", new THREE.InstancedBufferAttribute(squash, 1));
      const mesh = new THREE.InstancedMesh(geo, capMat, Math.max(1, list.length));
      mesh.count = list.length;
      return mesh;
    });
    const mat = new THREE.Matrix4();
    const scale = new THREE.Vector3();
    const slots = [0, 0, 0, 0];
    caps.length = 0;
    solidMushrooms.forEach((m, i) => {
      const { top, q, up } = capTop(m);
      mat.compose(new THREE.Vector3(m.x, m.y, m.z), q, scale.set(m.stemR, m.height, m.stemR));
      stems.setMatrixAt(i, mat);
      stems.setColorAt(i, m.hue);
      const center = top.clone().addScaledVector(up, 0.08 * m.capR);
      const slot = slots[m.shape]++;
      const capMesh = capMeshes[m.shape];
      mat.compose(center, q, scale.setScalar(m.capR));
      capMesh.setMatrixAt(slot, mat);
      capMesh.setColorAt(slot, m.hue);
      caps.push({ m, center, topY: center.y + CAP_HEIGHT[m.shape] * m.capR, shape: m.shape, slot });
    });
    for (const mesh of [stems, ...capMeshes]) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
    const colliders = solidMushrooms.map((m, i) => {
      const { q, up } = capTop(m);
      const euler = new THREE.Euler().setFromQuaternion(q);
      const stemCenter = new THREE.Vector3(m.x, m.y, m.z).addScaledVector(up, m.height / 2);
      return {
        key: i,
        stemPos: stemCenter.toArray() as [number, number, number],
        rot: [euler.x, euler.y, euler.z] as [number, number, number],
        stemArgs: [m.height / 2, m.stemR * 0.92] as [number, number],
        capPos: caps[i].center.toArray() as [number, number, number],
        hull: hullPoints(m.shape, m.capR),
      };
    });
    return { stems, capMeshes, colliders };
  }, []);

  useFrame((_, delta) => {
    if (!jiggles.size) return;
    const dt = Math.min(delta, 0.05);
    const touched = new Set<number>();
    for (const [i, j] of jiggles) {
      j.t += dt;
      const c = caps[i];
      const attr = built.capMeshes[c.shape].geometry.getAttribute("aSquash") as THREE.InstancedBufferAttribute;
      const v = j.t > 1.6 ? 0 : j.amp * Math.exp(-j.t * 4) * Math.cos(j.t * 16);
      attr.setX(c.slot, v);
      touched.add(c.shape);
      if (j.t > 1.6) jiggles.delete(i);
    }
    for (const s of touched) {
      (built.capMeshes[s].geometry.getAttribute("aSquash") as THREE.InstancedBufferAttribute).needsUpdate = true;
    }
  });

  return (
    <>
      <primitive object={built.stems} />
      {built.capMeshes.map((m, i) => (
        <primitive key={i} object={m} />
      ))}
      <RigidBody type="fixed" colliders={false} friction={1}>
        {built.colliders.map((c) => (
          <group key={c.key}>
            <CylinderCollider args={c.stemArgs} position={c.stemPos} rotation={c.rot} />
            <ConvexHullCollider args={[c.hull]} position={c.capPos} rotation={c.rot} friction={0.9} />
          </group>
        ))}
      </RigidBody>
    </>
  );
}

// ---------------------------------------------------------------- spring puffballs

const padJiggles = new Map<number, number>();
export function jigglePad(i: number) {
  padJiggles.set(i, 0);
}

export function SpringPads() {
  const built = useMemo(() => {
    const geo = new THREE.SphereGeometry(1, 36, 18);
    const pos = geo.attributes.position;
    const glow = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) glow[i] = 0.35 + 0.65 * THREE.MathUtils.smoothstep(pos.getY(i), 0.2, 1.0);
    geo.setAttribute("aGlow", new THREE.BufferAttribute(glow, 1));
    geo.setAttribute("aCap", new THREE.BufferAttribute(new Float32Array(pos.count).fill(1), 1));
    geo.setAttribute("aSquash", new THREE.InstancedBufferAttribute(new Float32Array(pads.length), 1));
    const puff = new THREE.InstancedMesh(geo, makeMushroomMaterial({ squash: true, glow: 1.5 }), pads.length);
    const ring = new THREE.InstancedMesh(
      new THREE.TorusGeometry(1, 0.035, 8, 48).rotateX(Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: "#ffffff" }),
      pads.length,
    );
    const mtx = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const bright = new THREE.Color();
    pads.forEach((p, i) => {
      mtx.compose(new THREE.Vector3(p.x, p.y, p.z), q, new THREE.Vector3(p.r, PAD_HEIGHT, p.r));
      puff.setMatrixAt(i, mtx);
      puff.setColorAt(i, p.hue);
      mtx.compose(new THREE.Vector3(p.x, p.y + 0.03, p.z), q, new THREE.Vector3(p.r * 1.25, 1, p.r * 1.25));
      ring.setMatrixAt(i, mtx);
      ring.setColorAt(i, bright.copy(p.hue).multiplyScalar(2.2));
    });
    for (const m of [puff, ring]) {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
      m.computeBoundingSphere();
    }
    return { puff, ring };
  }, []);

  useFrame((_, delta) => {
    if (!padJiggles.size) return;
    const attr = built.puff.geometry.getAttribute("aSquash") as THREE.InstancedBufferAttribute;
    for (const [i, t0] of padJiggles) {
      const t = t0 + Math.min(delta, 0.05);
      const v = t > 1.2 ? 0 : 0.55 * Math.exp(-t * 5) * Math.cos(t * 22);
      attr.setX(i, v);
      if (t > 1.2) padJiggles.delete(i);
      else padJiggles.set(i, t);
    }
    attr.needsUpdate = true;
  });

  return (
    <>
      <primitive object={built.puff} />
      <primitive object={built.ring} />
      <RigidBody type="fixed" colliders={false} friction={1}>
        {pads.map((p, i) => (
          <CylinderCollider key={i} args={[PAD_HEIGHT / 2, p.r * 0.95]} position={[p.x, p.y + PAD_HEIGHT / 2, p.z]} />
        ))}
      </RigidBody>
    </>
  );
}

// ---------------------------------------------------------------- small mushrooms

export function SmallMushrooms() {
  const meshes = useMemo(() => {
    const mat = makeMushroomMaterial({ push: true, glow: 1.15 });
    const list = smallMushrooms;
    const stemGeo = stemGeometry(7, 4);
    const stemBase = new Float32Array(list.length * 4);
    const byShape: number[][] = [[], [], [], []];
    list.forEach((m, i) => byShape[m.shape].push(i));
    const stems = new THREE.InstancedMesh(stemGeo, mat, list.length);
    const capMeshes = byShape.map((idx, shape) => {
      const geo = capGeometry(shape as CapShape, 11, 6);
      const base = new Float32Array(Math.max(1, idx.length) * 4);
      geo.setAttribute("aBase", new THREE.InstancedBufferAttribute(base, 4));
      const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, idx.length));
      mesh.count = idx.length;
      return mesh;
    });
    const mtx = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const scale = new THREE.Vector3();
    const up = new THREE.Vector3();
    list.forEach((m, i) => {
      e.set(m.lean, m.rotY, 0, "YXZ");
      q.setFromEuler(e);
      const base = new THREE.Vector3(m.x, m.y, m.z);
      mtx.compose(base, q, scale.set(m.stemR, m.height, m.stemR));
      stems.setMatrixAt(i, mtx);
      stems.setColorAt(i, m.hue);
      stemBase.set([m.x, m.y, m.z, m.height + m.capR * 0.5], i * 4);
    });
    stemGeo.setAttribute("aBase", new THREE.InstancedBufferAttribute(stemBase, 4));
    byShape.forEach((idx, shape) => {
      const mesh = capMeshes[shape];
      const baseAttr = mesh.geometry.getAttribute("aBase") as THREE.InstancedBufferAttribute;
      idx.forEach((i, slot) => {
        const m = list[i];
        e.set(m.lean, m.rotY, 0, "YXZ");
        q.setFromEuler(e);
        up.set(0, 1, 0).applyQuaternion(q);
        const top = new THREE.Vector3(m.x, m.y, m.z).addScaledVector(up, m.height + 0.06 * m.capR);
        mtx.compose(top, q, scale.setScalar(m.capR));
        mesh.setMatrixAt(slot, mtx);
        mesh.setColorAt(slot, m.hue);
        baseAttr.setXYZW(slot, m.x, m.y, m.z, m.height + m.capR * 0.5);
      });
    });
    for (const mesh of [stems, ...capMeshes]) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
      mesh.frustumCulled = false;
    }
    return [stems, ...capMeshes];
  }, []);
  return (
    <>
      {meshes.map((m, i) => (
        <primitive key={i} object={m} />
      ))}
    </>
  );
}

// ---------------------------------------------------------------- hollow logs

function barkMaterial(inner: boolean) {
  const mat = new THREE.MeshStandardMaterial({
    color: inner ? "#2a1a1e" : "#241a24",
    roughness: 1,
    side: inner ? THREE.BackSide : THREE.FrontSide,
    emissive: inner ? new THREE.Color("#ff8a3c") : new THREE.Color("#000000"),
    emissiveIntensity: inner ? 0.06 : 0,
  });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = shared.uTime;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\nvarying vec3 vLP;`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>\nvLP = position;`);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        ${GLSL_COMMON}
        varying vec3 vLP;`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        float grain = sin(atan(vLP.z, vLP.y) * 24.0 + sin(vLP.x * 3.0) * 1.5) * 0.5 + 0.5;
        diffuseColor.rgb *= 0.75 + grain * 0.35;`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        {
          vec2 sp = vec2(atan(vLP.z, vLP.y) * 2.2, vLP.x * 3.0);
          vec2 cell = floor(sp);
          float h = hash12(cell);
          float d = length(sp - cell - 0.5);
          float moss = step(0.7, h) * (1.0 - smoothstep(0.08, 0.3, d));
          totalEmissiveRadiance += vec3(0.2, 1.6, 1.2) * moss * (0.75 + 0.25 * sin(uTime * 0.2 + h * 30.0));
        }`,
      );
  };
  return mat;
}

export function HollowLogs() {
  const built = useMemo(() => {
    const { inner, outer } = LOG_RADII;
    const length = 7;
    const r = mulberry32(12);
    const shell = new THREE.CylinderGeometry(outer, outer, length, 22, 10, true);
    const sp = shell.attributes.position;
    for (let i = 0; i < sp.count; i++) {
      const x = sp.getX(i);
      const z = sp.getZ(i);
      const k = 1 + (r() - 0.5) * 0.06;
      sp.setX(i, x * k);
      sp.setZ(i, z * k);
    }
    shell.computeVertexNormals();
    const ringA = new THREE.RingGeometry(inner, outer, 22);
    ringA.rotateX(-Math.PI / 2);
    ringA.translate(0, length / 2, 0);
    const ringB = new THREE.RingGeometry(inner, outer, 22);
    ringB.rotateX(Math.PI / 2);
    ringB.translate(0, -length / 2, 0);
    const outerGeo = mergeGeometries([shell, ringA, ringB])!;
    outerGeo.rotateZ(-Math.PI / 2);
    const innerGeo = new THREE.CylinderGeometry(inner, inner, length, 22, 1, true);
    innerGeo.rotateZ(-Math.PI / 2);
    const outerMesh = new THREE.InstancedMesh(outerGeo, barkMaterial(false), HOLLOW_LOGS.length);
    const innerMesh = new THREE.InstancedMesh(innerGeo, barkMaterial(true), HOLLOW_LOGS.length);
    const mtx = new THREE.Matrix4();
    HOLLOW_LOGS.forEach((l, i) => {
      mtx.compose(
        new THREE.Vector3(l.x, l.y, l.z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, l.yaw, l.pitch)),
        new THREE.Vector3(1, 1, 1),
      );
      outerMesh.setMatrixAt(i, mtx);
      innerMesh.setMatrixAt(i, mtx);
    });
    outerMesh.computeBoundingSphere();
    innerMesh.computeBoundingSphere();
    const slabs = 12;
    const rm = (inner + outer) / 2;
    const half = (outer - inner) / 2;
    const tang = rm * Math.tan(Math.PI / slabs) * 1.12;
    const slabList = Array.from({ length: slabs }, (_, k) => {
      const a = (k / slabs) * Math.PI * 2;
      return {
        pos: [0, Math.cos(a) * rm, Math.sin(a) * rm] as [number, number, number],
        rot: [a, 0, 0] as [number, number, number],
      };
    });
    return { outerMesh, innerMesh, slabList, half, tang, length };
  }, []);
  return (
    <>
      <primitive object={built.outerMesh} />
      <primitive object={built.innerMesh} />
      {HOLLOW_LOGS.map((l, i) => (
        <RigidBody
          key={i}
          type="fixed"
          colliders={false}
          position={[l.x, l.y, l.z]}
          rotation={[0, l.yaw, l.pitch]}
          friction={0.8}
        >
          {built.slabList.map((s, k) => (
            <CuboidCollider
              key={k}
              args={[built.length / 2, built.half, built.tang]}
              position={s.pos}
              rotation={s.rot}
            />
          ))}
        </RigidBody>
      ))}
    </>
  );
}

// ---------------------------------------------------------------- crystals

export function Crystals() {
  const built = useMemo(() => {
    const pts = [
      new THREE.Vector2(0.0001, 0),
      new THREE.Vector2(1, 0),
      new THREE.Vector2(1, 0.8),
      new THREE.Vector2(0.0001, 1),
    ];
    const geo = new THREE.LatheGeometry(pts, 6);
    const pos = geo.attributes.position;
    const glow = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) glow[i] = 0.35 + 0.9 * THREE.MathUtils.smoothstep(pos.getY(i), 0.3, 1.0);
    geo.setAttribute("aGlow", new THREE.BufferAttribute(glow, 1));
    geo.setAttribute("aCap", new THREE.BufferAttribute(new Float32Array(pos.count).fill(1), 1));
    const mesh = new THREE.InstancedMesh(geo, makeMushroomMaterial({ flat: true, glow: 1.2 }), crystals.length);
    const mtx = new THREE.Matrix4();
    const colliders = crystals.map((c, i) => {
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(c.rx, 0, c.rz));
      mtx.compose(new THREE.Vector3(c.x, c.y, c.z), q, new THREE.Vector3(c.r, c.h, c.r));
      mesh.setMatrixAt(i, mtx);
      mesh.setColorAt(i, c.hue);
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
      const center = new THREE.Vector3(c.x, c.y, c.z).addScaledVector(up, c.h * 0.45);
      return {
        pos: center.toArray() as [number, number, number],
        rot: [c.rx, 0, c.rz] as [number, number, number],
        args: [c.h * 0.45, c.r * 0.9] as [number, number],
      };
    });
    mesh.computeBoundingSphere();
    return { mesh, colliders };
  }, []);
  return (
    <>
      <primitive object={built.mesh} />
      <RigidBody type="fixed" colliders={false}>
        {built.colliders.map((c, i) => (
          <CylinderCollider key={i} args={c.args} position={c.pos} rotation={c.rot} />
        ))}
      </RigidBody>
    </>
  );
}
