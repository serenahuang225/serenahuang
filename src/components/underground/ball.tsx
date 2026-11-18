"use client";
import { useFrame, useThree } from "@react-three/fiber";
import {
  BallCollider,
  RigidBody,
  useBeforePhysicsStep,
  useRapier,
  type RapierCollider,
  type RapierRigidBody,
} from "@react-three/rapier";
import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import * as THREE from "three";
import {
  BRIDGE,
  CAVE,
  CAVE_FLOOR,
  CRYSTALS,
  DEEP_LEVEL,
  FALLS,
  HOLLOW_LOGS,
  bridgeDeckY,
  LAKE,
  LAKE_LEVEL,
  WORLD,
  inDeepWater,
  pads,
  terrainHeight,
  tunnelDistance,
  TUNNEL_APRON,
  tunnelNearest,
  TUNNEL_RADIUS,
  TUNNEL_SAMPLES,
  TUNNEL_STEP,
} from "./world-data";
import { TRAIL, control, player, sampleFoliage, shared } from "./shared";
import { caps, findCap, jiggleCap, jigglePad } from "./mushrooms";
import { environment } from "./landmarks";
import { sound } from "./audio";
import { lookStore } from "./look-store";
import { guideStore } from "./guide-store";
import { storyStore } from "./story-store";
import { bobState, stick } from "./touch";

const FLUFF_LENGTH = [0.085, 0.13, 0.18, 0.24];

// ---------------------------------------------------------------- input

type Keys = Record<string, boolean>;

function useKeys() {
  const keys = useRef<Keys>({});
  useEffect(() => {
    const game = new Set([
      "KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
      "Space", "ShiftLeft", "ShiftRight", "KeyC", "KeyH", "KeyQ", "KeyE",
    ]);
    const down = (e: KeyboardEvent) => {
      if (guideStore.isOpen() || storyStore.inputBlocked()) {
        if (game.has(e.code) && e.code !== "Space") e.preventDefault();
        return;
      }
      if (game.has(e.code)) e.preventDefault();
      keys.current[e.code] = true;
    };
    const clear = () => {
      if (guideStore.isOpen() || storyStore.inputBlocked()) keys.current = {};
    };
    const unsub = guideStore.subscribe(clear);
    const unsub2 = storyStore.subscribe(clear);
    const up = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };
    const blur = () => {
      keys.current = {};
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      unsub();
      unsub2();
    };
  }, []);
  return keys;
}

type Look = { yaw: number; pitch: number; dist: number; lastManual: number };

function useLook() {
  const look = useRef<Look>({ yaw: 0, pitch: 0.3, dist: 4.6, lastManual: -10 });
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const el = gl.domElement;
    let dragging = false;
    // a finger dragging on the scene (the stick and buttons sit on top, so
    // they never reach here); tracked by id so a second finger can't steer
    let finger: { id: number; x: number; y: number } | null = null;
    const turn = (dx: number, dy: number, speed: number) => {
      const l = look.current;
      l.yaw -= dx * speed;
      // wide range: from looking steeply down to looking almost straight up
      l.pitch = THREE.MathUtils.clamp(l.pitch + dy * speed * 0.92, -1.3, 1.35);
      l.lastManual = performance.now() / 1000;
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "touch") {
        if (!finger) finger = { id: e.pointerId, x: e.clientX, y: e.clientY };
        return;
      }
      dragging = true;
      if (e.pointerType === "mouse" && document.pointerLockElement !== el) {
        el.requestPointerLock?.()?.catch?.(() => {});
      }
    };
    const onUp = (e: PointerEvent) => {
      if (finger && e.pointerId === finger.id) finger = null;
      if (e.pointerType !== "touch") dragging = false;
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") {
        if (!finger || e.pointerId !== finger.id) return;
        turn(e.clientX - finger.x, e.clientY - finger.y, 0.0055);
        finger.x = e.clientX;
        finger.y = e.clientY;
        return;
      }
      const locked = document.pointerLockElement === el;
      if (!locked && !dragging) return;
      turn(e.movementX, e.movementY, 0.0024);
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const l = look.current;
      l.dist = THREE.MathUtils.clamp(l.dist * (1 + Math.sign(e.deltaY) * 0.08), 2.2, 11);
    };
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    window.addEventListener("pointermove", onMove);
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("pointermove", onMove);
      el.removeEventListener("wheel", onWheel);
    };
  }, [gl]);
  return look;
}

// ---------------------------------------------------------------- fur

function furTexture(tint: string | null) {
  const pal = tint
    ? (() => {
        const c = new THREE.Color(tint);
        const hex = (col: THREE.Color) => `#${col.getHexString()}`;
        const rgba = (col: THREE.Color, a: number) => `rgba(${Math.round(col.r * 255)},${Math.round(col.g * 255)},${Math.round(col.b * 255)},${a})`;
        return {
          top: hex(c),
          mid: hex(c),
          bottom: hex(c),
          light: (a: number) => rgba(c.clone().lerp(new THREE.Color("#ffffff"), 0.35), a),
          dark: (a: number) => rgba(c.clone().offsetHSL(0, 0, -0.18), a),
        };
      })()
    : {
        top: "#d4532e",
        mid: "#d4532e",
        bottom: "#d4532e",
        light: (a: number) => `rgba(255,150,110,${a})`,
        dark: (a: number) => `rgba(170,55,35,${a})`,
      };
  const w = 1024;
  const h = 512;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, pal.top);
  grad.addColorStop(0.5, pal.mid);
  grad.addColorStop(1, pal.bottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  // strands
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 26000; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const len = 4 + rnd() * 9;
    const a = Math.PI / 2 + (rnd() - 0.5) * 0.9;
    const light = rnd() < 0.5;
    ctx.strokeStyle = light ? pal.light(0.05 + rnd() * 0.08) : pal.dark(0.05 + rnd() * 0.08);
    ctx.lineWidth = 0.8 + rnd() * 1.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Shell fur: the same sphere drawn 18 times, each a little larger, keeping
 * only the pixels that belong to a strand. Strands thin out toward their tips
 * and trail behind the ball when it moves, so it looks soft and fluffy.
 */
const FUR_SHELLS = 18;
const FUR_LENGTH = 0.085;

function furShellGeometry() {
  const base = new THREE.SphereGeometry(WORLD.ballRadius * 0.98, 72, 48);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = base.index;
  geo.setAttribute("position", base.getAttribute("position"));
  geo.setAttribute("normal", base.getAttribute("normal"));
  geo.setAttribute("uv", base.getAttribute("uv"));
  const shell = new Float32Array(FUR_SHELLS);
  for (let i = 0; i < FUR_SHELLS; i++) shell[i] = (i + 1) / FUR_SHELLS;
  geo.setAttribute("aShell", new THREE.InstancedBufferAttribute(shell, 1));
  geo.instanceCount = FUR_SHELLS;
  return geo;
}

function furShellMaterial(fur: THREE.Texture) {
  return new THREE.ShaderMaterial({
    fog: true,
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
      uFur: { value: fur },
      uVel: { value: new THREE.Vector3() },
      uLen: { value: FUR_LENGTH },
      uDensity: { value: 230 },
      uGlow: { value: 0 },
    },
    vertexShader: /* glsl */ `
      attribute float aShell;
      uniform vec3 uVel;
      uniform float uLen;
      varying vec2 vUv;
      varying float vS;
      varying vec3 vN;
      varying vec3 vV;
      #include <fog_pars_vertex>
      void main() {
        vUv = uv;
        vS = aShell;
        vec3 p = position + normal * aShell * uLen;
        vec4 wp = modelMatrix * vec4(p, 1.0);
        // fur trails a little behind the motion and sags slightly
        float k = aShell * aShell;
        wp.xyz += (-clamp(uVel, vec3(-14.0), vec3(14.0)) * 0.006 + vec3(0.0, -0.025, 0.0)) * k;
        vN = normalize(mat3(modelMatrix) * normal);
        vV = normalize(cameraPosition - wp.xyz);
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uFur;
      uniform float uDensity;
      uniform float uGlow;
      varying vec2 vUv;
      varying float vS;
      varying vec3 vN;
      varying vec3 vV;
      #include <fog_pars_fragment>
      float hash(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * .1031);
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
      }
      void main() {
        // thinner rows near the poles keep strands from bunching up
        float lat = sin(vUv.y * 3.14159);
        vec2 grid = vUv * vec2(max(40.0, uDensity * lat), uDensity * 0.5);
        vec2 cell = floor(grid);
        vec2 f = fract(grid) - 0.5;
        float h = hash(cell);
        float strandLen = 0.45 + 0.55 * h;
        if (vS > strandLen) discard;
        float taper = (1.0 - vS / strandLen);
        if (length(f) > 0.62 * taper + 0.04) discard;
        vec3 fur = texture2D(uFur, vUv).rgb;
        float ao = mix(0.6, 1.0, vS);
        float tip = vS * vS;
        vec3 col = mix(fur, fur * 1.35 + vec3(0.05, 0.03, 0.02), tip) * ao;
        float light = 0.74 + 0.26 * clamp(vN.y * 0.6 + 0.4, 0.0, 1.0);
        float rim = pow(1.0 - max(dot(vN, vV), 0.0), 2.0);
        col = col * light * 0.95 + fur * (0.22 + uGlow * 0.6) + mix(vec3(1.0, 0.55, 0.38), fur, 0.5) * rim * (0.35 + uGlow) * vS;
        gl_FragColor = vec4(col, 1.0);
        #include <fog_fragment>
      }
    `,
  });
}

/** A soft feathered wing, drawn in the XY plane with its root at the origin. */
function wingGeometry() {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(0.12, 0.16, 0.36, 0.3, 0.62, 0.3);
  s.bezierCurveTo(0.56, 0.22, 0.6, 0.17, 0.54, 0.12);
  s.bezierCurveTo(0.5, 0.06, 0.48, 0.03, 0.4, 0.0);
  s.bezierCurveTo(0.36, -0.06, 0.3, -0.1, 0.22, -0.1);
  s.bezierCurveTo(0.14, -0.08, 0.06, -0.06, 0, 0);
  return new THREE.ShapeGeometry(s, 20);
}

// ---------------------------------------------------------------- the ball

const UP = new THREE.Vector3(0, 1, 0);
const tmpV = new THREE.Vector3();
const tmpV2 = new THREE.Vector3();

export function Ball() {
  const body = useRef<RapierRigidBody>(null);
  const collider = useRef<RapierCollider>(null);
  const anchor = useRef<THREE.Group>(null);
  const squashGroup = useRef<THREE.Group>(null);
  const roller = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);
  const shadow = useRef<THREE.Mesh>(null);
  const wings = useRef<THREE.Group>(null);
  const wingL = useRef<THREE.Mesh>(null);
  const wingR = useRef<THREE.Mesh>(null);
  const wingGeo = useMemo(() => wingGeometry(), []);
  const keys = useKeys();
  const look = useLook();
  const { rapier, world } = useRapier();
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;

  const ballLook = useSyncExternalStore(lookStore.subscribe, lookStore.get, lookStore.get);
  useEffect(() => lookStore.load(), []);
  const fur = useMemo(() => furTexture(ballLook.tint), [ballLook.tint]);
  const furShells = useMemo(() => ({ geometry: furShellGeometry(), material: furShellMaterial(fur) }), [fur]);
  const shadowTex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(0,0,0,0.75)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }, []);

  const spawn = useMemo(
    () => new THREE.Vector3(WORLD.spawn.x, terrainHeight(WORLD.spawn.x, WORLD.spawn.z) + 1.5, WORLD.spawn.z),
    [],
  );

  const state = useRef({
    grounded: false,
    coyote: 0,
    jumpBuffer: 0,
    jumpHeld: false,
    jumpCut: false,
    ducking: false,
    radius: WORLD.ballRadius,
    charge: 0,
    stomping: false,
    prevVel: new THREE.Vector3(),
    // squash spring: s < 0 squashes, s > 0 stretches
    s: 0,
    sv: 0,
    landKick: 0,
    trail: [] as Array<{ p: THREE.Vector3; t: number }>,
    trailClock: 0,
    camDist: 4.6,
    time: 0,
    lastBounce: -1,
    size: 1,
    fall: 0,
    padCooldown: 0,
    swimming: false,
    flapAnim: 0,
    wingOut: 0,
    strokeClock: 0,
    placeClock: 0,
    tunnelBlend: 0,
    tunnelDir: 1,
    bubbleClock: 0,
    /** physics steps left in which a landing is soft (no trampoline) */
    softLand: 0,
    padFlight: null as null | { target: THREE.Vector3; steering: boolean; t: number },
    /** recent spots where Bob stood safely on the ground (oldest first) */
    safe: [] as THREE.Vector3[],
    safeClock: 0,
  });

  // ---- physics-rate control
  useBeforePhysicsStep(() => {
    const b = body.current;
    const c = collider.current;
    if (!b || !c) return;
    const st = state.current;
    const k = keys.current;
    const dt = world.timestep;
    if (control.teleport) {
      b.setTranslation(control.teleport.pos, true);
      const tv = control.teleport.vel ?? new THREE.Vector3();
      b.setLinvel({ x: tv.x, y: tv.y, z: tv.z }, true);
      b.setAngvel({ x: 0, y: 0, z: 0 }, true);
      control.teleport = null;
      st.padFlight = null;
    }
    if (control.hidden) {
      // Bob is inside the rocket: hold still
      b.setLinvel({ x: 0, y: Math.min(0, b.linvel().y), z: 0 }, true);
    }
    const pos = b.translation();
    const vel = b.linvel();
    st.prevVel.set(vel.x, vel.y, vel.z);
    // recent fall speed survives the step(s) in which the landing happens
    st.fall = Math.max(-vel.y, st.fall - dt * 45, 0);
    const look0 = lookStore.get();
    const bouncy = Date.now() < look0.bounceUntil;
    const wasSwimming = st.swimming;
    st.swimming = inDeepWater(pos.x, pos.y + 0.1, pos.z);
    if (st.swimming && !wasSwimming) {
      sound.splash(Math.max(2, -vel.y));
      guideStore.discover("deeplake");
    }
    if (!st.swimming && wasSwimming && vel.y > 2) sound.splash(3);

    // ground probe
    const ray = new rapier.Ray({ x: pos.x, y: pos.y, z: pos.z }, { x: 0, y: -1, z: 0 });
    const hit = world.castRayAndGetNormal(ray, st.radius + 0.14, true, undefined, undefined, undefined, b);
    const wasGrounded = st.grounded;
    st.grounded = !!hit;
    st.coyote = st.grounded ? 0.12 : Math.max(0, st.coyote - dt);
    if (!wasGrounded && st.grounded) {
      const impact = st.fall;
      st.sv -= Math.min(impact * 0.09, 1.1);
      st.stomping = false;
      // caps make their own sound; this is the soft thump on ground, logs, bridge
      if (!st.swimming && impact > 2.2 && findCap(tmpV2.set(pos.x, pos.y, pos.z), st.radius) < 0) sound.land(impact);
    }

    // ducking (C): a smaller, slower body that fits through hollow logs
    // in deep water, C dives instead
    const wantDuck = !!k.KeyC && !st.swimming;
    if (wantDuck && !st.ducking) {
      st.ducking = true;
      sound.duck();
      st.radius = WORLD.duckRadius;
      c.setRadius(st.radius);
      if (!st.grounded && vel.y < 4) st.stomping = true;
    } else if (!wantDuck && st.ducking) {
      const headRay = new rapier.Ray({ x: pos.x, y: pos.y, z: pos.z }, { x: 0, y: 1, z: 0 });
      const blocked = world.castRay(headRay, WORLD.ballRadius * 2 - WORLD.duckRadius + 0.05, true, undefined, undefined, undefined, b);
      if (!blocked) {
        st.ducking = false;
        st.radius = WORLD.ballRadius;
        c.setRadius(st.radius);
        if (st.grounded) b.setTranslation({ x: pos.x, y: pos.y + (WORLD.ballRadius - WORLD.duckRadius), z: pos.z }, true);
        st.charge = 0;
      }
    }
    if (st.stomping) b.applyImpulse({ x: 0, y: -60 * b.mass() * dt, z: 0 }, true);

    // movement relative to camera
    const yaw = look.current.yaw;
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    let ix = 0;
    let iz = 0;
    if (k.KeyW || k.ArrowUp) iz += 1;
    if (k.KeyS || k.ArrowDown) iz -= 1;
    if (k.KeyD || k.ArrowRight) ix += 1;
    if (k.KeyA || k.ArrowLeft) ix -= 1;
    // the on-screen stick (phones): analog, so a light push rolls slowly
    const stickOn = stick.mag > 0.12 && !storyStore.inputBlocked() && !guideStore.isOpen();
    if (stickOn) {
      ix += stick.x;
      iz += stick.y;
    }
    const dir = tmpV.set(fx * iz + -fz * ix, 0, fz * iz + fx * ix);
    // while a puffball is carrying you onto a cap, it does the steering
    const hasInput = dir.lengthSq() > 0 && !st.padFlight;
    if (hasInput) dir.normalize();
    const sprint = !!(k.ShiftLeft || k.ShiftRight);
    const flyingNow = Date.now() < look0.flyUntil && !st.swimming && !st.grounded;
    const analog = stickOn && !(k.KeyW || k.KeyA || k.KeyS || k.KeyD) ? THREE.MathUtils.clamp((stick.mag - 0.12) / 0.75, 0.3, 1) : 1;
    const maxSpeed = (st.swimming ? (sprint ? 9 : 6.5) : st.ducking ? 4.4 : sprint ? 13 : flyingNow ? 10 : 7.6) * analog;
    const accel = st.swimming ? 24 : st.grounded ? (sprint ? 40 : 32) : flyingNow ? 26 : 16;
    const m = b.mass();
    if (hasInput) {
      const along = vel.x * dir.x + vel.z * dir.z;
      if (along < maxSpeed) {
        b.applyImpulse({ x: dir.x * accel * m * dt, y: 0, z: dir.z * accel * m * dt }, true);
      }
      // roll the ball so it visibly tumbles in the direction of travel
      const torque = 0.9 * m * dt * (st.grounded ? 1 : 0.4);
      b.applyTorqueImpulse({ x: dir.z * torque, y: 0, z: -dir.x * torque }, true);
    }
    // gentle braking and turn assist on the ground
    b.setLinearDamping(st.padFlight ? 0 : st.grounded ? (hasInput ? 0.6 : 2.2) : 0.05);
    b.setAngularDamping(st.grounded && !hasInput ? 2.5 : 0.4);
    if (hasInput && st.grounded) {
      const speed = Math.hypot(vel.x, vel.z);
      if (speed > 0.5) {
        const along = (vel.x * dir.x + vel.z * dir.z) / speed;
        if (along < 0.2) b.applyImpulse({ x: -vel.x * 6 * m * dt, y: 0, z: -vel.z * 6 * m * dt }, true);
        // bleed off the part of the velocity that isn't where you're steering
        const sx = vel.x - dir.x * along * speed;
        const sz = vel.z - dir.z * along * speed;
        b.applyImpulse({ x: -sx * 3 * m * dt, y: 0, z: -sz * 3 * m * dt }, true);
      }
    }

    // jump (Space): buffered, with coyote time and variable height
    const jumpDown = !!k.Space;
    if (jumpDown && !st.jumpHeld) st.jumpBuffer = 0.14;
    st.jumpHeld = jumpDown;
    st.jumpBuffer = Math.max(0, st.jumpBuffer - dt);
    const flying = Date.now() < look0.flyUntil && !st.swimming;
    if (flying && st.jumpBuffer > 0 && !st.grounded && st.coyote <= 0) {
      // wing potion: every tap of Space is a flap
      b.setLinvel({ x: vel.x, y: Math.min(Math.max(vel.y, 0) + 7.2, 11), z: vel.z }, true);
      st.jumpBuffer = 0;
      st.flapAnim = 1;
      st.jumpCut = false;
      sound.flap();
    } else if (st.jumpBuffer > 0 && st.swimming && pos.y > DEEP_LEVEL - 0.6) {
      // hop out of the water from the surface
      b.setLinvel({ x: vel.x, y: 9.6, z: vel.z }, true);
      st.jumpBuffer = 0;
      st.sv += 0.9;
      sound.jump();
    } else if (st.jumpBuffer > 0 && !st.swimming && (st.grounded || st.coyote > 0)) {
      const power = 8.4 * (bouncy ? 1.3 : 1);
      sound.jump();
      b.setLinvel({ x: vel.x, y: power, z: vel.z }, true);
      st.jumpBuffer = 0;
      st.coyote = 0;
      st.grounded = false;
      st.jumpCut = true;
      st.sv += 0.9;
    }
    if (st.jumpCut && !jumpDown && vel.y > 3.5) {
      b.setLinvel({ x: vel.x, y: 3.5, z: vel.z }, true);
      st.jumpCut = false;
    }
    if (vel.y <= 0) st.jumpCut = false;
    if (!st.grounded && !st.padFlight && !st.swimming && !flying && vel.y < 0 && vel.y > -30) {
      b.applyImpulse({ x: 0, y: WORLD.gravity * 0.2 * m * dt, z: 0 }, true);
    }
    // with wings, holding Space while falling turns it into a gentle glide
    if (flying && !st.grounded && k.Space && vel.y < 0) {
      const v = b.linvel();
      b.applyImpulse({ x: 0, y: (-WORLD.gravity * 0.75 + Math.max(0, -2.4 - v.y) * 8) * m * dt, z: 0 }, true);
    }

    // swimming: nearly weightless, a little drag, Space rises and C dives
    if (st.swimming) {
      const v = b.linvel();
      let up = -WORLD.gravity * 0.95;
      if (k.Space && pos.y < DEEP_LEVEL - 0.6) up += 17;
      if (k.KeyC) up -= 16;
      // gently bob at the surface when idle
      if (!k.KeyC && pos.y > DEEP_LEVEL - 0.9) up += (DEEP_LEVEL - 0.25 - pos.y) * 30;
      b.applyImpulse({ x: -v.x * 1.2 * m * dt, y: (up - v.y * 2.0) * m * dt, z: -v.z * 1.2 * m * dt }, true);
      // inside the flooded tunnel: forward/back follow the tunnel (even up and
      // down its slopes), a gentle current carries you toward the cave, and
      // you're eased away from the walls
      const tn = tunnelNearest(pos.x, pos.y, pos.z);
      if (tn.dist < TUNNEL_RADIUS + 0.6 && tn.index > 6 && tn.index < TUNNEL_SAMPLES.length - 4) {
        const fwd = tn.tangent.clone().multiplyScalar(st.tunnelDir);
        const alongNow = (vel.x * fwd.x + vel.y * fwd.y + vel.z * fwd.z) * iz;
        if (iz !== 0 && alongNow < (sprint ? 8 : 6)) {
          b.applyImpulse({ x: fwd.x * iz * 20 * m * dt, y: fwd.y * iz * 20 * m * dt, z: fwd.z * iz * 20 * m * dt }, true);
        }
        b.applyImpulse({ x: tn.tangent.x * 3 * m * dt, y: tn.tangent.y * 3 * m * dt, z: tn.tangent.z * 3 * m * dt }, true);
        const off = new THREE.Vector3(pos.x - tn.point.x, pos.y - tn.point.y, pos.z - tn.point.z);
        const o = off.length();
        if (o > 0.6) off.multiplyScalar(-((o - 0.6) * 9) / o);
        else off.set(0, 0, 0);
        b.applyImpulse({ x: off.x * m * dt, y: off.y * m * dt, z: off.z * m * dt }, true);
      }
      st.stomping = false;
      st.strokeClock -= dt;
      const stroking = hasInput || k.Space || k.KeyC;
      if (stroking && st.strokeClock <= 0) {
        st.strokeClock = sprint ? 0.38 : 0.5;
        sound.swimStroke(pos.y > DEEP_LEVEL - 0.7);
      }
      st.bubbleClock -= dt;
      if (st.bubbleClock <= 0 && pos.y < DEEP_LEVEL - 0.8) {
        st.bubbleClock = 0.35 + Math.random() * 0.9;
        sound.bubble();
      }
    }

    // parking brake: with no keys held, a soft ball settles instead of
    // creeping down gentle slopes (like the tops of caps)
    if (st.grounded && !hasInput && !st.padFlight && !st.swimming && hit && hit.normal.y > 0.85) {
      const speed = Math.hypot(vel.x, vel.z);
      if (speed < 1.6 && st.jumpBuffer <= 0) {
        // cancel the downhill part of gravity, then bleed off what's left
        const n = hit.normal;
        const g = -WORLD.gravity;
        const k = g * m * dt;
        b.applyImpulse({ x: -k * n.y * n.x, y: -k * (n.y * n.y - 1), z: -k * n.y * n.z }, true);
        const v2 = b.linvel();
        const settle = speed < 0.35 ? 0 : 0.8;
        b.setLinvel({ x: v2.x * settle, y: v2.y, z: v2.z * settle }, true);
        const w2 = b.angvel();
        b.setAngvel({ x: w2.x * 0.8, y: w2.y * 0.8, z: w2.z * 0.8 }, true);
      }
    }

    // spring puffballs: roll onto one to be launched onto its mushroom
    st.padCooldown = Math.max(0, st.padCooldown - dt);
    if (st.softLand > 0) st.softLand--;
    if (!st.ducking && st.padCooldown <= 0) {
      for (let i = 0; i < pads.length; i++) {
        const p = pads[i];
        const dx = pos.x - p.x;
        const dz = pos.z - p.z;
        if (dx * dx + dz * dz > (p.r + 0.05) * (p.r + 0.05)) continue;
        const bottom = pos.y - st.radius;
        if (bottom > p.top + 0.15 || bottom < p.top - 0.2) continue;
        const g = -WORLD.gravity;
        const rise = p.target.y + p.apex - pos.y;
        const vy = Math.sqrt(2 * g * Math.max(rise, 1));
        b.setLinvel({ x: vel.x * 0.15, y: vy, z: vel.z * 0.15 }, true);
        st.padFlight = { target: p.target, steering: false, t: 0 };
        st.padCooldown = 0.8;
        st.jumpCut = false;
        st.stomping = false;
        st.grounded = false;
        st.sv += 1.2;
        jigglePad(i);
        sound.launch();
        guideStore.discover("puffball");
        break;
      }
    }
    if (st.padFlight) {
      const pf = st.padFlight;
      pf.t += dt;
      const T = pf.target;
      const v = b.linvel();
      if (!pf.steering && pos.y > T.y + 0.4) {
        // glide in so we come down right on the middle of the cap
        const g = -WORLD.gravity;
        const h = pos.y - (T.y + st.radius);
        const tLand = (v.y + Math.sqrt(v.y * v.y + 2 * g * h)) / g;
        b.setLinvel({ x: (T.x - pos.x) / tLand, y: v.y, z: (T.z - pos.z) / tLand }, true);
        pf.steering = true;
      }
      if (pf.steering && v.y < 0 && st.grounded) {
        // arriving on the cap: drop the sideways glide so we stay on top,
        // and make this one landing soft instead of a trampoline bounce
        b.setLinvel({ x: v.x * 0.1, y: v.y, z: v.z * 0.1 }, true);
        st.padFlight = null;
        st.softLand = 20;
        sound.squish();
      } else if (pf.t > 8 || (!pf.steering && v.y < -1) || (st.grounded && pf.t > 0.3)) {
        st.padFlight = null;
      }
    }

    // floaty, glowing lake water
    const lakeD = Math.hypot(pos.x - LAKE.x, pos.z - LAKE.z);
    if (lakeD < LAKE.r * 1.4 && pos.y < LAKE_LEVEL + 0.1) {
      const depth = LAKE_LEVEL + 0.1 - pos.y;
      b.applyImpulse({ x: -vel.x * 1.5 * m * dt, y: (Math.min(depth, 0.6) * 70 - vel.y * 2.5) * m * dt, z: -vel.z * 1.5 * m * dt }, true);
    }

    // the cave walls push you back gently
    const r = Math.hypot(pos.x, pos.z);
    if (r > 186) {
      const push = (r - 186) * 6;
      b.applyImpulse({ x: (-pos.x / r) * push * m * dt, y: 0, z: (-pos.z / r) * push * m * dt }, true);
    }

    // remember where Bob last stood safely, a few times a second
    const ground = terrainHeight(pos.x, pos.z);
    st.safeClock += dt;
    if (st.grounded && st.safeClock > 0.6 && pos.y > ground - 1 && tunnelDistance(pos.x, pos.y, pos.z) > TUNNEL_APRON + 1) {
      st.safeClock = 0;
      st.safe.push(new THREE.Vector3(pos.x, pos.y, pos.z));
      if (st.safe.length > 4) st.safe.shift();
    }

    // H takes Bob home; if he ever slips under the world, put him back where he last stood
    const underground = pos.y < ground - 6 && tunnelDistance(pos.x, pos.y, pos.z) > 7;
    if (k.KeyH || underground || pos.y < -80) {
      const back = !k.KeyH && st.safe.length ? st.safe[0].clone().add(new THREE.Vector3(0, 0.6, 0)) : spawn;
      if (!k.KeyH) st.safe = st.safe.slice(0, 1);
      b.setTranslation(back, true);
      b.setLinvel({ x: 0, y: 0, z: 0 }, true);
      b.setAngvel({ x: 0, y: 0, z: 0 }, true);
      k.KeyH = false;
    }
  });

  // ---- bouncy mushroom caps
  const onCollisionEnter = () => {
    const b = body.current;
    if (!b) return;
    const st = state.current;
    const p = b.translation();
    const here = tmpV2.set(p.x, p.y, p.z);
    const idx = findCap(here, st.radius);
    if (st.padFlight?.steering) {
      // touching down from a puffball launch: drop the sideways glide
      const v0 = b.linvel();
      b.setLinvel({ x: v0.x * 0.1, y: v0.y, z: v0.z * 0.1 }, true);
      st.padFlight = null;
      st.softLand = 20;
    }
    if (idx < 0) return;
    if (st.softLand > 0) {
      jiggleCap(idx, 0.1);
      return;
    }
    if (st.swimming) return;
    const impact = st.fall;
    // small bumps while rolling across a cap shouldn't launch you
    if (impact < 3.2) {
      if (impact > 1.5) sound.squish();
      return;
    }
    const cap = caps[idx];
    if (st.ducking && !st.stomping) {
      // holding duck while landing soaks up the bounce
      jiggleCap(idx, 0.08);
      sound.squish();
      return;
    }
    // a steady bounce height (not growing with the fall), so it's easy to judge
    let vy = cap.m.bounce;
    if (st.stomping) vy *= 1.3;
    if (keys.current.Space) vy *= 1.15;
    if (Date.now() < lookStore.get().bounceUntil) vy *= 1.25;
    vy = Math.min(vy, 30);
    sound.boing(impact, cap.m.capR);
    const v = b.linvel();
    // mostly straight up, so you can steer onto the next cap instead of sailing past it
    b.setLinvel({ x: v.x * 0.5, y: vy, z: v.z * 0.5 }, true);
    st.stomping = false;
    st.jumpCut = false;
    st.sv -= 0.6;
    st.lastBounce = st.time;
    st.fall = 0;
    jiggleCap(idx, 0.06 + Math.min(impact, 20) * 0.012);
  };

  // ---- visuals, trail and camera (after physics)
  useFrame((_, delta) => {
    const b = body.current;
    const a = anchor.current;
    if (!b || !a) return;
    const dt = Math.min(delta, 0.05);
    const st = state.current;
    st.time += dt;
    shared.uTime.value += dt;

    const center = a.getWorldPosition(tmpV);
    const vel = b.linvel();
    player.position.copy(center);
    (furShells.material.uniforms.uVel.value as THREE.Vector3).set(vel.x, vel.y, vel.z);
    const lk = lookStore.get();
    const glowing = Date.now() < lk.glowUntil;
    const fluffLen = FLUFF_LENGTH[lk.fluff] ?? FLUFF_LENGTH[0];
    const fu = furShells.material.uniforms;
    fu.uLen.value = THREE.MathUtils.damp(fu.uLen.value, fluffLen, 5, dt);
    fu.uDensity.value = THREE.MathUtils.damp(fu.uDensity.value, 230 - lk.fluff * 28, 5, dt);
    fu.uGlow.value = THREE.MathUtils.damp(fu.uGlow.value, glowing ? 1 : 0, 3, dt);
    const fluffLift = (fu.uLen.value - FLUFF_LENGTH[0]) * 0.6;

    // wings while the flying potion lasts: they face away from the camera and flap
    const hasWings = Date.now() < lk.flyUntil;
    st.wingOut = THREE.MathUtils.damp(st.wingOut, hasWings ? 1 : 0, 6, dt);
    st.flapAnim = Math.max(0, st.flapAnim - dt * 2.6);
    if (wings.current && wingL.current && wingR.current) {
      wings.current.visible = st.wingOut > 0.02;
      wings.current.position.set(center.x, center.y + 0.08, center.z);
      wings.current.rotation.set(0, look.current.yaw, 0);
      wings.current.scale.setScalar(st.wingOut * (1 + fu.uLen.value));
      const idle = st.grounded ? 0.15 : 0.35;
      const beat = Math.sin(st.time * (st.grounded ? 3 : 7)) * idle + Math.sin(st.flapAnim * Math.PI) * 0.9;
      const glide = !st.grounded && keys.current.Space ? -0.15 : 0;
      wingL.current.rotation.set(0.25, 0, 0.25 + beat + glide);
      wingR.current.rotation.set(0.25, 0, -(0.25 + beat + glide));
    }

    // field guide: places count as discovered once you're there
    st.placeClock -= dt;
    if (st.placeClock <= 0) {
      st.placeClock = 0.4;
      const c = center;
      if (Math.hypot(c.x, c.z) < 34) guideStore.discover("greatcap");
      if (Math.hypot(c.x - CAVE.x, c.z - CAVE.z) < CAVE.r - 2 && c.y < CAVE_FLOOR + 6) guideStore.discover("cave");
      if (Math.hypot(c.x - FALLS.x, c.z - FALLS.z) < 18) guideStore.discover("falls");
      if (Math.abs(c.x - BRIDGE.x) < 2 && c.z > BRIDGE.z0 && c.z < BRIDGE.z1 && c.y > bridgeDeckY(c.z) - 0.6) guideStore.discover("bridge");
      if (Math.hypot(c.x - CRYSTALS.x, c.z - CRYSTALS.z) < 16) guideStore.discover("crystals");
      if (tunnelDistance(c.x, c.y, c.z) < 3) guideStore.discover("tunnel");
      if (HOLLOW_LOGS.some((l) => Math.hypot(c.x - l.x, c.z - l.z) < 4)) guideStore.discover("logs");
    }
    player.velocity.set(vel.x, vel.y, vel.z);
    player.ducking = st.ducking;
    player.grounded = st.grounded;
    bobState.grounded = st.grounded;
    bobState.swimming = st.swimming;
    bobState.flying = Date.now() < lookStore.get().flyUntil;
    bobState.nearLog = HOLLOW_LOGS.some((l) => Math.hypot(center.x - l.x, center.z - l.z) < l.length * 0.5 + 3);

    // squash & stretch spring
    let target = 0;
    st.size = THREE.MathUtils.damp(st.size, st.ducking ? 0.6 : 1, 14, dt);
    if (st.ducking) target = -0.14;
    else if (!st.grounded) target = THREE.MathUtils.clamp(Math.abs(vel.y) * 0.018, 0, 0.22);
    const stiffness = 180;
    const damping = 11;
    st.sv += ((target - st.s) * stiffness - st.sv * damping) * dt;
    st.s += st.sv * dt;
    st.s = THREE.MathUtils.clamp(st.s, -0.6, 0.5);
    const sy = 1 + st.s;
    const sxz = 1 / Math.sqrt(Math.max(sy, 0.2));
    const visR = WORLD.ballRadius * 1.04;
    const g = squashGroup.current!;
    g.scale.set(sxz * st.size, sy * st.size, sxz * st.size);
    // keep the bottom of the ball on the ground while squashed
    const bottomOffset = (st.grounded ? -st.radius + visR * sy * st.size : 0) + fluffLift;
    g.position.set(center.x, center.y + bottomOffset, center.z);
    if (roller.current) roller.current.quaternion.copy(a.getWorldQuaternion(new THREE.Quaternion()));

    if (light.current) {
      // the light sits inside the ball, so it lights the world around it
      // without putting a harsh highlight on the fur
      light.current.position.set(center.x, center.y + 0.05, center.z);
      light.current.intensity = THREE.MathUtils.damp(light.current.intensity, (glowing ? 26 : 12) + Math.sin(st.time * 0.5) * 0.8, 3, dt);
      light.current.distance = glowing ? 20 : 11;
      shared.uLightRange.value[0] = glowing ? 16 : 9.5;
    }
    shared.uLightPos.value[0].set(center.x, center.y + 0.05, center.z);

    // blob shadow
    if (shadow.current) {
      const ground = terrainHeight(center.x, center.z);
      const ray = new rapier.Ray({ x: center.x, y: center.y, z: center.z }, { x: 0, y: -1, z: 0 });
      const hit = world.castRay(ray, 40, true, undefined, undefined, undefined, b);
      const gy = hit ? center.y - hit.timeOfImpact : ground;
      const hgt = center.y - gy;
      shadow.current.position.set(center.x, gy + 0.03, center.z);
      const sc = (st.radius * 2.6) * (1 + hgt * 0.08);
      shadow.current.scale.set(sc, sc, 1);
      (shadow.current.material as THREE.MeshBasicMaterial).opacity = THREE.MathUtils.clamp(1 - hgt * 0.12, 0, 1) * 0.85;
    }

    // foliage trail: where the ball is now and where it just was
    st.trailClock += dt;
    if (st.trailClock > 0.08) {
      st.trailClock = 0;
      st.trail.unshift({ p: center.clone(), t: st.time });
      if (st.trail.length > TRAIL - 1) st.trail.length = TRAIL - 1;
    }
    const tr = shared.uTrail.value;
    tr[0].set(center.x, center.y - st.radius + 0.35, center.z, 1);
    for (let i = 1; i < TRAIL; i++) {
      const s = st.trail[i - 1];
      if (!s) {
        tr[i].set(0, -9999, 0, 0);
        continue;
      }
      const age = st.time - s.t;
      // reaches exactly zero before the sample drops off, so plants ease back without a jolt
      tr[i].set(s.p.x, s.p.y - st.radius + 0.35, s.p.z, Math.pow(Math.max(0, 1 - age / 0.55), 1.6));
    }
    shared.uCenter.value.set(center.x, center.z);

    if (squashGroup.current) squashGroup.current.visible = !control.hidden;
    if (shadow.current) shadow.current.visible = !control.hidden;
    if (control.hidden && wings.current) wings.current.visible = false;

    // a story cutscene can take over the camera
    if (control.camera) {
      camera.position.lerp(control.camera.pos, 1 - Math.exp(-(control.camera.speed ?? 3) * dt));
      camera.lookAt(control.camera.target);
      sound.update({ speed: 0, grounded: true, brush: 0, underwater: environment.underwater, swimming: false, flying: false, fallsDistance: Math.hypot(center.x - FALLS.x, center.z - FALLS.z) });
      return;
    }

    // camera: low and close, so the world feels enormous
    const l = look.current;
    const k = keys.current;
    if (k.KeyQ) l.yaw += 2.2 * dt;
    if (k.KeyE) l.yaw -= 2.2 * dt;
    const now = performance.now() / 1000;
    const hSpeed = Math.hypot(vel.x, vel.z);
    if (now - l.lastManual > 1.8 && hSpeed > 2.5 && !st.padFlight && !k.KeyS && !k.ArrowDown) {
      // yaw that would put the camera straight behind the direction of travel
      const behind = Math.atan2(-vel.x, -vel.z);
      let diff = behind - l.yaw;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      l.yaw += diff * Math.min(1, dt * 0.9 * Math.min(hSpeed / 7, 1.5));
    }
    // aim right at the middle of the fluffy ball, so Bob sits in the centre of the screen
    const vis = squashGroup.current ? squashGroup.current.position : center;
    const targetPos = tmpV2.set(vis.x, vis.y, vis.z);
    // in the narrow tunnel the camera rides the tunnel's centre line behind Bob,
    // so it can never end up outside the walls
    const tnear = tunnelNearest(center.x, center.y, center.z);
    const inTunnel = tnear.dist < TUNNEL_RADIUS + 1 && tnear.index > 4 && tnear.index < TUNNEL_SAMPLES.length - 3;
    if (inTunnel) {
      const along = vel.x * tnear.tangent.x + vel.y * tnear.tangent.y + vel.z * tnear.tangent.z;
      if (Math.abs(along) > 0.8) st.tunnelDir = along >= 0 ? 1 : -1;
      // keep the yaw pointing along the tunnel, so W means "onward"
      const fx = tnear.tangent.x * st.tunnelDir;
      const fz = tnear.tangent.z * st.tunnelDir;
      if (Math.hypot(fx, fz) > 0.2) {
        const want = Math.atan2(-fx, -fz);
        let d = want - l.yaw;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        l.yaw += d * Math.min(1, dt * 4);
      }
    }
    st.tunnelBlend = THREE.MathUtils.damp(st.tunnelBlend, inTunnel ? 1 : 0, 3, dt);
    const pitch = THREE.MathUtils.lerp(l.pitch, Math.min(l.pitch, 0.08), st.tunnelBlend);
    const wantDist = THREE.MathUtils.lerp(l.dist, Math.min(l.dist, 2.6), st.tunnelBlend);
    const offset = new THREE.Vector3(
      Math.sin(l.yaw) * Math.cos(pitch),
      Math.sin(pitch),
      Math.cos(l.yaw) * Math.cos(pitch),
    );
    const camRay = new rapier.Ray(
      { x: targetPos.x, y: targetPos.y, z: targetPos.z },
      { x: offset.x, y: offset.y, z: offset.z },
    );
    const camHit = world.castRay(camRay, wantDist, true, undefined, undefined, undefined, b);
    const allowed = camHit ? Math.max(0.7, camHit.timeOfImpact - 0.35) : wantDist;
    st.camDist = allowed < st.camDist ? allowed : THREE.MathUtils.damp(st.camDist, allowed, 3, dt);
    const desired = targetPos.clone().addScaledVector(offset, st.camDist);
    if (st.tunnelBlend > 0.01) {
      const back = Math.round(2.6 / TUNNEL_STEP);
      const ci = THREE.MathUtils.clamp(tnear.index - back * st.tunnelDir, 0, TUNNEL_SAMPLES.length - 1);
      const railCam = TUNNEL_SAMPLES[ci].clone().add(new THREE.Vector3(0, 0.45, 0));
      desired.lerp(railCam, st.tunnelBlend);
    }
    // in the tunnel the ground is overhead, so don't push the camera up to it
    let lifted = 0;
    if (tunnelDistance(center.x, center.y, center.z) > 6) {
      const floor = terrainHeight(desired.x, desired.z) + 0.3;
      if (desired.y < floor) {
        lifted = floor - desired.y;
        desired.y = floor;
      }
    }

    // sound: rolling, brushing through plants, the waterfall, underwater
    const hs = Math.hypot(vel.x, vel.z);
    const fol = sampleFoliage(center.x, center.z);
    const low = center.y - terrainHeight(center.x, center.z) < 1.2 ? 1 : 0;
    const brush = (fol.leaves * 1.1 + fol.grass * 0.3 + fol.flowers * 0.35) * Math.min(hs / 5, 1.3) * low;
    sound.update({
      speed: Math.hypot(vel.x, vel.y, vel.z),
      grounded: st.grounded,
      brush,
      underwater: environment.underwater,
      swimming: st.swimming,
      flying: Date.now() < lk.flyUntil,
      fallsDistance: Math.hypot(center.x - FALLS.x, center.z - FALLS.z),
    });
    camera.position.lerp(desired, 1 - Math.exp(-(st.tunnelBlend > 0.5 ? 22 : 14) * dt));
    // when looking up, the ground stops the camera going lower; keep the view
    // tilting up anyway by aiming along the look direction instead of at Bob
    const tilt = THREE.MathUtils.smoothstep(lifted, 0, 1.2);
    const lookAt = targetPos.clone().lerp(camera.position.clone().addScaledVector(offset, -6), tilt);
    camera.lookAt(lookAt);
    const speed = Math.hypot(vel.x, vel.z);
    const fov = 62 + THREE.MathUtils.clamp((speed - 7) * 1.1, 0, 9);
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = THREE.MathUtils.damp(camera.fov, fov, 4, dt);
      camera.updateProjectionMatrix();
    }
  });

  return (
    <>
      <RigidBody
        ref={body}
        position={spawn.toArray()}
        colliders={false}
        ccd
        canSleep={false}
        angularDamping={0.4}
        linearDamping={0.05}
        onCollisionEnter={onCollisionEnter}
      >
        <BallCollider ref={collider} args={[WORLD.ballRadius]} friction={1.6} restitution={0.15} density={1.2} />
        <group ref={anchor} />
      </RigidBody>
      <group ref={squashGroup}>
        <mesh ref={roller}>
          <sphereGeometry args={[WORLD.ballRadius * 0.98, 64, 48]} />
          <meshPhysicalMaterial
            map={fur}
            roughness={0.95}
            sheen={1}
            sheenRoughness={0.5}
            sheenColor="#ffb08a"
            emissive="#ff4a24"
            emissiveIntensity={0.18}
            emissiveMap={fur}
          />
          <mesh geometry={furShells.geometry} material={furShells.material} frustumCulled={false} />
        </mesh>
      </group>
      <group ref={wings} visible={false}>
        {[-1, 1].map((side) => (
          <group key={side} position={[side * 0.24, 0, -0.05]} scale={[side, 1, 1]}>
            <mesh ref={side < 0 ? wingL : wingR} geometry={wingGeo}>
              <meshBasicMaterial color={new THREE.Color(1.05, 1.0, 1.12)} side={THREE.DoubleSide} transparent opacity={0.92} />
            </mesh>
          </group>
        ))}
      </group>
      <pointLight ref={light} color="#ff7a4a" intensity={12} distance={11} decay={1.4} />
      <mesh ref={shadow} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={shadowTex} transparent depthWrite={false} opacity={0.8} />
      </mesh>
    </>
  );
}
