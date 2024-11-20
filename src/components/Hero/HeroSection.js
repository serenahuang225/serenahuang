import React from 'react';
import { motion } from 'framer-motion';
import './HeroSection.css';
import blob from './blob.gif'
import AnimatedButton from './AnimatedButton';
import { FaGithub, FaLinkedin } from 'react-icons/fa';

const HeroSection = () => {
  return (
    <div className="hero-section snapDiv" id="hero">
      <div className='widthBig flexRow justifySpaceBetween alignCenter'>
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className='nobold'
          >
            Hi, I'm Serena!
          </motion.h1>
          <motion.h2
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className='nobold' style={{margin: '2rem 0 2rem 0'}}
          >
            I like to <b>build cool stuff!</b>
          </motion.h2>
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }} 
            className='flexRow alignCenter'
            style={{gap: '1rem'}}
          >
            <AnimatedButton />
            <motion.a initial={{scale:1}} whileHover={{scale: 1.05}} whileTap={{scale:0.95}} style={{marginLeft: '1rem'}} className='noLink' href="https://www.linkedin.com/in/serenahuang225/" rel="noreferrer noopener" target="_blank">
              <FaLinkedin size={36} />
            </motion.a>
            <motion.a initial={{scale:1}} whileHover={{scale: 1.05}} whileTap={{scale:0.95}} className='noLink' href="https://github.com/serenahuang225" rel="noreferrer noopener" target="_blank">
              <FaGithub size={36} />
            </motion.a>
          </motion.div>
        </div>
        <motion.img 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 0.6 }} 
          src={blob} style={{height: 300, width: 300}} />
      </div>
    </div>
  );
};

export default HeroSection;
