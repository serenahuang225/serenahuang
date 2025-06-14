import React from 'react';
import { motion } from 'framer-motion';
import './HeroSection.css';
import AnimatedButton from './AnimatedButton';
import { FaGithub, FaLinkedin } from 'react-icons/fa';

const HeroSection = () => {
  return (
    <div className="hero-section" id="hero">
      <div className='widthBig flexRowChange justifySpaceBetween alignCenter'>
        <div>
          <motion.p
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className='nobold'
          >
            👋 Hello there, I'm Serena!
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className='nobold' style={{margin: '1rem 0'}}
          >
            Engineer, developer, and learner
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className='nobold' style={{margin: '1rem 0'}}
          >
            I like to build cool stuff.
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }} 
            className='flexRow alignCenter gapChange'
          >
            <AnimatedButton message="LET'S WORK TOGETHER" />
            <div className='flexRow alignCenter gapChangeSmall'>
              <motion.a initial={{scale:1}} whileHover={{scale: 1.05}} whileTap={{scale:0.95}} style={{marginLeft: '1rem'}} className='noLink' href="https://www.linkedin.com/in/serenahuang225/" rel="noreferrer noopener" target="_blank">
                <FaLinkedin size={36} />
              </motion.a>
              <motion.a initial={{scale:1}} whileHover={{scale: 1.05}} whileTap={{scale:0.95}} className='noLink' href="https://github.com/serenahuang225" rel="noreferrer noopener" target="_blank">
                <FaGithub size={36} />
              </motion.a>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
