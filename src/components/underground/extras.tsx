"use client";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ORBS, TUNNEL_RADIUS, mulberry32, strands, tunnelDistance } from "./world-data";
import {
  AMBIENT,
  GLSL_BILLBOARD,
  billboardGeometry,
  GLSL_CAMERA_FADE,
  GLSL_COMMON,
  GLSL_LIGHTS,
  GLSL_MAP,
  ensureFoliageMap,
  lightUniforms,
  player,
  shared,
} from "./shared";
import { orbStore } from "./orb-store";
import { sound } from "./audio";
import { guideStore } from "./guide-store";

/*
 * Everything in here glows slowly. Pulses run at a fraction of a hertz so
 * nothing ever reads as a flash.
 */

function wrapUniforms(tile: number) {
  ensureFoliageMap();
  return {
    ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
    uTime: shared.uTime,
    uTrail: shared.uTrail,
    uCenter: shared.uCenter,
    uMap: shared.uMap,
    uMapInfo: shared.uMapInfo,
    uTile: { value: tile },
    uAmbient: { value: AMBIENT },
    ...lightUniforms(),
  };
}

function randomOffsets(count: number, tile: number, seed: number) {
  const r = mulberry32(seed);
  const off = new Float32Array(count * 2);
  const rnd = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    off[i * 2] = (r() - 0.5) * tile;
    off[i * 2 + 1] = (r() - 0.5) * tile;
    rnd[i * 2] = r();
    rnd[i * 2 + 1] = r();
  }
  return { off, rnd };
}

// ---------------------------------------------------------------- glow flowers

function flowerGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  for (const rot of [0, Math.PI / 2]) {
    const stalk = new THREE.PlaneGeometry(0.022, 1, 1, 5);
    stalk.translate(0, 0.5, 0);
    stalk.rotateY(rot);
    const n = stalk.attributes.position.count;
    stalk.setAttribute("aPart", new THREE.BufferAttribute(new Float32Array(n), 1));
    parts.push(stalk.toNonIndexed());
  }
  const bulb = new THREE.IcosahedronGeometry(1, 1);
  bulb.deleteAttribute("uv");
  const n = bulb.attributes.position.count;
  bulb.setAttribute("aPart", new THREE.BufferAttribute(new Float32Array(n).fill(1), 1));
  for (const p of parts) p.deleteAttribute("uv");
  return mergeGeometries([...parts, bulb])!;
}

export function GlowFlowers({ count = 5000, tile = 90 }: { count?: number; tile?: number }) {
  const { geometry, material } = useMemo(() => {
    const base = flowerGeometry();
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.index = base.index;
    geometry.setAttribute("position", base.getAttribute("position"));
    geometry.setAttribute("normal", base.getAttribute("normal"));
    geometry.setAttribute("aPart", base.getAttribute("aPart"));
    const { off, rnd } = randomOffsets(count, tile, 777);
    geometry.setAttribute("aOffset", new THREE.InstancedBufferAttribute(off, 2));
    geometry.setAttribute("aRand", new THREE.InstancedBufferAttribute(rnd, 2));
    geometry.instanceCount = count;
    const material = new THREE.ShaderMaterial({
      fog: true,
      side: THREE.DoubleSide,
      uniforms: wrapUniforms(tile),
      vertexShader: /* glsl */ `
        ${GLSL_COMMON}
        ${GLSL_MAP}
        uniform vec2 uCenter;
        uniform float uTile;
        attribute vec2 aOffset;
        attribute vec2 aRand;
        attribute float aPart;
        varying float vPart;
        varying float vT;
        varying vec3 vWP;
        varying vec3 vHue;
        varying float vPhase;
        #include <fog_pars_vertex>
        void main() {
          vec2 xz = uCenter + mod(aOffset - uCenter + 0.5 * uTile, uTile) - 0.5 * uTile;
          vec4 m = sampleMap(xz);
          float keep = step(aRand.y, m.a * 0.9);
          float fade = 1.0 - smoothstep(uTile * 0.36, uTile * 0.46, length(xz - uCenter));
          float h = mix(0.22, 0.75, aRand.x) * keep * fade;
          float bulbR = mix(0.045, 0.085, hash12(xz * 3.7)) * keep * fade;
          vec3 local = aPart > 0.5 ? position * bulbR + vec3(0.0, h, 0.0) : vec3(position.x, position.y * h, position.z);
          float t = aPart > 0.5 ? 1.0 : position.y;
          vec3 base = vec3(xz.x, m.r, xz.y);
          vec2 push = pushAt(base, h, 0.55);
          float pressed = flattenAt(base, h, 0.55);
          vec2 view = clearViewAt(base, h);
          vec2 wind = vec2(sin(uTime * 0.3 + xz.x * 0.4), cos(uTime * 0.25 + xz.y * 0.4)) * 0.04;
          vec2 bend = (wind + push * 1.3 + view * 0.9) * h;
          vec3 wp = base + local;
          wp.xz += bend * t * t;
          wp.y -= length(bend) * t * t * 0.5;
          wp.y = mix(wp.y, base.y + local.y * 0.2, pressed * 0.8);
          vPart = aPart;
          vT = t;
          vWP = wp;
          float pick = hash12(xz * 1.9 + 4.0);
          vHue = pick < 0.35 ? vec3(1.0, 0.55, 0.16) : pick < 0.6 ? vec3(1.0, 0.36, 0.7) : pick < 0.85 ? vec3(0.3, 0.95, 1.0) : vec3(0.7, 1.0, 0.3);
          vPhase = hash12(xz) * 6.2831;
          vec4 mvPosition = viewMatrix * vec4(wp, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }
      `,
      fragmentShader: /* glsl */ `
        ${GLSL_COMMON}
        ${GLSL_LIGHTS}
        ${GLSL_CAMERA_FADE}
        uniform vec3 uAmbient;
        varying float vPart;
        varying float vT;
        varying vec3 vWP;
        varying vec3 vHue;
        varying float vPhase;
        #include <fog_pars_fragment>
        void main() {
          cameraFade(vWP, 0.12, 0.35);
          float pulse = 0.75 + 0.25 * sin(uTime * 0.35 + vPhase);
          vec3 col;
          if (vPart > 0.5) {
            col = vHue * 0.95 * pulse;
          } else {
            vec3 albedo = vec3(0.05, 0.16, 0.12);
            col = albedo * (uAmbient * 2.5 + glowLights(vWP, vec3(0.0, 1.0, 0.0), 1.0)) + vHue * 0.12 * vT * vT;
          }
          gl_FragColor = vec4(col, 1.0);
          #include <fog_fragment>
        }
      `,
    });
    return { geometry, material };
  }, [count, tile]);
  return <mesh geometry={geometry} material={material} frustumCulled={false} />;
}

// ---------------------------------------------------------------- hanging strands

export function HangingStrands() {
  const { geometry, material } = useMemo(() => {
    const planes: THREE.BufferGeometry[] = [];
    for (const rot of [0, Math.PI / 2]) {
      const p = new THREE.PlaneGeometry(1, 1, 1, 16);
      p.translate(0, -0.5, 0);
      p.rotateY(rot);
      p.deleteAttribute("normal");
      planes.push(p);
    }
    const base = mergeGeometries(planes)!;
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.index = base.index;
    geometry.setAttribute("position", base.getAttribute("position"));
    geometry.setAttribute("uv", base.getAttribute("uv"));
    const n = strands.length;
    const anchor = new Float32Array(n * 3);
    const info = new Float32Array(n * 2);
    const hue = new Float32Array(n * 3);
    strands.forEach((s, i) => {
      anchor.set([s.x, s.y, s.z], i * 3);
      info.set([s.len, s.seed], i * 2);
      hue.set([s.hue.r, s.hue.g, s.hue.b], i * 3);
    });
    geometry.setAttribute("aAnchor", new THREE.InstancedBufferAttribute(anchor, 3));
    geometry.setAttribute("aInfo", new THREE.InstancedBufferAttribute(info, 2));
    geometry.setAttribute("aHue", new THREE.InstancedBufferAttribute(hue, 3));
    geometry.instanceCount = n;
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      fog: true,
      uniforms: {
        ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
        uTime: shared.uTime,
        uTrail: shared.uTrail,
      },
      vertexShader: /* glsl */ `
        ${GLSL_COMMON}
        attribute vec3 aAnchor;
        attribute vec2 aInfo;
        attribute vec3 aHue;
        varying vec2 vUv;
        varying float vT;
        varying float vLen;
        varying float vSeed;
        varying vec3 vHue;
        #include <fog_pars_vertex>
        void main() {
          float len = aInfo.x;
          float seed = aInfo.y;
          float t = -position.y;
          vec3 wp = aAnchor + vec3(position.x * 0.12, -t * len, position.z * 0.12);
          // slow sway, more at the free end
          vec2 sway = vec2(sin(uTime * 0.32 + seed * 20.0), cos(uTime * 0.27 + seed * 13.0)) * 0.05 * len;
          wp.xz += sway * t * t;
          // part around the ball instead of passing through it
          for (int i = 0; i < ${8}; i++) {
            vec4 b = uTrail[i];
            vec2 d = wp.xz - b.xz;
            float dist = length(d);
            float vy = abs(wp.y - b.y);
            float f = (1.0 - smoothstep(0.2, 1.1, dist)) * (1.0 - smoothstep(0.4, 1.2, vy)) * b.w;
            wp.xz += (d / max(dist, 0.001)) * f * 0.9 * t;
          }
          vUv = uv;
          vT = t;
          vLen = len;
          vSeed = seed;
          vHue = aHue;
          vec4 mvPosition = viewMatrix * vec4(wp, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        varying vec2 vUv;
        varying float vT;
        varying float vLen;
        varying float vSeed;
        varying vec3 vHue;
        #include <fog_pars_fragment>
        void main() {
          float across = abs(vUv.x - 0.5) * 2.0;
          float along = vT * vLen * 2.2 + vSeed * 7.0;
          float bead = 1.0 - smoothstep(0.0, 0.32, length(vec2((fract(along) - 0.5) * 1.6, across * 0.75)));
          float core = 1.0 - smoothstep(0.0, 0.12, across);
          float pulse = 0.75 + 0.25 * sin(uTime * 0.4 - vT * 3.0 + vSeed * 6.0);
          float a = max(bead * 1.8, core * 0.18) * pulse * (1.0 - smoothstep(0.85, 1.0, vT) * 0.5);
          if (a < 0.01) discard;
          vec3 col = mix(vHue, vec3(1.0), 0.2) * a * 0.75;
          gl_FragColor = vec4(col, a);
          #include <fog_fragment>
        }
      `,
    });
    return { geometry, material };
  }, []);
  return <mesh geometry={geometry} material={material} frustumCulled={false} renderOrder={3} />;
}

// ---------------------------------------------------------------- fireflies

export function Fireflies({ count = 260, tile = 56 }: { count?: number; tile?: number }) {
  const { geometry, material } = useMemo(() => {
    const r = mulberry32(2024);
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (r() - 0.5) * tile;
      pos[i * 3 + 1] = 0;
      pos[i * 3 + 2] = (r() - 0.5) * tile;
      seed[i * 2] = r();
      seed[i * 2 + 1] = r();
    }
    const geometry = billboardGeometry(count, { aPos: { data: pos, size: 3 }, aSeed: { data: seed, size: 2 } });
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { ...wrapUniforms(tile), uProj: shared.uProj },
      vertexShader: /* glsl */ `
        ${GLSL_COMMON}
        ${GLSL_MAP}
        uniform vec2 uCenter;
        uniform float uTile;
        attribute vec3 aPos;
        attribute vec2 aSeed;
        varying float vA;
        varying vec3 vC;
        ${GLSL_BILLBOARD}
        void main() {
          vec2 wander = vec2(
            sin(uTime * (0.12 + aSeed.x * 0.1) + aSeed.y * 30.0),
            cos(uTime * (0.1 + aSeed.y * 0.1) + aSeed.x * 20.0)
          ) * 1.6;
          vec2 xz = uCenter + mod(aPos.xz + wander - uCenter + 0.5 * uTile, uTile) - 0.5 * uTile;
          float ground = sampleMap(xz).r;
          vec3 wp = vec3(xz.x, ground + 0.45 + aSeed.x * 2.4 + sin(uTime * 0.3 + aSeed.y * 9.0) * 0.25, xz.y);
          // drift out of the ball's way
          for (int i = 0; i < ${8}; i++) {
            vec4 b = uTrail[i];
            vec3 d = wp - b.xyz;
            float dist = length(d);
            float f = (1.0 - smoothstep(0.5, 3.2, dist)) * b.w;
            wp += (d / max(dist, 0.001) + vec3(0.0, 0.6, 0.0)) * f * 1.4;
          }
          float tiny = billboard(wp, 0.09 + aSeed.y * 0.06, 4.0);
          float dist = length(wp - cameraPosition);
          float edge = 1.0 - smoothstep(uTile * 0.38, uTile * 0.48, length(xz - uCenter));
          vA = (0.7 + 0.3 * sin(uTime * 0.25 + aSeed.x * 40.0)) * edge * exp(-pow(dist * 0.03, 2.0)) * tiny * smoothstep(0.3, 1.2, dist);
          vC = aSeed.y < 0.6 ? vec3(1.6, 1.15, 0.35) : vec3(0.9, 1.8, 0.45);
        }
      `,
      fragmentShader: /* glsl */ `
        varying float vA;
        varying vec3 vC;
        varying vec2 vUv;
        void main() {
          float d = length(vUv - 0.5);
          float a = smoothstep(0.5, 0.0, d);
          a *= a;
          gl_FragColor = vec4(vC * a * vA * 0.75, a * vA);
        }
      `,
    });
    return { geometry, material };
  }, [count, tile]);
  return <mesh geometry={geometry} material={material} frustumCulled={false} />;
}

// ---------------------------------------------------------------- light orbs (energy)

const ORB_COLOR = new THREE.Color(1.0, 0.86, 0.55);

export function LightOrbs() {
  const built = useMemo(() => {
    const n = ORBS.length;
    const pos = new Float32Array(n * 3);
    const born = new Float32Array(n).fill(-1); // time it was collected, -1 = still here
    ORBS.forEach((o, i) => pos.set([o.pos.x, o.pos.y, o.pos.z], i * 3));

    // each orb is a camera-facing card (no popping at screen edges, no size cap)
    const glowGeo = billboardGeometry(n, { aPos: { data: pos, size: 3 }, aCollected: { data: born, size: 1 } });
    const glowMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: shared.uTime, uProj: shared.uProj, uColor: { value: ORB_COLOR } },
      vertexShader: /* glsl */ `
        uniform float uTime;
        attribute vec3 aPos;
        attribute float aCollected;
        varying float vA;
        varying float vBurst;
        ${GLSL_BILLBOARD}
        void main() {
          vec3 p = aPos;
          float id = aPos.x * 0.37 + aPos.z * 0.61;
          p.y += sin(uTime * 0.8 + id) * 0.14;
          float age = aCollected < 0.0 ? -1.0 : uTime - aCollected;
          vBurst = age < 0.0 ? 0.0 : clamp(age / 1.1, 0.0, 1.0);
          vA = age < 0.0 ? 1.0 : (age > 1.1 ? 0.0 : 1.0 - vBurst);
          float radius = 0.75 * (1.0 + vBurst * 5.0) * step(age, 1.1);
          billboard(p, radius, 5.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform float uTime;
        varying float vA;
        varying float vBurst;
        varying vec2 vUv;
        void main() {
          float d = length(vUv - 0.5) * 2.0;
          float core = 1.0 - smoothstep(0.0, 0.16, d);
          float halo = pow(1.0 - smoothstep(0.0, 1.0, d), 3.0);
          float ring = vBurst > 0.0 ? (1.0 - smoothstep(0.0, 0.1, abs(d - 0.8))) * 1.5 : 0.0;
          float breathe = 0.85 + 0.15 * sin(uTime * 0.6);
          float a = (core * 4.0 + halo * 0.9 * breathe + ring) * vA;
          if (a < 0.003) discard;
          gl_FragColor = vec4(uColor * a, a);
        }
      `,
    });

    // a faint pillar of light above each orb so you can find it from afar
    const pillarGeo = new THREE.CylinderGeometry(0.1, 0.32, 1, 12, 1, true);
    pillarGeo.translate(0, 0.5, 0);
    const pillarMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: { uColor: { value: ORB_COLOR } },
      vertexShader: /* glsl */ `
        varying float vY;
        void main() {
          vY = uv.y;
          gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        varying float vY;
        void main() {
          float a = (1.0 - vY) * (1.0 - vY) * 0.22;
          gl_FragColor = vec4(uColor * a, a);
        }
      `,
    });
    const pillars = new THREE.InstancedMesh(pillarGeo, pillarMat, n);
    const mtx = new THREE.Matrix4();
    ORBS.forEach((o, i) => {
      mtx.compose(o.pos, new THREE.Quaternion(), new THREE.Vector3(1, 45, 1));
      pillars.setMatrixAt(i, mtx);
    });
    pillars.frustumCulled = false;
    return { glowGeo, glowMat, pillars, born };
  }, []);

  // restore progress saved in this browser
  useEffect(() => {
    orbStore.init(ORBS.length);
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    ORBS.forEach((o, i) => {
      if (orbStore.has(o.id)) {
        built.born[i] = -1000;
        built.pillars.setMatrixAt(i, zero);
      }
    });
    built.pillars.instanceMatrix.needsUpdate = true;
    (built.glowGeo.getAttribute("aCollected") as THREE.BufferAttribute).needsUpdate = true;
  }, [built]);

  useFrame(() => {
    const p = player.position;
    let changed = false;
    for (let i = 0; i < ORBS.length; i++) {
      if (built.born[i] !== -1) continue;
      const o = ORBS[i].pos;
      const dx = p.x - o.x;
      const dy = p.y - o.y;
      const dz = p.z - o.z;
      // orbs in the narrow tunnel are collected anywhere in its cross-section
      const reach = tunnelDistance(o.x, o.y, o.z) < TUNNEL_RADIUS + 0.5 ? 3 : 1.1;
      if (dx * dx + dy * dy + dz * dz < reach * reach) {
        built.born[i] = shared.uTime.value;
        built.pillars.setMatrixAt(i, new THREE.Matrix4().makeScale(0, 0, 0));
        orbStore.collect(ORBS[i].id);
        sound.collect();
        guideStore.discover("orbs");
        changed = true;
      }
    }
    if (changed) {
      (built.glowGeo.getAttribute("aCollected") as THREE.BufferAttribute).needsUpdate = true;
      built.pillars.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      <mesh geometry={built.glowGeo} material={built.glowMat} frustumCulled={false} renderOrder={4} />
      <primitive object={built.pillars} />
    </>
  );
}
