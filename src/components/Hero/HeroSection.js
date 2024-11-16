import React from 'react';
import { motion } from 'framer-motion';
import './HeroSection.css';
import blob from './blob3.gif'
import AnimatedButton from './AnimatedButton';

const HeroSection = () => {
  return (
    <div className="hero-section snapDiv" id="hero">
      <div className='widthBig flexRow justifySpaceBetween alignItemCenter'>
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className='nobold'
          >
            Hello there!
          </motion.h1>
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className='nobold' style={{marginTop: "-1rem"}}
          >
            My name is <strong>Serena</strong>
          </motion.h1>
          <motion.h2
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className='nobold' style={{margin: '2rem 0 2rem 0'}}
          >
            and I like to <strong>build</strong> stuff!
          </motion.h2>
          <AnimatedButton />
        </div>
        <img src={blob} style={{height: 300, width: 300}} />
      </div>
    </div>
  );
};

export default HeroSection;
