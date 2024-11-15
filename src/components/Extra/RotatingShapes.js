import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Box } from '@react-three/drei';

const RotatingShapes = () => {
  const cubeRef = useRef();

  useFrame(() => {
    if (cubeRef.current) {
      cubeRef.current.rotation.x += 0.01;
      cubeRef.current.rotation.y += 0.01;
    }
  });

  return (
    <Canvas className="background-canvas">
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 5]} />
      <Box ref={cubeRef} args={[1, 1, 1]} position={[-1.2, 0, 0]}>
        <meshStandardMaterial attach="material" color="#e57373" />
      </Box>
    </Canvas>
  );
};

export default RotatingShapes;
