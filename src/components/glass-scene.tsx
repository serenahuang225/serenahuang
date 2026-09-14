"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Environment,
  Lightformer,
  MeshTransmissionMaterial,
  RoundedBox,
} from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
function Lens({
  progress,
  depth,
  still,
  docked,
}: {
  progress: React.RefObject<number>;
  depth: React.RefObject<number>;
  still: boolean;
  docked: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const background = useMemo(() => new THREE.Color("#f0edf7"), []);
  const spin = useRef(0);
  useFrame((_, delta) => {
    if (!group.current) return;
    const dt = Math.min(delta, 0.05);
    if (!still) spin.current += dt * 0.18;
    group.current.rotation.x = 0;
    group.current.rotation.y = 0;
    group.current.rotation.z = THREE.MathUtils.damp(
      group.current.rotation.z,
      still ? 0 : spin.current + depth.current * Math.PI * 2,
      7,
      dt,
    );
    group.current.scale.setScalar(1);
  });
  return (
    <group ref={group} rotation={[0.12, -0.42, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.45, 1.45, 0.45, 96, 1, true]} />
        <meshStandardMaterial
          color="#c6c9d3"
          metalness={1}
          roughness={0.21}
          side={THREE.DoubleSide}
        />
      </mesh>
      {[
        { r: 1.45, z: 0.23, t: 0.065 },
        { r: 1.36, z: 0.26, t: 0.025 },
        { r: 1.26, z: 0.23, t: 0.028 },
        { r: 1.45, z: -0.23, t: 0.035 },
      ].map((ring, i) => (
        <mesh key={i} position={[0, 0, ring.z]}>
          <torusGeometry args={[ring.r, ring.t, 16, 96]} />
          <meshStandardMaterial
            color="#e5e6ed"
            metalness={1}
            roughness={0.16}
          />
        </mesh>
      ))}
      {Array.from({ length: 48 }, (_, i) => {
        const a = (i / 48) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 1.406, Math.sin(a) * 1.406, 0.275]}
            rotation={[0, 0, a]}
          >
            <boxGeometry args={[0.044, i % 4 === 0 ? 0.017 : 0.009, 0.009]} />
            <meshStandardMaterial
              color="#aaa6bb"
              metalness={0.65}
              roughness={0.4}
            />
          </mesh>
        );
      })}
      <mesh scale={[1.26, 1.26, 0.22]} position={[0, 0, 0.12]}>
        <sphereGeometry args={[1, 64, 32]} />
        <MeshTransmissionMaterial
          background={background}
          resolution={256}
          samples={4}
          transmission={1}
          thickness={0.65}
          roughness={0.045}
          ior={1.45}
          chromaticAberration={0.025}
          color="#f5efff"
          attenuationColor="#b5a1d3"
          attenuationDistance={5}
        />
      </mesh>
      <mesh position={[0, 0, -0.15]}>
        <ringGeometry args={[0.6, 1.25, 7]} />
        <meshStandardMaterial
          color="#dedde9"
          metalness={0.35}
          roughness={0.28}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0, -0.18]}>
        <circleGeometry args={[0.61, 64]} />
        <meshBasicMaterial color="#e2dcef" />
      </mesh>
    </group>
  );
}
function CameraRig(props: {
  pointer: React.RefObject<{ x: number; y: number }>;
  progress: React.RefObject<number>;
  depth: React.RefObject<number>;
  still: boolean;
  docked: boolean;
}) {
  const body = useRef<THREE.Group>(null);
  useFrame(({ camera }, delta) => {
    const p = props.still || props.docked ? 0 : props.progress.current;
    const approach = THREE.MathUtils.smoothstep(p, 0.15, 0.92);
    camera.position.z = props.docked
      ? 5.8
      : THREE.MathUtils.damp(
          camera.position.z,
          8.2 * (1 - approach) + 0.28 * approach,
          8,
          Math.min(delta, 0.05),
        );
    if (body.current) {
      body.current.rotation.y = THREE.MathUtils.damp(
        body.current.rotation.y,
        props.docked
          ? 0
          : (-0.38 + (props.still ? 0 : props.pointer.current.x * 0.4)) *
              (1 - THREE.MathUtils.smoothstep(p, 0, 0.4)),
        8,
        Math.min(delta, 0.05),
      );
      body.current.rotation.x = THREE.MathUtils.damp(
        body.current.rotation.x,
        props.docked
          ? 0
          : (0.12 + (props.still ? 0 : props.pointer.current.y * 0.25)) *
              (1 - approach),
        8,
        Math.min(delta, 0.05),
      );
    }
  });
  return (
    <group ref={body}>
      {!props.docked && (
        <group position={[0.15, 0.25, -0.8]}>
          <RoundedBox
            args={[3.85, 2.95, 0.95]}
            position={[0, -0.435, 0]}
            radius={0.25}
            smoothness={5}
          >
            <meshStandardMaterial
              color="#f5f4f0"
              roughness={0.3}
              metalness={0.1}
            />
          </RoundedBox>
          <RoundedBox
            args={[3.92, 0.3, 1.03]}
            radius={0.1}
            smoothness={4}
            position={[0.04, -1.92, 0.02]}
          >
            <meshStandardMaterial
              color="#e8e9eb"
              metalness={0.14}
              roughness={0.35}
            />
          </RoundedBox>
          <RoundedBox
            args={[0.92, 3.04, 1.35]}
            radius={0.28}
            smoothness={5}
            position={[-1.55, -0.495, 0.15]}
            rotation={[0, 0.08, -0.06]}
          >
            <meshStandardMaterial
              color="#e8e8e6"
              roughness={0.62}
              metalness={0.04}
            />
          </RoundedBox>
          <RoundedBox
            args={[0.25, 1.6, 0.03]}
            radius={0.07}
            smoothness={4}
            position={[-1.8, -0.13, 0.83]}
          >
            <meshStandardMaterial color="#d0d1d4" roughness={0.7} />
          </RoundedBox>
          <mesh position={[-0.1, 1.12, -0.03]} rotation={[0, Math.PI / 4, 0]}>
            <cylinderGeometry args={[0.5, 0.85, 0.65, 4]} />
            <meshStandardMaterial
              color="#f9f9f7"
              roughness={0.26}
              metalness={0.08}
            />
          </mesh>
          <RoundedBox
            args={[0.74, 0.12, 0.06]}
            radius={0.035}
            smoothness={3}
            position={[-0.1, 1.16, 0.57]}
          >
            <meshStandardMaterial
              color="#d4d7df"
              metalness={0.55}
              roughness={0.2}
            />
          </RoundedBox>
          <RoundedBox
            args={[0.6, 0.12, 0.52]}
            radius={0.025}
            smoothness={3}
            position={[-0.1, 1.5, -0.1]}
          >
            <meshStandardMaterial
              color="#b5b9c4"
              roughness={0.25}
              metalness={0.7}
            />
          </RoundedBox>
          {[-1.27, 1.22].map((x, i) => (
            <group key={x} position={[x, 1.08, 0]}>
              <mesh>
                <cylinderGeometry
                  args={[i ? 0.25 : 0.35, i ? 0.25 : 0.35, 0.18, 40]}
                />
                <meshStandardMaterial
                  color="#c8cbd4"
                  metalness={0.65}
                  roughness={0.25}
                />
              </mesh>
              <mesh position={[0, 0.1, 0]}>
                <cylinderGeometry
                  args={[i ? 0.2 : 0.29, i ? 0.2 : 0.29, 0.03, 40]}
                />
                <meshStandardMaterial
                  color="#f2f1f6"
                  metalness={0.2}
                  roughness={0.3}
                />
              </mesh>
            </group>
          ))}
          <mesh position={[-1.55, 1.14, 0.46]} rotation={[0.15, 0, 0]}>
            <cylinderGeometry args={[0.16, 0.2, 0.14, 32]} />
            <meshStandardMaterial
              color="#e4e7ee"
              metalness={0.75}
              roughness={0.15}
            />
          </mesh>
          <mesh position={[1.18, 0.6, 0.5]}>
            <circleGeometry args={[0.08, 24]} />
            <meshStandardMaterial
              color="#babfcd"
              metalness={0.65}
              roughness={0.2}
            />
          </mesh>
          {[1.88, -2.01].map((x) => (
            <mesh
              key={x}
              position={[x, 0.65, 0]}
              rotation={[0, Math.PI / 2, 0]}
            >
              <torusGeometry args={[0.12, 0.035, 8, 24]} />
              <meshStandardMaterial
                color="#b5bac7"
                metalness={0.8}
                roughness={0.2}
              />
            </mesh>
          ))}
        </group>
      )}
      <group scale={props.docked ? 1 : 0.78}>
        <Lens {...props} />
      </group>
    </group>
  );
}
export default function GlassScene(props: {
  pointer: React.RefObject<{ x: number; y: number }>;
  progress: React.RefObject<number>;
  depth: React.RefObject<number>;
  still: boolean;
  docked: boolean;
}) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      resize={{ offsetSize: true }}
      camera={{ position: [0, 0, 8.2], fov: 42, near: 0.05 }}
      gl={{ alpha: true, antialias: true }}
      aria-hidden="true"
    >
      <ambientLight intensity={0.45} />
      <directionalLight position={[4, 3, 5]} intensity={2} />
      <CameraRig {...props} />
      <Environment resolution={128}>
        <color attach="background" args={["#a9adbd"]} />
        <Lightformer
          form="rect"
          intensity={3}
          color="#ffffff"
          scale={[6, 3, 1]}
          position={[-3, 3, 4]}
          target={[0, 0, 0]}
        />
        <Lightformer
          form="rect"
          intensity={3}
          color="#d6dfff"
          scale={[2, 6, 1]}
          position={[4, 0, 2]}
          target={[0, 0, 0]}
        />
        <Lightformer
          form="rect"
          intensity={4}
          color="#ffffff"
          scale={[1, 7, 1]}
          position={[-4, 0, 0]}
          target={[0, 0, 0]}
        />
        <Lightformer
          form="rect"
          intensity={2}
          color="#b0a2c7"
          scale={[8, 8, 1]}
          position={[0, 0, -5]}
          target={[0, 0, 0]}
        />
      </Environment>
    </Canvas>
  );
}
