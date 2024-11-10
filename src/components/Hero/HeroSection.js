import React from 'react';
import { motion } from 'framer-motion';
import './HeroSection.css';

const HeroSection = () => {
  return (
    <div className="hero-section">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
      >
        Hello there!
      </motion.h1>
      <motion.h2
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
      >
        I'm Serena.
      </motion.h2>
    </div>
  );
};

export default HeroSection;
