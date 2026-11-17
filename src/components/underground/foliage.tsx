"use client";
import { useMemo } from "react";
import * as THREE from "three";
import { mulberry32 } from "./world-data";
import {
  AMBIENT,
  GLSL_CAMERA_FADE,
  GLSL_COMMON,
  GLSL_LIGHTS,
  GLSL_MAP,
  ensureFoliageMap,
  lightUniforms,
  shared,
} from "./shared";

/**
 * Foliage lives in a field of fixed size that wraps around the ball. Every
 * plant still has one stable spot in the world (it doesn't swim as you move),
 * the GPU only draws what's near you, and the vertex shader bends each plant
 * away from the ball and its recent path so nothing ever pokes through it.
 */

function fieldUniforms(tile: number, fade: number) {
  ensureFoliageMap();
  return {
    ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
    uTime: shared.uTime,
    uTrail: shared.uTrail,
    uCenter: shared.uCenter,
    uMap: shared.uMap,
    uMapInfo: shared.uMapInfo,
    uTile: { value: tile },
    uFade: { value: fade },
    uAmbient: { value: AMBIENT },
    ...lightUniforms(),
  };
}

const FIELD_VERTEX_HEAD = /* glsl */ `
  ${GLSL_COMMON}
  ${GLSL_MAP}
  uniform vec2 uCenter;
  uniform float uTile;
  uniform float uFade;
  attribute vec2 aOffset;
  attribute vec2 aRand;
  #include <fog_pars_vertex>

  vec2 wrapField(vec2 off) {
    return uCenter + mod(off - uCenter + 0.5 * uTile, uTile) - 0.5 * uTile;
  }
`;

// ---------------------------------------------------------------- grass

function bladeGeometry() {
  const segs = 4;
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const w = 1 - t * 0.85;
    if (i < segs) {
      pos.push(-0.5 * w, t, 0, 0.5 * w, t, 0);
    } else {
      pos.push(0, 1, 0);
    }
  }
  for (let i = 0; i < segs - 1; i++) {
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const last = (segs - 1) * 2;
  idx.push(last, last + 1, last + 2);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

export function Grass({ count = 60000, tile = 110 }: { count?: number; tile?: number }) {
  const { geometry, material } = useMemo(() => {
    const base = bladeGeometry();
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.index = base.index;
    geometry.setAttribute("position", base.getAttribute("position"));
    const r = mulberry32(404);
    const off = new Float32Array(count * 2);
    const rnd = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      off[i * 2] = (r() - 0.5) * tile;
      off[i * 2 + 1] = (r() - 0.5) * tile;
      rnd[i * 2] = r();
      rnd[i * 2 + 1] = r();
    }
    geometry.setAttribute("aOffset", new THREE.InstancedBufferAttribute(off, 2));
    geometry.setAttribute("aRand", new THREE.InstancedBufferAttribute(rnd, 2));
    geometry.instanceCount = count;
    const material = new THREE.ShaderMaterial({
      fog: true,
      side: THREE.DoubleSide,
      // grass thins out sooner: far-off blades are thinner than a pixel and sparkle
      uniforms: fieldUniforms(tile, tile * 0.32),
      vertexShader: /* glsl */ `
        ${FIELD_VERTEX_HEAD}
        varying float vT;
        varying vec3 vWP;
        varying float vTipGlow;
        varying vec3 vTint;
        void main() {
          vec2 xz = wrapField(aOffset);
          vec4 m = sampleMap(xz);
          float ground = m.r;
          float density = m.g;
          float keep = step(aRand.y, density);
          float fade = 1.0 - smoothstep(uFade * 0.8, uFade, length(xz - uCenter));
          float h = mix(0.18, 0.62, aRand.x * aRand.x) * (0.55 + 0.6 * density) * keep * fade;
          float w = 0.075 + 0.035 * aRand.y;
          float ang = hash12(xz * 3.1) * 6.2831;
          vec3 local = vec3(position.x * w, position.y * h, 0.0);
          float ca = cos(ang), sa = sin(ang);
          local = vec3(local.x * ca, local.y, local.x * sa);
          float t = position.y;
          vec3 base = vec3(xz.x, ground, xz.y);
          vec2 push = pushAt(base, h, 0.62);
          float pressed = flattenAt(base, h, 0.62);
          vec2 view = clearViewAt(base, h);
          vec2 wind = vec2(
            sin(uTime * 0.45 + xz.x * 0.21 + xz.y * 0.13),
            cos(uTime * 0.35 + xz.y * 0.17)
          ) * 0.07 + vec2(hash12(xz) - 0.5, hash12(xz + 9.0) - 0.5) * 0.35;
          vec2 bend = (wind * (1.0 - max(length(push), pressed)) + push * 1.25 + view * 0.9) * h;
          vec3 wp = base + local;
          wp.xz += bend * t * t;
          wp.y -= length(bend) * t * t * 0.55;
          wp.y = mix(wp.y, base.y + local.y * 0.25, pressed * 0.8);
          vT = t;
          vWP = wp;
          vTipGlow = 0.0;
          vTint = mix(vec3(0.15, 1.0, 0.85), vec3(0.65, 0.4, 1.0), step(0.7, hash12(floor(xz * 0.05))));
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
        varying float vT;
        varying vec3 vWP;
        varying float vTipGlow;
        varying vec3 vTint;
        #include <fog_pars_fragment>
        void main() {
          cameraFade(vWP, 0.12, 0.35);
          vec3 albedo = mix(vec3(0.04, 0.1, 0.1), vec3(0.13, 0.42, 0.38), vT);
          vec3 lit = albedo * (uAmbient * 3.0 + glowLights(vWP, vec3(0.0, 1.0, 0.0), 1.0) * 1.6);
          float shimmer = 0.8 + 0.2 * sin(uTime * 0.3 + vWP.x * 0.8 + vWP.z * 0.5);
          // thin glowing tips turn into flickering sparkles far away; fade them
          float tipFade = 1.0 - smoothstep(10.0, 24.0, length(vWP - cameraPosition));
          vec3 glow = vTint * (0.06 + 0.24 * vT * vT) * shimmer;
          glow += vTint * smoothstep(0.7, 1.0, vT) * vTipGlow * 1.4 * shimmer * tipFade;
          // never bright enough to trigger the glow effect, so swaying blades can't flash
          gl_FragColor = vec4(min(lit + glow, vec3(0.55)), 1.0);
          #include <fog_fragment>
        }
      `,
    });
    return { geometry, material };
  }, [count, tile]);
  return <mesh geometry={geometry} material={material} frustumCulled={false} />;
}

// ---------------------------------------------------------------- leaves

/** A rosette of broad leaves, each a curved strip with a vein. */
function rosetteGeometry(leaves: number) {
  const along = 7;
  const across = 2; // vertices on each side of the vein
  const pos: number[] = [];
  const data: number[] = []; // t (along), s (across), leaf index
  const idx: number[] = [];
  const r = mulberry32(31);
  for (let l = 0; l < leaves; l++) {
    const yaw = (l / leaves) * Math.PI * 2 + (r() - 0.5) * 0.5;
    const lift = 0.55 + r() * 0.45;
    const len = 0.75 + r() * 0.35;
    const start = pos.length / 3;
    for (let i = 0; i <= along; i++) {
      const t = i / along;
      const width = Math.sin(Math.pow(t, 0.75) * Math.PI) * 0.26 * len;
      // arching curve: rises, then droops at the tip
      const dist = t * len;
      const y = Math.sin(t * Math.PI * 0.85) * lift * 0.55 * len + t * 0.05;
      for (let j = -across; j <= across; j++) {
        const s = j / across;
        const cup = Math.abs(s) * 0.06 * len;
        const lx = dist;
        const lz = s * width;
        const cx = Math.cos(yaw) * lx - Math.sin(yaw) * lz;
        const cz = Math.sin(yaw) * lx + Math.cos(yaw) * lz;
        pos.push(cx, y + cup, cz);
        data.push(t, s, l);
      }
    }
    const row = across * 2 + 1;
    for (let i = 0; i < along; i++) {
      for (let j = 0; j < row - 1; j++) {
        const a = start + i * row + j;
        const b = a + row;
        idx.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("aLeaf", new THREE.Float32BufferAttribute(data, 3));
  g.setIndex(idx);
  return g;
}

export function Leaves({ count = 7000, tile = 100 }: { count?: number; tile?: number }) {
  const { geometry, material } = useMemo(() => {
    const base = rosetteGeometry(6);
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.index = base.index;
    geometry.setAttribute("position", base.getAttribute("position"));
    geometry.setAttribute("aLeaf", base.getAttribute("aLeaf"));
    const r = mulberry32(505);
    const off = new Float32Array(count * 2);
    const rnd = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      off[i * 2] = (r() - 0.5) * tile;
      off[i * 2 + 1] = (r() - 0.5) * tile;
      rnd[i * 2] = r();
      rnd[i * 2 + 1] = r();
    }
    geometry.setAttribute("aOffset", new THREE.InstancedBufferAttribute(off, 2));
    geometry.setAttribute("aRand", new THREE.InstancedBufferAttribute(rnd, 2));
    geometry.instanceCount = count;
    const material = new THREE.ShaderMaterial({
      fog: true,
      side: THREE.DoubleSide,
      uniforms: fieldUniforms(tile, tile * 0.46),
      vertexShader: /* glsl */ `
        ${FIELD_VERTEX_HEAD}
        attribute vec3 aLeaf;
        varying vec3 vLeaf;
        varying vec3 vWP;
        varying vec3 vN;
        varying vec3 vTint;
        varying float vGlowy;
        void main() {
          vec2 xz = wrapField(aOffset);
          vec4 m = sampleMap(xz);
          float ground = m.r;
          float keep = step(aRand.y, m.b);
          float fade = 1.0 - smoothstep(uFade * 0.8, uFade, length(xz - uCenter));
          float big = step(0.9, aRand.x);
          float size = mix(mix(0.35, 0.9, aRand.x / 0.9), mix(1.5, 2.6, (aRand.x - 0.9) * 10.0), big);
          size *= keep * fade;
          float ang = hash12(xz * 2.3) * 6.2831;
          float ca = cos(ang), sa = sin(ang);
          vec3 lp = position * size;
          lp = vec3(lp.x * ca - lp.z * sa, lp.y, lp.x * sa + lp.z * ca);
          vec3 base = vec3(xz.x, ground - 0.02, xz.y);
          float t = aLeaf.x;
          // each leaf is pushed on its own, from where its tip would be
          vec3 tipDir = normalize(vec3(lp.x, 0.0, lp.z) + 1e-4);
          float reach = 0.5 + size * 0.75;
          vec2 push = pushAt(base, size * 0.55, reach);
          float pressed = flattenAt(base, size * 0.55, reach);
          vec2 view = clearViewAt(base, size * 0.6);
          vec2 wind = vec2(sin(uTime * 0.35 + xz.x * 0.3 + aLeaf.z), cos(uTime * 0.3 + xz.y * 0.3)) * 0.04;
          float k = t * t;
          vec3 wp = base + lp;
          wp.xz += (push * 0.85 + view * 1.1 + wind) * size * k;
          wp.y -= (length(push) * 0.55 + length(view) * 0.6) * size * k;
          // pressed flat under the ball: leaves lie down evenly instead of twitching
          wp.y = mix(wp.y, ground + 0.03 + lp.y * 0.12, pressed * 0.85);
          wp.y = max(wp.y, ground + 0.01);
          vLeaf = aLeaf;
          vWP = wp;
          vN = normalize(vec3(-tipDir.x * 0.3, 1.0, -tipDir.z * 0.3));
          float region = hash12(floor(xz * 0.04));
          vTint = region < 0.6 ? vec3(0.1, 1.0, 0.75) : (region < 0.85 ? vec3(0.55, 0.35, 1.0) : vec3(1.0, 0.35, 0.8));
          vGlowy = step(0.55, hash12(xz * 5.3));
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
        varying vec3 vLeaf;
        varying vec3 vWP;
        varying vec3 vN;
        varying vec3 vTint;
        varying float vGlowy;
        #include <fog_pars_fragment>
        void main() {
          cameraFade(vWP, 0.15, 0.45);
          float t = vLeaf.x;
          float s = abs(vLeaf.y);
          vec3 albedo = mix(vec3(0.02, 0.08, 0.075), vec3(0.06, 0.26, 0.21), t);
          albedo *= 0.8 + 0.2 * sin(s * 30.0 + t * 12.0);
          vec3 lit = albedo * (uAmbient * 2.2 + glowLights(vWP, vN, 0.8) * 1.5);
          float vein = 1.0 - smoothstep(0.0, 0.14, s);
          float side = (1.0 - smoothstep(0.0, 0.05, abs(fract(t * 6.0 - s * 1.5) - 0.5) - 0.42)) * step(0.15, s);
          float edge = smoothstep(0.75, 1.0, s);
          float pulse = 0.78 + 0.22 * sin(uTime * 0.3 - t * 3.0 + vLeaf.z);
          float tipFade = 1.0 - smoothstep(14.0, 30.0, length(vWP - cameraPosition));
          vec3 glow = vTint * (vein * 0.55 + side * 0.18 + edge * 0.25) * (0.3 + vGlowy * 0.9) * pulse;
          glow += vTint * smoothstep(0.92, 1.0, t) * 0.5 * vGlowy * tipFade;
          gl_FragColor = vec4(min(lit + glow * smoothstep(0.05, 0.3, t), vec3(0.75)), 1.0);
          #include <fog_fragment>
        }
      `,
    });
    return { geometry, material };
  }, [count, tile]);
  return <mesh geometry={geometry} material={material} frustumCulled={false} />;
}
