"use client";
import { useFrame, useThree } from "@react-three/fiber";
import { CylinderCollider, RigidBody } from "@react-three/rapier";
import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import * as THREE from "three";
import { DEEP_LEVEL, TUNNEL_RADIUS, inDeepWater, terrainHeight, tunnelDistance } from "./world-data";
import { GLSL_BILLBOARD, billboardGeometry, control, player, shared } from "./shared";
import { makeRockMaterial } from "./terrain";
import { sound } from "./audio";
import { orbStore } from "./orb-store";
import { lineFor, storyStore } from "./story-store";
import { ENERGY_NEEDED, NPCS, PARTS, ROCKET, type Npc, type PartId } from "./story-data";

const GROUND = () => terrainHeight(ROCKET.x, ROCKET.z);
export const HOLE_Y = 131;

// ---------------------------------------------------------------- the Sky Eye (the hole Bob fell through)

export function SkyEye() {
  const built = useMemo(() => {
    const ground = GROUND();
    const height = HOLE_Y - ground;
    const beamGeo = new THREE.CylinderGeometry(6.5, 9.5, height, 48, 1, true);
    beamGeo.translate(0, height / 2, 0);
    const beamMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: { uTime: shared.uTime },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vN;
        varying vec3 vV;
        void main() {
          vUv = uv;
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vN = normalize(mat3(modelMatrix) * normal);
          vV = normalize(cameraPosition - wp.xyz);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        varying vec2 vUv;
        varying vec3 vN;
        varying vec3 vV;
        void main() {
          // soft at the silhouette edges, brightest looking through the middle
          float face = pow(clamp(abs(dot(vN, vV)), 0.0, 1.0), 1.6);
          float shimmer = 0.85 + 0.15 * sin(vUv.x * 40.0 + uTime * 0.25) * sin(vUv.y * 9.0 - uTime * 0.15);
          // clamp: pow() of a tiny negative (from interpolation) is NaN, and bloom
          // would smear a single NaN pixel over the whole screen
          float a = face * (0.035 + 0.085 * pow(clamp(vUv.y, 0.0, 1.0), 0.7)) * shimmer;
          gl_FragColor = vec4(vec3(1.0, 0.95, 0.82) * a, a);
        }
      `,
    });
    const holeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 1.7, 1.45), fog: false });
    const haloMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
      `,
      fragmentShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          float d = length(vUv - 0.5) * 2.0;
          float a = pow(1.0 - smoothstep(0.0, 1.0, d), 2.0) * 0.55;
          gl_FragColor = vec4(vec3(1.0, 0.92, 0.75) * a, a);
        }
      `,
    });

    // slow dust motes drifting down the beam
    const n = 90;
    const pos = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * 6.5;
      pos.set([Math.cos(a) * r, Math.random(), Math.sin(a) * r], i * 3);
      seed[i] = Math.random();
    }
    const dustGeo = billboardGeometry(n, { aPos: { data: pos, size: 3 }, aSeed: { data: seed, size: 1 } });
    const dustMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: shared.uTime, uProj: shared.uProj, uBase: { value: new THREE.Vector3(ROCKET.x, ground, ROCKET.z) }, uH: { value: 34 } },
      vertexShader: /* glsl */ `
        uniform float uTime;
        uniform vec3 uBase;
        uniform float uH;
        attribute vec3 aPos;
        attribute float aSeed;
        varying float vA;
        ${GLSL_BILLBOARD}
        void main() {
          float h = fract(aPos.y - uTime * (0.006 + aSeed * 0.01));
          vec3 wp = uBase + vec3(aPos.x + sin(uTime * 0.2 + aSeed * 20.0) * 0.4, h * uH, aPos.z);
          float tiny = billboard(wp, 0.03 + aSeed * 0.03, 3.0);
          vA = sin(h * 3.14159) * tiny * 0.6;
        }
      `,
      fragmentShader: /* glsl */ `
        varying float vA;
        varying vec2 vUv;
        void main() {
          float a = smoothstep(0.5, 0.0, length(vUv - 0.5)) * vA;
          gl_FragColor = vec4(vec3(1.0, 0.95, 0.8) * a, a);
        }
      `,
    });
    return { beamGeo, beamMat, holeMat, haloMat, dustGeo, dustMat, ground };
  }, []);

  return (
    <group>
      <mesh geometry={built.beamGeo} material={built.beamMat} position={[ROCKET.x, built.ground, ROCKET.z]} renderOrder={6} frustumCulled={false} />
      <mesh material={built.holeMat} position={[ROCKET.x, HOLE_Y, ROCKET.z]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[7, 48]} />
      </mesh>
      <mesh material={built.haloMat} position={[ROCKET.x, HOLE_Y - 0.5, ROCKET.z]} rotation={[Math.PI / 2, 0, 0]} renderOrder={6}>
        <planeGeometry args={[40, 40]} />
      </mesh>
      <mesh geometry={built.dustGeo} material={built.dustMat} frustumCulled={false} renderOrder={6} />
    </group>
  );
}

// ---------------------------------------------------------------- rocket

const PART_ORDER: PartId[] = ["hull", "nozzle", "fins", "spring", "wire", "lens", "cone"];

function helix(radius: number, height: number, turns: number, tube: number) {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= turns * 24; i++) {
    const t = i / (turns * 24);
    const a = t * turns * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * radius, t * height, Math.sin(a) * radius));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), turns * 40, tube, 6, false);
}

function rocketParts() {
  const white = new THREE.MeshStandardMaterial({ color: "#efe8dc", roughness: 0.45, metalness: 0.25 });
  const red = new THREE.MeshStandardMaterial({ color: "#d4532e", roughness: 0.5, metalness: 0.2 });
  const dark = new THREE.MeshStandardMaterial({ color: "#3a3f4c", roughness: 0.35, metalness: 0.7 });
  const brass = new THREE.MeshStandardMaterial({ color: "#c9a663", roughness: 0.3, metalness: 0.85 });
  const glass = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.55, 1.15, 1.35) });
  const copper = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.15, 0.6, 0.28) });
  const springMat = new THREE.MeshStandardMaterial({ color: "#b8c2cf", roughness: 0.25, metalness: 0.9 });

  const finShape = new THREE.Shape();
  finShape.moveTo(0, 0);
  finShape.lineTo(1.1, -0.5);
  finShape.lineTo(1.1, 0.4);
  finShape.lineTo(0, 1.6);
  finShape.lineTo(0, 0);
  const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.1, bevelEnabled: false });
  finGeo.translate(0.95, 0.9, -0.05);

  const hullGeo = new THREE.LatheGeometry(
    [
      [0.0001, 0.7],
      [0.92, 0.7],
      [1.02, 1.0],
      [1.06, 2.6],
      [1.0, 4.4],
      [0.96, 4.7],
      [0.0001, 4.7],
    ].map(([x, y]) => new THREE.Vector2(x, y)),
    40,
  );
  const coneGeo = new THREE.LatheGeometry(
    [
      [0.0001, 4.68],
      [0.97, 4.68],
      [0.9, 5.2],
      [0.6, 5.9],
      [0.22, 6.35],
      [0.0001, 6.45],
    ].map(([x, y]) => new THREE.Vector2(x, y)),
    40,
  );
  const nozzleGeo = new THREE.LatheGeometry(
    [
      [0.35, 0.72],
      [0.45, 0.55],
      [0.72, 0.15],
      [0.78, 0.05],
      [0.0001, 0.05],
    ].map(([x, y]) => new THREE.Vector2(x, y)),
    32,
  );

  const parts: Record<PartId, THREE.Object3D> = {
    hull: new THREE.Group(),
    cone: new THREE.Mesh(coneGeo, red),
    nozzle: new THREE.Mesh(nozzleGeo, dark),
    fins: new THREE.Group(),
    spring: new THREE.Group(),
    wire: new THREE.Mesh(helix(1.09, 3.4, 5, 0.035), copper),
    lens: new THREE.Group(),
  };
  const hull = parts.hull as THREE.Group;
  hull.add(new THREE.Mesh(hullGeo, white));
  for (const y of [1.3, 4.1]) {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(1.075, 1.075, 0.22, 40, 1, true), red);
    band.position.y = y;
    hull.add(band);
  }
  for (let i = 0; i < 3; i++) {
    const fin = new THREE.Mesh(finGeo, red);
    fin.rotation.y = (i / 3) * Math.PI * 2 + Math.PI / 6;
    (parts.fins as THREE.Group).add(fin);
  }
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
    const leg = new THREE.Mesh(helix(0.18, 0.75, 6, 0.04), springMat);
    leg.position.set(Math.cos(a) * 1.2, 0, Math.sin(a) * 1.2);
    (parts.spring as THREE.Group).add(leg);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.08, 16), dark);
    foot.position.set(Math.cos(a) * 1.2, 0.04, Math.sin(a) * 1.2);
    (parts.spring as THREE.Group).add(foot);
  }
  (parts.wire as THREE.Mesh).position.y = 1.0;
  const lens = parts.lens as THREE.Group;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.07, 12, 32), brass);
  const pane = new THREE.Mesh(new THREE.CircleGeometry(0.42, 32), glass);
  lens.add(rim, pane);
  // the window faces the start, where you first see the rocket
  lens.position.set(0, 3.2, 1.05);
  return parts;
}

function ghostOf(obj: THREE.Object3D) {
  const ghost = obj.clone(true);
  const mat = new THREE.MeshBasicMaterial({ color: "#7fe8ff", wireframe: true, transparent: true, opacity: 0.16, depthWrite: false });
  ghost.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).material = mat;
  });
  return ghost;
}

export function Rocket() {
  const s = useSyncExternalStore(storyStore.subscribe, storyStore.get, storyStore.get);
  const orbs = useSyncExternalStore(orbStore.subscribe, orbStore.get, orbStore.get);
  const camera = useThree((st) => st.camera);
  const built = useMemo(() => {
    const parts = rocketParts();
    const ghosts = Object.fromEntries(PART_ORDER.map((id) => [id, ghostOf(parts[id])])) as Record<PartId, THREE.Object3D>;
    const padMat = makeRockMaterial();
    const padGeo = new THREE.CylinderGeometry(3.2, 3.5, 0.5, 40);
    const pg = padGeo.attributes.position;
    padGeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(pg.count * 3).fill(0.16), 3));
    padGeo.setAttribute("aMoss", new THREE.BufferAttribute(new Float32Array(pg.count).fill(0.5), 1));
    // energy lights around the pad: one per orb needed
    const lights = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 12, 8), new THREE.MeshBasicMaterial({ color: "#ffffff" }), ENERGY_NEEDED);
    for (let i = 0; i < ENERGY_NEEDED; i++) {
      const a = (i / ENERGY_NEEDED) * Math.PI * 2;
      lights.setMatrixAt(i, new THREE.Matrix4().makeTranslation(Math.cos(a) * 3.0, 0.3, Math.sin(a) * 3.0));
      lights.setColorAt(i, new THREE.Color(0.25, 0.2, 0.1));
    }
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.62, 2.6, 24, 1, true).rotateX(Math.PI).translate(0, -1.2, 0),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.1, 0.35), transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
    );
    flame.visible = false;
    return { parts, ghosts, padMat, padGeo, lights, flame };
  }, []);

  const rocket = useRef<THREE.Group>(null);
  const fireLight = useRef<THREE.PointLight>(null);
  const anim = useRef({ launchT: -1, pop: {} as Record<string, number> });
  const ground = useMemo(() => GROUND(), []);

  // which parts are on the rocket
  const done = new Set(s.delivered);
  const complete = PART_ORDER.every((id) => done.has(id));
  const showAll = s.phase === "free" || s.phase === "ended";

  useEffect(() => {
    PART_ORDER.forEach((id) => {
      const on = done.has(id) || showAll;
      built.parts[id].visible = on;
      built.ghosts[id].visible = !on;
    });
  });

  useEffect(() => {
    const lit = Math.min(orbs.found.length, ENERGY_NEEDED);
    for (let i = 0; i < ENERGY_NEEDED; i++) {
      built.lights.setColorAt(i, i < lit ? new THREE.Color(1.6, 1.25, 0.55) : new THREE.Color(0.22, 0.18, 0.1));
    }
    if (built.lights.instanceColor) built.lights.instanceColor.needsUpdate = true;
  }, [orbs.found.length, built]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const st = storyStore.get();
    const p = player.position;
    const dist = Math.hypot(p.x - ROCKET.x, p.z - ROCKET.z);

    // bring parts home: they snap onto the rocket when you roll up
    if (st.phase === "play" || st.phase === "free") {
      if (st.carried.length && dist < 6.5) {
        const brought = storyStore.deliverAll();
        brought.forEach((id) => (anim.current.pop[id] = 0));
        sound.clunk();
      }
    }
    for (const [id, t] of Object.entries(anim.current.pop)) {
      const nt = t + dt;
      anim.current.pop[id] = nt;
      const k = nt < 0.6 ? 1 + Math.sin((nt / 0.6) * Math.PI) * 0.25 : 1;
      built.parts[id as PartId].scale.setScalar(k);
      if (nt > 0.7) delete anim.current.pop[id];
    }

    // launch!
    const g = rocket.current;
    if (!g) return;
    if (st.phase === "launch") {
      if (anim.current.launchT < 0) {
        anim.current.launchT = 0;
        control.hidden = true;
        built.flame.visible = true;
        sound.launchRoar();
      }
      const t = (anim.current.launchT += dt);
      const shake = t < 2 ? 0.04 * Math.min(t, 1) : 0.02;
      const rise = t < 1.6 ? 0 : 0.5 * 3.2 * (t - 1.6) ** 2;
      g.position.set(ROCKET.x + (Math.random() - 0.5) * shake, ground + 0.25 + rise, ROCKET.z + (Math.random() - 0.5) * shake);
      const f = Math.min(1, t / 1.2);
      built.flame.scale.set(0.6 + f * 0.5 + Math.sin(t * 9) * 0.04, 0.5 + f * 1.1 + Math.sin(t * 7) * 0.08, 0.6 + f * 0.5);
      if (fireLight.current) {
        fireLight.current.intensity = 30 * f;
        fireLight.current.position.set(g.position.x, g.position.y - 0.5, g.position.z);
      }
      // camera watches from the side, then tilts up to follow it out of the Sky Eye
      const camPos = new THREE.Vector3(ROCKET.x + 10, ground + 3.2 + Math.min(rise * 0.25, 18), ROCKET.z + 9);
      control.camera = { pos: camPos, target: g.position.clone().add(new THREE.Vector3(0, 3, 0)), speed: 2.5 };
      if (t > 7.2) {
        control.camera = null;
        storyStore.finish();
      }
    } else {
      if (anim.current.launchT >= 0) {
        // after the ending, the rocket stands back on its pad as a monument
        anim.current.launchT = -1;
        built.flame.visible = false;
        if (fireLight.current) fireLight.current.intensity = 0;
        control.hidden = false;
      }
      g.position.set(ROCKET.x, ground + 0.25, ROCKET.z);
    }
    void state;
    void camera;
    void complete;
  });

  return (
    <>
      <mesh geometry={built.padGeo} material={built.padMat} position={[ROCKET.x, ground, ROCKET.z]} />
      <primitive object={built.lights} position={[ROCKET.x, ground, ROCKET.z]} />
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider args={[0.25, 3.3]} position={[ROCKET.x, ground, ROCKET.z]} />
        <CylinderCollider args={[2.6, 1.05]} position={[ROCKET.x, ground + 0.25 + 2.7, ROCKET.z]} />
      </RigidBody>
      <group ref={rocket}>
        {PART_ORDER.map((id) => (
          <group key={id}>
            <primitive object={built.parts[id]} />
            <primitive object={built.ghosts[id]} />
          </group>
        ))}
        <primitive object={built.flame} />
      </group>
      <pointLight ref={fireLight} color="#ff9a4a" intensity={0} distance={30} decay={1.5} />
    </>
  );
}

// ---------------------------------------------------------------- parts lying around the world

function partIcon(id: PartId) {
  const mat = new THREE.MeshStandardMaterial({ color: "#e8e2d6", roughness: 0.35, metalness: 0.6, emissive: "#4fd8ff", emissiveIntensity: 0.25 });
  switch (id) {
    case "hull":
      return new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.35, 24, 1, true, 0, Math.PI * 0.8), mat);
    case "cone":
      return new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.6, 24), mat);
    case "fins": {
      const g = new THREE.Group();
      for (const s of [-1, 1]) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.36), mat);
        m.position.x = s * 0.14;
        m.rotation.z = s * 0.25;
        g.add(m);
      }
      return g;
    }
    case "wire":
      return new THREE.Mesh(helix(0.2, 0.4, 4, 0.03), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.15, 0.6, 0.28) }));
    default:
      return new THREE.Mesh(new THREE.IcosahedronGeometry(0.25), mat);
  }
}

export function PartPickups() {
  const s = useSyncExternalStore(storyStore.subscribe, storyStore.get, storyStore.get);
  const items = useMemo(
    () =>
      PARTS.filter((p) => p.at).map((p) => {
        const y = p.at!.y ?? terrainHeight(p.at!.x, p.at!.z) + 0.75;
        const inTunnel = tunnelDistance(p.at!.x, y, p.at!.z) < TUNNEL_RADIUS + 0.5;
        return { id: p.id, pos: new THREE.Vector3(p.at!.x, y, p.at!.z), icon: partIcon(p.id), reach: inTunnel ? 3 : 1.3 };
      }),
    [],
  );
  const glow = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(160,240,255,0.8)");
    g.addColorStop(1, "rgba(160,240,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }, []);
  const groups = useRef<Array<THREE.Group | null>>([]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const p = player.position;
    items.forEach((it, i) => {
      const g = groups.current[i];
      if (!g) return;
      g.position.set(it.pos.x, it.pos.y + Math.sin(t * 1.3 + i) * 0.12, it.pos.z);
      g.rotation.y = t * 0.8;
      if (!storyStore.has(it.id) && p.distanceTo(it.pos) < it.reach && storyStore.get().phase !== "card") {
        storyStore.pickUp(it.id);
        sound.collect();
      }
    });
  });
  return (
    <>
      {items.map((it, i) =>
        storyStore.has(it.id) && s ? null : (
          <group
            key={it.id}
            ref={(el) => {
              groups.current[i] = el;
            }}
          >
            <primitive object={it.icon} />
            <sprite scale={1.6}>
              <spriteMaterial map={glow} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.6} />
            </sprite>
            {/* a cyan beacon so parts can be told apart from the gold energy pillars */}
            <mesh position={[0, 20, 0]}>
              <cylinderGeometry args={[0.08, 0.25, 40, 10, 1, true]} />
              <meshBasicMaterial color={new THREE.Color(0.3, 0.85, 1.0)} transparent opacity={0.1} depthWrite={false} blending={THREE.AdditiveBlending} />
            </mesh>
          </group>
        ),
      )}
    </>
  );
}

// ---------------------------------------------------------------- friends

function npcY(n: Npc) {
  return n.y ?? terrainHeight(n.x, n.z);
}

function Eyes({ r, y = 0.2, spread = 0.36, look = 0.88 }: { r: number; y?: number; spread?: number; look?: number }) {
  return (
    <>
      {[-1, 1].map((s) => {
        const dir = new THREE.Vector3(Math.sin(s * spread) * Math.cos(y), Math.sin(y), Math.cos(s * spread) * Math.cos(y));
        return (
          <group key={s}>
            <mesh position={dir.clone().multiplyScalar(r * look)} scale={[r * 0.25, r * 0.29, r * 0.2]}>
              <sphereGeometry args={[1, 16, 12]} />
              <meshStandardMaterial color="#fbf8ff" emissive="#fbf8ff" emissiveIntensity={0.2} roughness={0.3} />
            </mesh>
            <mesh position={dir.clone().multiplyScalar(r * (look + 0.13))} scale={[r * 0.15, r * 0.19, r * 0.1]}>
              <sphereGeometry args={[1, 12, 10]} />
              <meshBasicMaterial color="#1a0f24" />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

function Puffkin({ r, color, elder }: { r: number; color: string; elder?: boolean }) {
  return (
    <group>
      <mesh position={[0, r, 0]}>
        <sphereGeometry args={[r, 32, 24]} />
        <meshStandardMaterial color={color} roughness={0.85} emissive={color} emissiveIntensity={0.35} />
      </mesh>
      <group position={[0, r, 0]}>
        <Eyes r={r} />
        {[-1, 1].map((s) => (
          <mesh key={s} position={[Math.sin(s * 0.82) * r * 0.92, -r * 0.12, Math.cos(s * 0.82) * r * 0.92]} scale={[r * 0.17, r * 0.1, r * 0.06]}>
            <sphereGeometry args={[1, 12, 8]} />
            <meshBasicMaterial color={new THREE.Color(1.0, 0.5, 0.68)} />
          </mesh>
        ))}
        {elder ? (
          <>
            {/* round spectacles and fluffy white brows */}
            {[-1, 1].map((s) => (
              <mesh key={s} position={[Math.sin(s * 0.36) * r * 1.0, r * 0.2, Math.cos(s * 0.36) * r * 1.0]} rotation={[0, s * 0.36, 0]}>
                <torusGeometry args={[r * 0.24, r * 0.035, 8, 24]} />
                <meshStandardMaterial color="#c9a663" metalness={0.8} roughness={0.3} />
              </mesh>
            ))}
            {[-1, 1].map((s) => (
              <mesh key={`b${s}`} position={[Math.sin(s * 0.36) * r * 0.92, r * 0.5, Math.cos(s * 0.36) * r * 0.85]} scale={[r * 0.22, r * 0.09, r * 0.1]}>
                <sphereGeometry args={[1, 10, 8]} />
                <meshStandardMaterial color="#ffffff" roughness={1} />
              </mesh>
            ))}
          </>
        ) : (
          // Pip's little leaf
          <mesh position={[0, r * 1.02, 0]} rotation={[0.4, 0, 0.3]} scale={[r * 0.35, r * 0.06, r * 0.18]}>
            <sphereGeometry args={[1, 12, 8]} />
            <meshStandardMaterial color="#5fd18a" emissive="#2a8a50" emissiveIntensity={0.3} />
          </mesh>
        )}
        <mesh position={[0, r * 1.05, 0]} rotation={[0.35, 0, 0]}>
          <cylinderGeometry args={[r * 0.04, r * 0.04, r * 0.8, 6]} />
          <meshStandardMaterial color="#3a2f45" />
        </mesh>
        <mesh position={[0, r * 1.45, r * 0.25]}>
          <sphereGeometry args={[r * 0.15, 12, 10]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} />
        </mesh>
      </group>
    </group>
  );
}

function Snail({ size }: { size: number }) {
  return (
    <group scale={size}>
      <mesh position={[0, 0.05, 0.1]} scale={[0.12, 0.07, 0.32]}>
        <sphereGeometry args={[1, 16, 12]} />
        <meshStandardMaterial color="#b9a6c9" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.17, -0.04]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.1, 0.06, 12, 24]} />
        <meshStandardMaterial color="#7fe8ff" emissive="#7fe8ff" emissiveIntensity={0.55} roughness={0.4} />
      </mesh>
      {/* a tiny flower growing on her shell */}
      <mesh position={[0, 0.29, -0.04]}>
        <sphereGeometry args={[0.025, 8, 6]} />
        <meshStandardMaterial color="#ffb3d9" emissive="#ffb3d9" emissiveIntensity={0.6} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.04, 0.1, 0.32]} rotation={[0.5, 0, s * 0.3]}>
          <mesh position={[0, 0.07, 0]}>
            <cylinderGeometry args={[0.01, 0.012, 0.14, 6]} />
            <meshStandardMaterial color="#b9a6c9" />
          </mesh>
          <mesh position={[0, 0.15, 0]}>
            <sphereGeometry args={[0.025, 10, 8]} />
            <meshStandardMaterial color="#bff6ff" emissive="#bff6ff" emissiveIntensity={0.7} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Fish({ size }: { size: number }) {
  return (
    <group scale={size}>
      <mesh scale={[0.42, 0.5, 1]}>
        <sphereGeometry args={[1, 24, 18]} />
        <meshStandardMaterial color="#ffd27a" emissive="#ffb347" emissiveIntensity={0.45} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0, -1.2]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.9, 0.7, 0.3]}>
        <coneGeometry args={[0.6, 0.8, 4]} />
        <meshStandardMaterial color="#ffb347" emissive="#ff9a3c" emissiveIntensity={0.4} />
      </mesh>
      <group position={[0, 0.15, 0.2]}>
        <Eyes r={0.5} y={0.1} spread={0.55} look={0.82} />
      </group>
      {/* the lure */}
      <mesh position={[0, 0.85, 0.55]} rotation={[0.6, 0, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.7, 6]} />
        <meshStandardMaterial color="#8a6a3a" />
      </mesh>
      <mesh position={[0, 1.15, 0.85]}>
        <sphereGeometry args={[0.12, 12, 10]} />
        <meshBasicMaterial color={new THREE.Color(1.2, 1.1, 0.7)} />
      </mesh>
    </group>
  );
}

function Sprite() {
  return (
    <group>
      <mesh scale={[0.32, 0.5, 0.32]}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#b48cff" emissive="#9a68ff" emissiveIntensity={0.7} flatShading roughness={0.15} metalness={0.2} />
      </mesh>
      <group position={[0, 0.02, 0.05]}>
        <Eyes r={0.26} y={0.15} spread={0.4} look={0.85} />
      </group>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[Math.cos((i / 3) * Math.PI * 2) * 0.6, 0.1 * i, Math.sin((i / 3) * Math.PI * 2) * 0.6]} scale={[0.07, 0.13, 0.07]}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#7fe8ff" emissive="#7fe8ff" emissiveIntensity={0.8} flatShading />
        </mesh>
      ))}
    </group>
  );
}

function talkBubbleTexture() {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 96;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "rgba(255,248,232,0.95)";
  ctx.beginPath();
  ctx.ellipse(64, 42, 56, 36, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(52, 70);
  ctx.lineTo(44, 94);
  ctx.lineTo(70, 74);
  ctx.fill();
  ctx.fillStyle = "#3a2c1c";
  for (const x of [40, 64, 88]) {
    ctx.beginPath();
    ctx.arc(x, 42, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  return new THREE.CanvasTexture(c);
}

/** Where each friend is right now (they wander after Bob once you've met them). */
export const friendPos: Record<string, THREE.Vector3> = Object.fromEntries(
  NPCS.map((n) => [n.id, new THREE.Vector3(n.x, n.y ?? terrainHeight(n.x, n.z), n.z)]),
);

/** Each friend's spot in the little parade behind Bob: [angle offset, distance]. */
const SLOTS: Record<string, [number, number]> = {
  pip: [0.55, 2.4],
  elder: [-0.55, 2.6],
  moss: [0.0, 3.4],
  quartz: [1.1, 2.0],
  finn: [-1.1, 2.4],
};

export function Friends() {
  const bubbleTex = useMemo(() => talkBubbleTexture(), []);
  const groups = useRef<Array<THREE.Group | null>>([]);
  const bubbles = useRef<Array<THREE.Sprite | null>>([]);
  const home = useMemo(() => NPCS.map((n) => new THREE.Vector3(n.x, n.y ?? terrainHeight(n.x, n.z), n.z)), []);
  const motion = useRef(NPCS.map(() => ({ speed: 0, heading: new THREE.Vector3(0, 0, -1) })));
  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const dt = Math.min(delta, 0.05);
    const p = player.position;
    const v = player.velocity;
    const st = storyStore.get();
    const bobGround = terrainHeight(p.x, p.z);
    const bobInWater = inDeepWater(p.x, p.y, p.z);
    // "behind Bob" follows the way he's rolling (or keeps the last direction)
    const hv = Math.hypot(v.x, v.z);
    NPCS.forEach((n, i) => {
      const g = groups.current[i];
      if (!g) return;
      const m = motion.current[i];
      if (hv > 0.6) m.heading.set(v.x / hv, 0, v.z / hv);
      const pos = friendPos[n.id];
      // friends stay at home (they used to follow Bob around)
      const following = false;
      let moving = false;
      if (following && (n.id !== "finn" || bobInWater)) {
        const [ang, dist] = SLOTS[n.id];
        const back = m.heading.clone().multiplyScalar(-1).applyAxisAngle(new THREE.Vector3(0, 1, 0), ang);
        const target = new THREE.Vector3(p.x + back.x * dist, 0, p.z + back.z * dist);
        if (n.id === "finn") target.y = Math.min(p.y, DEEP_LEVEL - 0.4);
        else if (n.id === "quartz") target.y = p.y + 1.1;
        else target.y = terrainHeight(target.x, target.z);
        const far = pos.distanceTo(target);
        // too far behind (a puffball launch, a long fall): pop over to Bob, on land only
        const bobOnLand = !bobInWater && Math.abs(p.y - bobGround) < 3;
        if (far > 40 && (bobOnLand || n.id === "quartz" || n.id === "finn")) {
          pos.copy(target);
        } else {
          // walkers don't wade into deep water; Finn doesn't leave it
          const blocked = n.id !== "quartz" && n.id !== "finn" && inDeepWater(target.x, target.y + 0.3, target.z);
          if (!blocked && far > 0.25) {
            const maxSpeed = n.id === "moss" ? 7 : 10;
            m.speed = THREE.MathUtils.damp(m.speed, Math.min(maxSpeed, far * 2.2), 4, dt);
            const step = Math.min(far, m.speed * dt);
            pos.addScaledVector(target.clone().sub(pos).normalize(), step);
            if (n.id !== "quartz" && n.id !== "finn") pos.y = terrainHeight(pos.x, pos.z);
            moving = step > 0.01;
          } else {
            m.speed = THREE.MathUtils.damp(m.speed, 0, 6, dt);
          }
        }
      } else {
        // drift back home
        const b = home[i];
        const far = pos.distanceTo(b);
        if (far > 0.2) {
          pos.addScaledVector(b.clone().sub(pos).normalize(), Math.min(far, 4 * dt));
          if (n.id !== "quartz" && n.id !== "finn") pos.y = terrainHeight(pos.x, pos.z);
        }
      }
      // little hops while they hurry after Bob
      const hop = moving && (n.id === "pip" || n.id === "elder") ? Math.abs(Math.sin(t * 11 + i)) * 0.28 : 0;
      const bob =
        n.id === "quartz"
          ? (st.met.includes(n.id) ? 0 : 1.4) + Math.sin(t * 1.2) * 0.15
          : n.id === "finn"
            ? Math.sin(t * 1.4) * 0.12
            : hop + Math.abs(Math.sin(t * 2.2 + i)) * 0.04;
      g.position.set(pos.x, pos.y + bob, pos.z);
      // face Bob when close, otherwise face where they're going
      const dx = p.x - pos.x;
      const dz = p.z - pos.z;
      const want = Math.hypot(dx, dz) < 9 && !moving ? Math.atan2(dx, dz) : Math.atan2(m.heading.x, m.heading.z);
      let d = want - g.rotation.y;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      g.rotation.y += d * Math.min(1, dt * 5);
      const bubble = bubbles.current[i];
      if (bubble) {
        const inRange = pos.distanceTo(p) < n.talkRange + 1 && !st.talk && hv < 1.2;
        bubble.visible = inRange;
        bubble.position.set(pos.x, pos.y + bob + (n.id === "moss" ? 1.6 : n.id === "elder" ? 1.5 : n.id === "finn" ? 1.6 : 1.3), pos.z);
        bubble.scale.set(0.9, 0.68, 1).multiplyScalar(1 + Math.sin(t * 3) * 0.04);
      }
    });
  });
  return (
    <>
      {NPCS.map((n, i) => (
        <group key={n.id}>
          <group
            ref={(el) => {
              groups.current[i] = el;
            }}
          >
            {n.id === "pip" && <Puffkin r={0.3} color={n.color} />}
            {n.id === "elder" && <Puffkin r={0.42} color={n.color} elder />}
            {n.id === "moss" && <Snail size={3.2} />}
            {n.id === "finn" && <Fish size={0.6} />}
            {n.id === "quartz" && <Sprite />}
          </group>
          <sprite
            ref={(el) => {
              bubbles.current[i] = el;
            }}
            visible={false}
          >
            <spriteMaterial map={bubbleTex} transparent depthWrite={false} />
          </sprite>
        </group>
      ))}
    </>
  );
}

// ---------------------------------------------------------------- photos

/** Grabs the frame right after it's drawn when you press P. */
export function PhotoCapture() {
  const handled = useRef(0);
  useFrame(({ gl, camera }) => {
    const st = storyStore.get();
    if (st.photoRequest === handled.current) return;
    handled.current = st.photoRequest;
    try {
      const src = gl.domElement;
      const w = 240;
      const h = Math.round((w * src.height) / src.width);
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      c.getContext("2d")!.drawImage(src, 0, 0, w, h);
      const thumb = c.toDataURL("image/jpeg", 0.62);
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      storyStore.addPhoto({ x: player.position.x, z: player.position.z, yaw: Math.atan2(dir.x, -dir.z), thumb });
      sound.shutter();
    } catch {
      // ignore: a blocked canvas just means no photo
    }
  }, 2);
  return null;
}

// ---------------------------------------------------------------- the director: intro fall, prompts

export function StoryDirector() {
  const clock = useRef({ t: 0, fellAt: 0, airborne: false, startX: NaN, startZ: NaN, moved: false });
  useEffect(() => {
    storyStore.load();
    // already mid-adventure? start beside the rocket
    const st = storyStore.get();
    if (st.phase === "free" || st.phase === "play") control.hidden = false;
  }, []);
  const camState = useRef({ active: false });
  useFrame(({ camera }, delta) => {
    const c = clock.current;
    c.t += Math.min(delta, 0.05);
    const st = storyStore.get();
    const p = player.position;

    // conversation camera: frame Bob and his friend, or pan to whatever the line is about
    if (st.talk && st.phase !== "launch") {
      const line = lineFor(st.talk);
      const bob = p.clone();
      if (line?.focus) {
        const f = new THREE.Vector3(line.focus.x, line.focus.y, line.focus.z);
        const flat = new THREE.Vector3(f.x - bob.x, 0, f.z - bob.z);
        const dist = flat.length();
        flat.normalize();
        const steep = f.y - bob.y > dist * 1.2;
        // stand just behind Bob, looking past him at the thing
        const pos = bob.clone().addScaledVector(flat, steep ? -1.6 : -3.4).add(new THREE.Vector3(0, steep ? 0.4 : 1.5, 0));
        control.camera = { pos, target: f, speed: 2.2 };
      } else if (st.talk.who !== "bob") {
        const friend = friendPos[st.talk.who].clone().add(new THREE.Vector3(0, 0.4, 0));
        const mid = bob.clone().lerp(friend, 0.5).add(new THREE.Vector3(0, 0.25, 0));
        const across = new THREE.Vector3(friend.x - bob.x, 0, friend.z - bob.z);
        const side = new THREE.Vector3(-across.z, 0, across.x).normalize();
        if (side.dot(new THREE.Vector3().subVectors(camera.position, mid)) < 0) side.negate();
        const span = Math.max(2.6, across.length() * 1.3);
        control.camera = { pos: mid.clone().addScaledVector(side, span).add(new THREE.Vector3(0, 1.1, 0)), target: mid, speed: 3 };
      } else {
        control.camera = null;
      }
      camState.current.active = true;
    } else if (camState.current.active) {
      camState.current.active = false;
      if (st.phase !== "launch") control.camera = null;
    }
    storyStore.here.x = p.x;
    storyStore.here.z = p.z;

    if (st.phase === "falling") {
      if (!c.fellAt) {
        c.fellAt = c.t;
        c.airborne = false;
        control.teleport = { pos: new THREE.Vector3(ROCKET.x + 3.5, GROUND() + 48, ROCKET.z + 5.5) };
      } else if (!player.grounded) {
        c.airborne = true;
      } else if (c.airborne && c.t - c.fellAt > 0.8) {
        storyStore.landed();
        c.fellAt = 0;
      }
      return;
    }
    if (st.phase !== "play" && st.phase !== "free") {
      storyStore.setAction(null, null);
      return;
    }
    if (st.talk) return;

    // who's close enough to talk to?
    let action: ReturnType<typeof storyStore.get>["action"] = null;
    let prompt: string | null = null;
    let nearest = Infinity;
    for (const n of NPCS) {
      const fp = friendPos[n.id];
      const d = Math.hypot(p.x - fp.x, p.y - fp.y - 0.3, p.z - fp.z);
      // friends who follow you are always close by: only offer a chat when you stop
      if (d < n.talkRange && d < nearest) {
        nearest = d;
        action = { kind: "talk", npc: n.id, name: n.name };
        prompt = `T — talk to ${n.name}`;
      }
    }
    const rocketDist = Math.hypot(p.x - ROCKET.x, p.z - ROCKET.z);
    const partsDone = PARTS.every((q) => st.delivered.includes(q.id));
    const energy = orbStore.get().found.length;
    if (rocketDist < 7 && st.phase === "play") {
      if (partsDone && energy >= ENERGY_NEEDED) {
        // launching beats chatting with whoever tagged along
        action = { kind: "launch" };
        prompt = "T — launch the rocket!";
      } else if (!action) {
        prompt = `Rocket: ${st.delivered.length}/${PARTS.length} parts · energy ${Math.min(energy, ENERGY_NEEDED)}/${ENERGY_NEEDED}`;
      }
    }
    if (!prompt && inDeepWater(p.x, p.y, p.z)) {
      prompt =
        tunnelDistance(p.x, p.y, p.z) < 4
          ? "Swimming — W follows the tunnel · the current carries you to the cave · Space up · C down"
          : "Swimming — W A S D to swim · Space to rise · C to dive";
    } else if (!prompt && p.y > DEEP_LEVEL + 0.5 && st.carried.length) {
      prompt = `Carrying ${st.carried.length} part${st.carried.length > 1 ? "s" : ""} — bring ${st.carried.length > 1 ? "them" : "it"} to the rocket under the beam of light`;
    }
    // until you've rolled a little way, remind how to move
    if (Number.isNaN(c.startX)) {
      c.startX = p.x;
      c.startZ = p.z;
    }
    if (!c.moved && Math.hypot(p.x - c.startX, p.z - c.startZ) > 6) c.moved = true;
    if (!c.moved && !action) prompt = "Roll with W A S D or the arrow keys — W / ↑ goes the way the camera faces";
    storyStore.setAction(action, prompt);
  });
  return null;
}
