import * as THREE from "three";
import { LIGHTS, MAP_INFO, buildFoliageMap } from "./world-data";

export const TRAIL = 8;

/**
 * Uniform objects shared by every custom material. Updating `.value` once per
 * frame updates all of them.
 */
export const shared = {
  uTime: { value: 0 },
  /** xyz = ball position (current + recent past), w = push strength. */
  uTrail: { value: Array.from({ length: TRAIL }, () => new THREE.Vector4(0, -9999, 0, 0)) },
  uCenter: { value: new THREE.Vector2() },
  uMap: { value: null as THREE.DataTexture | null },
  uMapInfo: { value: MAP_INFO },
  uLightPos: { value: [new THREE.Vector3(), ...LIGHTS.map((l) => l.pos.clone())] },
  uLightCol: {
    value: [
      new THREE.Color("#ff5a32").multiplyScalar(1.5),
      ...LIGHTS.map((l) => l.color.clone().multiplyScalar(l.intensity)),
    ],
  },
  uLightRange: { value: [9.5, ...LIGHTS.map((l) => l.range)] },
};

export const NUM_LIGHTS = LIGHTS.length + 1;

/** Plant density at a spot (0..1 each), read on the CPU for sound. */
export function sampleFoliage(x: number, z: number) {
  const tex = shared.uMap.value;
  if (!tex) return { grass: 0, leaves: 0, flowers: 0 };
  const data = tex.image.data as Float32Array;
  const n = MAP_INFO.z;
  const ix = Math.max(0, Math.min(n - 1, Math.round((x - MAP_INFO.x) / MAP_INFO.y)));
  const iz = Math.max(0, Math.min(n - 1, Math.round((z - MAP_INFO.x) / MAP_INFO.y)));
  const i = (iz * n + ix) * 4;
  return { grass: data[i + 1], leaves: data[i + 2], flowers: data[i + 3] };
}

let mapReady = false;
export function ensureFoliageMap() {
  if (!mapReady) {
    shared.uMap.value = buildFoliageMap();
    mapReady = true;
  }
  return shared.uMap.value!;
}

/** Live state of the player, read by the HUD, camera and foliage. */
export const player = {
  position: new THREE.Vector3(),
  velocity: new THREE.Vector3(),
  ducking: false,
  grounded: false,
};

// ---------------------------------------------------------------- GLSL

export const GLSL_COMMON = /* glsl */ `
uniform float uTime;
uniform vec4 uTrail[${TRAIL}];

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * .1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

/**
 * Sideways push on a plant rooted at base from the ball and its recent path.
 * The push fades to zero right under the ball, so a plant the ball sits on
 * gets pressed flat (see flattenAt) instead of flipping side to side.
 */
vec2 pushAt(vec3 base, float plantH, float reach) {
  vec2 acc = vec2(0.0);
  for (int i = 0; i < ${TRAIL}; i++) {
    vec4 t = uTrail[i];
    vec2 d = base.xz - t.xz;
    float dist = length(d);
    float above = t.y - base.y;
    float f = (1.0 - smoothstep(reach * 0.35, reach, dist)) * t.w;
    f *= smoothstep(0.0, reach * 0.3, dist);
    f *= 1.0 - smoothstep(plantH + 0.25, plantH + 0.9, above);
    f *= smoothstep(-0.8, -0.4, above);
    acc += (d / max(dist, 0.001)) * f;
  }
  float l = length(acc);
  return l > 1.0 ? acc / l : acc;
}

/** How much a plant is pressed down because the ball is on top of it (0..1). */
float flattenAt(vec3 base, float plantH, float reach) {
  float m = 0.0;
  for (int i = 0; i < ${TRAIL}; i++) {
    vec4 t = uTrail[i];
    float dist = length(base.xz - t.xz);
    float above = t.y - base.y;
    float f = (1.0 - smoothstep(0.0, reach * 0.55, dist)) * t.w;
    f *= 1.0 - smoothstep(plantH + 0.25, plantH + 0.9, above);
    f *= smoothstep(-0.8, -0.4, above);
    m = max(m, f);
  }
  return m;
}

/**
 * Plants standing between the camera and the ball lean out of the line of
 * sight (instead of flickering transparent). Returns an xz offset direction
 * scaled by strength (0..1).
 */
vec2 clearViewAt(vec3 base, float plantH) {
  vec3 ball = uTrail[0].xyz;
  vec2 a = cameraPosition.xz;
  vec2 b = ball.xz;
  vec2 ab = b - a;
  float len2 = max(dot(ab, ab), 0.0001);
  float s = clamp(dot(base.xz - a, ab) / len2, 0.0, 1.0);
  vec2 closest = a + ab * s;
  vec2 d = base.xz - closest;
  float dist = length(d);
  // only matters if the plant is tall enough to get in the way
  float sightY = mix(cameraPosition.y, ball.y, s);
  float tall = smoothstep(-0.2, 0.3, base.y + plantH - sightY + 0.35);
  float along = smoothstep(0.0, 0.08, s) * (1.0 - smoothstep(0.88, 1.0, s));
  float f = (1.0 - smoothstep(0.25, 1.1, dist)) * tall * along;
  vec2 side = dist > 0.001 ? d / dist : vec2(-ab.y, ab.x) / sqrt(len2);
  return side * f;
}
`;

/** Screen-door fade so foliage right in front of the camera never blocks the view. */
export const GLSL_CAMERA_FADE = /* glsl */ `
float bayer4(vec2 p) {
  ivec2 i = ivec2(mod(p, 4.0));
  int idx = i.x + i.y * 4;
  float m[16] = float[16](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);
  return (m[idx] + 0.5) / 16.0;
}
void cameraFade(vec3 wp, float nearD, float farD) {
  // only for the last few centimetres in front of the lens
  float d = length(wp - cameraPosition);
  if (bayer4(gl_FragCoord.xy) > smoothstep(nearD, farD, d)) discard;
}
`;

export const GLSL_MAP = /* glsl */ `
uniform sampler2D uMap;
uniform vec3 uMapInfo; // origin, step, size

vec4 sampleMap(vec2 xz) {
  vec2 f = clamp((xz - uMapInfo.x) / uMapInfo.y, vec2(0.0), vec2(uMapInfo.z - 1.001));
  ivec2 i = ivec2(floor(f));
  vec2 t = f - vec2(i);
  vec4 a = texelFetch(uMap, i, 0);
  vec4 b = texelFetch(uMap, i + ivec2(1, 0), 0);
  vec4 c = texelFetch(uMap, i + ivec2(0, 1), 0);
  vec4 d = texelFetch(uMap, i + ivec2(1, 1), 0);
  return mix(mix(a, b, t.x), mix(c, d, t.x), t.y);
}
`;

export const GLSL_LIGHTS = /* glsl */ `
uniform vec3 uLightPos[${NUM_LIGHTS}];
uniform vec3 uLightCol[${NUM_LIGHTS}];
uniform float uLightRange[${NUM_LIGHTS}];

vec3 glowLights(vec3 wp, vec3 n, float wrap) {
  vec3 acc = vec3(0.0);
  for (int i = 0; i < ${NUM_LIGHTS}; i++) {
    vec3 L = uLightPos[i] - wp;
    float d = length(L);
    float att = 1.0 - clamp(d / uLightRange[i], 0.0, 1.0);
    att *= att;
    float ndl = clamp((dot(n, L / max(d, 0.001)) + wrap) / (1.0 + wrap), 0.0, 1.0);
    acc += uLightCol[i] * att * ndl;
  }
  return acc;
}
`;

export function lightUniforms() {
  return {
    uLightPos: shared.uLightPos,
    uLightCol: shared.uLightCol,
    uLightRange: shared.uLightRange,
  };
}

export const AMBIENT = new THREE.Color("#12223a");
