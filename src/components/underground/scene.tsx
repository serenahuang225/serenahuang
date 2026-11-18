"use client";
import { Canvas, advance, useFrame, useThree } from "@react-three/fiber";
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

/**
 * Draws the frames. On a 60 Hz screen that's every refresh, as usual. On a
 * fast screen (120 Hz and up) the world can be too heavy to redraw every
 * time, and a mix of quick and slow frames reads as a faint stutter, so if
 * refreshes keep getting missed it settles on every other one: a steady
 * 60 (or 72 at 144 Hz) instead of a jittery 70-something.
 */
function FramePacer() {
  const get = useThree((s) => s.get);
  useEffect(() => {
    // R3F's own clock would restart itself between our calls; we feed it time
    get().clock.autoStart = false;
    let raf = 0;
    let start = -1;
    let last = -1;
    let period = 1000 / 60;
    let half = false;
    let owed = 0; // refreshes since the last drawn frame
    let ticks = 0;
    let missed = 0;
    const gaps: number[] = [];
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (start < 0) start = now - 1000 / 60;
      const gap = last < 0 ? period : now - last;
      last = now;
      if (gap > 3 && gap < 60) {
        gaps.push(gap);
        if (gaps.length > 120) gaps.shift();
        // the screen's refresh: the typical gap among the quickest ones
        if (gaps.length >= 60) {
          const sorted = [...gaps].sort((a, b) => a - b);
          const quick = sorted.filter((x) => x < sorted[Math.floor(sorted.length * 0.1)] * 1.4);
          period = quick[Math.floor(quick.length / 2)];
        }
      }
      // how many refreshes went by (more than one if the browser skipped some)
      const refreshes = Math.max(1, Math.round(gap / period));
      // only screens fast enough that half their rate is still smooth
      const fast = period < 9.5 && gaps.length >= 60;
      if (fast && !half) {
        ticks++;
        if (refreshes > 1) missed++;
        if (ticks >= 120) {
          if (missed > 24) half = true;
          ticks = missed = 0;
        }
      }
      owed += refreshes;
      if (fast && half && owed < 2) return;
      owed = 0;
      advance((now - start) / 1000, true, get());
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [get]);
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
      frameloop="never"
      gl={{ antialias: false, powerPreference: "high-performance", stencil: false }}
      camera={{ fov: 62, near: 0.05, far: 700, position: [0, 3, 64] }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NoToneMapping;
      }}
    >
      <FramePacer />
      <PerformanceMonitor
        // a steady 60 on a 120 Hz screen is the pacer at work, not a struggle
        bounds={(refresh) => (refresh > 100 ? [50, 100] : [40, 60])}
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
