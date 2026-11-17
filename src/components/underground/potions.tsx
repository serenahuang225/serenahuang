"use client";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { POTIONS, type Potion, type PotionKind } from "./world-data";
import { player } from "./shared";
import { sound } from "./audio";
import { lookStore } from "./look-store";
import { guideStore } from "./guide-store";

/**
 * Little glowing bottles to roll into. Round flasks change your fur colour,
 * squat jars make you fluffier, tall vials make you glow or bounce higher.
 * Each one comes back a while after you drink it.
 */

const RESPAWN_MS = 40000;

function lathe(points: Array<[number, number]>) {
  return new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(Math.max(x, 0.0001), y)), 24);
}

type Shape = "flask" | "jar" | "vial" | "drop";

const SHAPES: Record<Shape, Array<[number, number]>> = {
  flask: [[0, 0], [0.5, 0.02], [0.62, 0.25], [0.6, 0.5], [0.42, 0.72], [0.18, 0.85], [0.17, 1.08], [0.21, 1.13], [0, 1.13]],
  jar: [[0, 0], [0.6, 0], [0.67, 0.2], [0.67, 0.58], [0.52, 0.74], [0.36, 0.8], [0.37, 0.92], [0, 0.92]],
  vial: [[0, 0], [0.3, 0], [0.34, 0.1], [0.34, 1.08], [0.2, 1.18], [0.21, 1.33], [0, 1.33]],
  // a teardrop, for the wing potion
  drop: [[0, 0], [0.32, 0.04], [0.52, 0.22], [0.56, 0.42], [0.46, 0.66], [0.26, 0.9], [0.16, 1.02], [0.18, 1.12], [0, 1.12]],
};

function shapeFor(kind: PotionKind): Shape {
  return kind === "color" ? "flask" : kind === "fluff" ? "jar" : kind === "fly" ? "drop" : "vial";
}

function haloTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,0.85)");
  g.addColorStop(0.3, "rgba(255,255,255,0.3)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

function drink(p: Potion) {
  if (p.kind === "color") lookStore.setTint(p.name === "Red panda" ? null : `#${p.color.getHexString()}`, p.name);
  else if (p.kind === "fluff") lookStore.addFluff();
  else if (p.kind === "glow") lookStore.glow();
  else if (p.kind === "fly") lookStore.fly();
  else lookStore.bounce();
  sound.drink();
  guideStore.discover(`potion-${p.kind}`);
  if (p.kind === "color") guideStore.tryColor(p.name);
}

export function Potions() {
  const built = useMemo(() => {
    const geos = {
      flask: lathe(SHAPES.flask),
      jar: lathe(SHAPES.jar),
      vial: lathe(SHAPES.vial),
      drop: lathe(SHAPES.drop),
    };
    const liquidGeos = {
      flask: lathe(SHAPES.flask.map(([x, y]) => [x * 0.86, Math.min(y, 0.62)] as [number, number])),
      jar: lathe(SHAPES.jar.map(([x, y]) => [x * 0.88, Math.min(y, 0.6)] as [number, number])),
      vial: lathe(SHAPES.vial.map(([x, y]) => [x * 0.8, Math.min(y, 0.85)] as [number, number])),
      drop: lathe(SHAPES.drop.map(([x, y]) => [x * 0.85, Math.min(y, 0.6)] as [number, number])),
    };
    const glass = new THREE.MeshStandardMaterial({
      color: "#e6f6ff",
      transparent: true,
      opacity: 0.28,
      roughness: 0.05,
      metalness: 0.1,
      depthWrite: false,
    });
    const cork = new THREE.MeshStandardMaterial({ color: "#8a5a3c", roughness: 0.9 });
    const corkGeo = new THREE.CylinderGeometry(0.2, 0.17, 0.2, 12);
    const halo = haloTexture();
    const items = POTIONS.map((p) => {
      const shape = shapeFor(p.kind);
      const liquid = new THREE.MeshBasicMaterial({ color: p.color.clone().multiplyScalar(1.15) });
      const spriteMat = new THREE.SpriteMaterial({
        map: halo,
        color: p.color.clone(),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.55,
      });
      return { p, shape, liquid, spriteMat, corkY: SHAPES[shape][SHAPES[shape].length - 1][1] };
    });
    return { geos, liquidGeos, glass, cork, corkGeo, items };
  }, []);

  const groups = useRef<Array<THREE.Group | null>>([]);
  const sprites = useRef<Array<THREE.Sprite | null>>([]);
  const state = useRef(POTIONS.map(() => ({ hiddenUntil: 0, burst: -1 })));

  useFrame((s, delta) => {
    const t = s.clock.elapsedTime;
    const now = Date.now();
    const ball = player.position;
    built.items.forEach((item, i) => {
      const g = groups.current[i];
      const sp = sprites.current[i];
      if (!g || !sp) return;
      const st = state.current[i];
      const visible = now >= st.hiddenUntil;
      const pos = item.p.pos;
      g.position.set(pos.x, pos.y + Math.sin(t * 1.2 + i) * 0.08, pos.z);
      g.rotation.y += delta * 0.6;
      if (st.burst >= 0) {
        st.burst += delta;
        const k = st.burst / 0.7;
        sp.scale.setScalar(1 + k * 3);
        sp.material.opacity = Math.max(0, 0.8 * (1 - k));
        if (k >= 1) st.burst = -1;
      } else {
        sp.scale.setScalar(visible ? 1.1 + Math.sin(t * 0.8 + i) * 0.08 : 0);
        sp.material.opacity = 0.5;
      }
      sp.position.copy(g.position).add(new THREE.Vector3(0, 0.2, 0));
      g.visible = visible;
      if (!visible) return;
      const d = Math.hypot(ball.x - pos.x, ball.y - (pos.y + 0.15), ball.z - pos.z);
      if (d < 0.85) {
        drink(item.p);
        st.hiddenUntil = now + RESPAWN_MS;
        st.burst = 0;
      }
    });
  });

  return (
    <>
      {built.items.map((item, i) => (
        <group key={item.p.id}>
          <group
            ref={(el) => {
              groups.current[i] = el;
            }}
            scale={0.34}
          >
            <mesh geometry={built.liquidGeos[item.shape]} material={item.liquid} />
            <mesh geometry={built.geos[item.shape]} material={built.glass} renderOrder={5} />
            <mesh geometry={built.corkGeo} material={built.cork} position={[0, item.corkY + 0.05, 0]} />
          </group>
          <sprite
            ref={(el) => {
              sprites.current[i] = el;
            }}
            material={item.spriteMat}
          />
        </group>
      ))}
    </>
  );
}
