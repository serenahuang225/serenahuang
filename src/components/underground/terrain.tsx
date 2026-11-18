"use client";
import { useFrame } from "@react-three/fiber";
import { RigidBody } from "@react-three/rapier";
import { useMemo } from "react";
import * as THREE from "three";
import { createNoise2D } from "simplex-noise";
import {
  GRID_N,
  DEEP,
  DEEP_LEVEL,
  LAKE,
  LAKE_LEVEL,
  TUNNEL_HOLES,
  LIGHTS,
  WORLD,
  heightGrid,
  mulberry32,
  smoothstep,
} from "./world-data";
import {
  GLSL_BILLBOARD,
  GLSL_COMMON,
  GLSL_LIGHTS,
  billboardGeometry,
  ensureFoliageMap,
  lightUniforms,
  shared,
} from "./shared";

// ---------------------------------------------------------------- rock material

export function makeRockMaterial() {
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.93,
    metalness: 0,
  });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = shared.uTime;
    shader.uniforms.uTrail = shared.uTrail;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        attribute float aMoss;
        varying float vMoss;
        varying vec3 vWP;`,
      )
      .replace(
        "#include <project_vertex>",
        `#include <project_vertex>
        vMoss = aMoss;
        vWP = (modelMatrix * vec4(transformed, 1.0)).xyz;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        ${GLSL_COMMON}
        varying float vMoss;
        varying vec3 vWP;`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        {
          float patchy = 0.5 + 0.5 * sin(vWP.x * 0.21 + sin(vWP.z * 0.17) * 2.0);
          totalEmissiveRadiance += vec3(0.02, 0.12, 0.11) * vMoss * (0.45 + patchy);
        }`,
      );
  };
  return mat;
}

// ---------------------------------------------------------------- ground

function buildGroundGeometry() {
  const N = GRID_N;
  const step = WORLD.size / WORLD.segments;
  const half = WORLD.size / 2;
  const positions = new Float32Array(N * N * 3);
  const colors = new Float32Array(N * N * 3);
  const moss = new Float32Array(N * N);
  const map = ensureFoliageMap();
  const mapData = map.image.data as Float32Array;
  const rock = new THREE.Color("#1d1c28");
  const mossy = new THREE.Color("#15403c");
  const shore = new THREE.Color("#1d2830");
  const c = new THREE.Color();
  for (let iz = 0; iz < N; iz++) {
    for (let ix = 0; ix < N; ix++) {
      const i = iz * N + ix;
      const x = -half + ix * step;
      const z = -half + iz * step;
      const h = heightGrid[i];
      positions[i * 3] = x;
      positions[i * 3 + 1] = h;
      positions[i * 3 + 2] = z;
      const g = mapData[i * 4 + 1];
      const lakeD = Math.hypot(x - LAKE.x, z - LAKE.z);
      c.copy(rock).lerp(mossy, g);
      c.lerp(shore, (1 - smoothstep(LAKE.r * 0.9, LAKE.r * 1.4, lakeD)) * 0.8);
      const wall = smoothstep(150, 205, Math.hypot(x, z));
      c.lerp(rock, wall);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
      moss[i] = g * (1 - wall);
    }
  }
  const index: number[] = [];
  for (let iz = 0; iz < N - 1; iz++) {
    for (let ix = 0; ix < N - 1; ix++) {
      // leave holes where the crystal tunnel opens into the lake floor and the cave
      const cx = -half + (ix + 0.5) * step;
      const cz = -half + (iz + 0.5) * step;
      if (TUNNEL_HOLES.some((h) => Math.hypot(cx - h.x, cz - h.z) < h.r)) continue;
      const a = iz * N + ix;
      const b = a + 1;
      const d = a + N;
      const e = d + 1;
      index.push(a, d, b, b, d, e);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.setAttribute("aMoss", new THREE.BufferAttribute(moss, 1));
  geo.setIndex(index);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

function buildWallGeometry() {
  const noise = createNoise2D(mulberry32(808));
  const geo = new THREE.CylinderGeometry(222, 222, 170, 180, 48, true);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const moss = new Float32Array(pos.count);
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const a = Math.atan2(v.z, v.x);
    const y = v.y + 85;
    const n =
      noise(Math.cos(a) * 3 + y * 0.012, Math.sin(a) * 3 - y * 0.012) * 14 +
      noise(a * 22, y * 0.06) * 3.5;
    const inward = 6 + n + Math.max(0, y - 90) * 0.35;
    const r = 222 - inward;
    pos.setXYZ(i, Math.cos(a) * r, y + 22, Math.sin(a) * r);
    colors[i * 3] = 0.07;
    colors[i * 3 + 1] = 0.07;
    colors[i * 3 + 2] = 0.1;
    moss[i] = 0.25 + 0.25 * Math.sin(a * 9 + y * 0.05);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.setAttribute("aMoss", new THREE.BufferAttribute(moss, 1));
  geo.computeVertexNormals();
  return geo;
}

export function Ground() {
  const { ground, wall, material } = useMemo(
    () => ({
      ground: buildGroundGeometry(),
      wall: buildWallGeometry(),
      // double-sided, so even a camera that slips under the ground sees rock
      material: (() => {
        const m = makeRockMaterial();
        m.side = THREE.DoubleSide;
        return m;
      })(),
    }),
    [],
  );
  return (
    <>
      <RigidBody type="fixed" colliders="trimesh" friction={1.2}>
        <mesh geometry={ground} material={material} />
      </RigidBody>
      <mesh geometry={wall} material={material} />
    </>
  );
}

// ---------------------------------------------------------------- lights

export function GlowLights() {
  return (
    <>
      <hemisphereLight args={["#35588c", "#0b1020", 1.35]} />
      {LIGHTS.map((l, i) => (
        <pointLight
          key={i}
          position={l.pos}
          color={l.color}
          intensity={l.intensity * 260}
          distance={l.range * 1.15}
          decay={1.6}
        />
      ))}
    </>
  );
}

// ---------------------------------------------------------------- water

export function Lake({
  x = LAKE.x,
  z = LAKE.z,
  r = LAKE.r,
  level = LAKE_LEVEL,
  tint = [0.1, 1.4, 1.1],
}: {
  x?: number;
  z?: number;
  r?: number;
  level?: number;
  tint?: [number, number, number];
}) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        fog: true,
        uniforms: {
          ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
          uTime: shared.uTime,
          uTrail: shared.uTrail,
          uCenter: { value: new THREE.Vector3(x, r * 1.45, z) },
          uTint: { value: new THREE.Vector3(...tint) },
          ...lightUniforms(),
        },
        vertexShader: /* glsl */ `
          varying vec3 vWP;
          #include <fog_pars_vertex>
          void main() {
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vWP = wp.xyz;
            vec4 mvPosition = viewMatrix * wp;
            gl_Position = projectionMatrix * mvPosition;
            #include <fog_vertex>
          }
        `,
        fragmentShader: /* glsl */ `
          ${GLSL_COMMON}
          ${GLSL_LIGHTS}
          uniform vec3 uCenter; // x, radius, z
          uniform vec3 uTint;
          varying vec3 vWP;
          #include <fog_pars_fragment>
          void main() {
            vec2 p = vWP.xz;
            float n1 = sin(p.x * 1.1 + uTime * 0.5 + sin(p.y * 0.9 + uTime * 0.3) * 1.5);
            float n2 = sin(p.y * 1.3 - uTime * 0.45 + sin(p.x * 0.7 - uTime * 0.25) * 1.7);
            float caustic = pow(clamp(1.0 - abs(n1 * n2), 0.0, 1.0), 9.0);
            vec3 col = vec3(0.004, 0.025, 0.035);
            col += uTint * caustic * 0.3;
            col += glowLights(vWP, vec3(0.0, 1.0, 0.0), 0.0) * 0.12;
            vec4 ball = uTrail[0];
            float bd = length(p - ball.xz);
            float near = 1.0 - smoothstep(0.0, 1.4, abs(ball.y - vWP.y));
            float rings = sin(bd * 8.0 - uTime * 3.0) * 0.5 + 0.5;
            col += vec3(1.0, 0.45, 0.3) * pow(clamp(rings, 0.0, 1.0), 6.0) * exp(-bd * 0.9) * near * 1.2;
            float edge = smoothstep(uCenter.y, uCenter.y * 0.83, length(p - uCenter.xz));
            // from underneath the surface reads as a bright, wobbly ceiling
            float alpha = gl_FrontFacing ? 0.86 : 0.55;
            gl_FragColor = vec4(col, alpha * edge);
            #include <fog_fragment>
          }
        `,
      }),
    [x, z, r, tint],
  );
  return (
    <mesh position={[x, level, z]} rotation={[-Math.PI / 2, 0, 0]} material={material} renderOrder={2}>
      <circleGeometry args={[r * 1.45, 96]} />
    </mesh>
  );
}

export function DeepLake() {
  return <Lake x={DEEP.x} z={DEEP.z} r={DEEP.r} level={DEEP_LEVEL} tint={[0.15, 0.9, 1.5]} />;
}

// ---------------------------------------------------------------- glowworm ceiling

export function Glowworms() {
  const { geometry, material } = useMemo(() => {
    const r = mulberry32(3);
    const count = 6000;
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * 215;
      const y = 92 + 42 * (1 - Math.pow(d / 215, 2)) + (r() - 0.5) * 8;
      pos[i * 3] = Math.cos(a) * d;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = Math.sin(a) * d;
      seed[i] = r();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geometry.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: shared.uTime },
      vertexShader: /* glsl */ `
        uniform float uTime;
        attribute float aSeed;
        varying float vA;
        varying vec3 vC;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          float tw = 0.7 + 0.3 * sin(uTime * (0.08 + aSeed * 0.14) + aSeed * 50.0);
          vA = tw;
          vC = mix(vec3(0.1, 0.45, 0.8), vec3(0.2, 0.7, 0.6), step(0.8, aSeed));
          gl_PointSize = (2.0 + aSeed * 2.0) * (1.0 + step(0.97, aSeed) * 1.4);
        }
      `,
      fragmentShader: /* glsl */ `
        varying float vA;
        varying vec3 vC;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d);
          gl_FragColor = vec4(vC * a * vA, a * vA);
        }
      `,
    });
    return { geometry, material };
  }, []);
  return <points geometry={geometry} material={material} frustumCulled={false} />;
}

// ---------------------------------------------------------------- floating spores

export function Spores() {
  const { geometry, material } = useMemo(() => {
    const r = mulberry32(17);
    const count = 420;
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (r() - 0.5) * 70;
      pos[i * 3 + 1] = r() * 26;
      pos[i * 3 + 2] = (r() - 0.5) * 70;
      seed[i * 2] = r();
      seed[i * 2 + 1] = r();
    }
    const geometry = billboardGeometry(count, { aPos: { data: pos, size: 3 }, aSeed: { data: seed, size: 2 } });
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: shared.uTime,
        uProj: shared.uProj,
        uCenter: { value: new THREE.Vector3() },
      },
      vertexShader: /* glsl */ `
        uniform float uTime;
        uniform vec3 uCenter;
        attribute vec3 aPos;
        attribute vec2 aSeed;
        varying float vA;
        varying vec3 vC;
        ${GLSL_BILLBOARD}
        void main() {
          vec3 size = vec3(70.0, 26.0, 70.0);
          vec3 p = aPos;
          p.y += uTime * (0.15 + aSeed.x * 0.35);
          p.x += sin(uTime * 0.3 + aSeed.y * 30.0) * 1.5;
          p.z += cos(uTime * 0.25 + aSeed.x * 20.0) * 1.5;
          vec3 base = uCenter - vec3(0.0, 6.0, 0.0);
          vec3 wp = base + mod(p - base, size);
          wp.xz -= size.xz * 0.5;
          float tiny = billboard(wp, 0.07 + aSeed.x * 0.08, 4.0);
          float dist = length(wp - cameraPosition);
          float fade = smoothstep(0.6, 2.5, dist) * exp(-pow(dist * 0.035, 2.0));
          float edge = 1.0 - smoothstep(20.0, 34.0, length(wp.xz - uCenter.xz));
          // they wrap from the top of their box back to the bottom: fade at both ends
          float hy = wp.y - base.y;
          edge *= smoothstep(0.0, 4.0, hy) * (1.0 - smoothstep(size.y - 6.0, size.y, hy));
          vA = fade * edge * tiny * (0.75 + 0.25 * sin(uTime * 0.2 + aSeed.y * 40.0)) * 0.55;
          vC = aSeed.y < 0.5 ? vec3(0.3, 2.0, 2.2) : (aSeed.y < 0.8 ? vec3(1.6, 0.8, 2.6) : vec3(1.6, 2.4, 0.6));
        }
      `,
      fragmentShader: /* glsl */ `
        varying float vA;
        varying vec3 vC;
        varying vec2 vUv;
        void main() {
          float d = length(vUv - 0.5);
          float a = smoothstep(0.5, 0.05, d);
          gl_FragColor = vec4(vC * a * vA, a * vA);
        }
      `,
    });
    return { geometry, material };
  }, []);
  useFrame(({ camera }) => {
    (material.uniforms.uCenter.value as THREE.Vector3).copy(camera.position);
  });
  return <mesh geometry={geometry} material={material} frustumCulled={false} />;
}
