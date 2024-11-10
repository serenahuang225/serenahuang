import React, { useState, useEffect, useRef } from 'react';

const MouseCircle = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (event) => {
      setPosition({ x: event.clientX, y: event.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div 
      style={{
        position: 'absolute',
        zIndex: 0,
        left: position.x - 35, // Adjust for circle center
        top: position.y - 35, 
        width: 70, 
        height: 70,
        borderRadius: '50%',
        border: '1px solid #b3b3ff',
        // pointerEvents: 'none',
        cursor: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <p style={{fontSize: '8px', textAlign: 'center', color: '#b3b3ff'}}>SCROLL</p>
    </div>
  );
};

export default MouseCircle;