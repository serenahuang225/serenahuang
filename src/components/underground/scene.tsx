"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { Bloom, EffectComposer, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { WORLD } from "./world-data";
import { DeepLake, Ground, GlowLights, Glowworms, Lake, Spores } from "./terrain";
import { Crystals, HollowLogs, SmallMushrooms, SolidMushrooms, SpringPads } from "./mushrooms";
import { Grass, Leaves } from "./foliage";
import { Ball } from "./ball";
import { Fireflies, GlowFlowers, HangingStrands, LightOrbs } from "./extras";
import { Atmosphere, Bridge, Cave, CrystalTunnel, Waterfall } from "./landmarks";
import { Fishes, Puffkins, Snails } from "./creatures";
import { Potions } from "./potions";
import { Friends, PartPickups, PhotoCapture, Rocket, SkyEye, StoryDirector } from "./story-world";

/** Hide the loader only once every shader is compiled and a few frames have drawn. */
function Ready({ onReady }: { onReady: () => void }) {
  const frames = useRef(0);
  const compiled = useRef(false);
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    let alive = true;
    const t = window.setTimeout(() => {
      gl.compileAsync(scene, camera)
        .catch(() => {})
        .finally(() => {
          if (alive) compiled.current = true;
        });
    }, 50);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [gl, scene, camera]);
  useFrame(() => {
    if (!compiled.current) return;
    frames.current++;
    if (frames.current === 12) onReady();
  });
  return null;
}

export default function UndergroundScene({ onReady }: { onReady: () => void }) {
  const [dpr, setDpr] = useState(1.5);
  const [lowPower, setLowPower] = useState(false);
  useEffect(() => {
    if (window.devicePixelRatio < 1.5) setDpr(1);
  }, []);
  return (
    <Canvas
      dpr={dpr}
      gl={{ antialias: false, powerPreference: "high-performance", stencil: false }}
      camera={{ fov: 62, near: 0.05, far: 700, position: [0, 3, 64] }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NoToneMapping;
      }}
    >
      <PerformanceMonitor
        onDecline={() => {
          setDpr((d) => Math.max(0.75, d - 0.25));
          setLowPower(true);
        }}
        onIncline={() => setDpr((d) => Math.min(window.devicePixelRatio > 1.5 ? 1.5 : 1, d + 0.25))}
      />
      <Atmosphere />
      <Suspense fallback={null}>
        <Physics gravity={[0, WORLD.gravity, 0]} updatePriority={-50}>
          <Ground />
          <SolidMushrooms />
          <SpringPads />
          <HollowLogs />
          <Crystals />
          <Cave />
          <CrystalTunnel />
          <Waterfall />
          <Bridge />
          <Rocket />
          <Ball />
          <StoryDirector />
          <Ready onReady={onReady} />
        </Physics>
      </Suspense>
      <SmallMushrooms />
      <Grass count={lowPower ? 32000 : 60000} />
      <Leaves count={lowPower ? 4000 : 7000} />
      <GlowFlowers count={lowPower ? 2400 : 3600} />
      <HangingStrands />
      <Fireflies count={lowPower ? 160 : 260} />
      <LightOrbs />
      <Lake />
      <DeepLake />
      <Puffkins />
      <Fishes />
      <Snails />
      <Potions />
      <PartPickups />
      <Friends />
      <SkyEye />
      <PhotoCapture />
      <Glowworms />
      <Spores />
      <GlowLights />
      <EffectComposer multisampling={lowPower ? 0 : 4} frameBufferType={THREE.HalfFloatType}>
        <Bloom mipmapBlur intensity={1.05} luminanceThreshold={1.1} luminanceSmoothing={0.4} radius={0.8} />
        <Vignette offset={0.25} darkness={0.75} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </Canvas>
  );
}
