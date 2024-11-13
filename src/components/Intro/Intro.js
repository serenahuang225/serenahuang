import React from 'react';
import { motion } from 'framer-motion';
import { introData } from '../../data';
import "./Intro.css"

const Intro = () => (
  <motion.div
    initial={{ scale: 0.5, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ duration: 1 }}
    className="intro-container"
  >
    <h1 className="greeting">Hello there!</h1>
    <motion.h2
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1, duration: 1 }}
    >
      I'm Serena,
    </motion.h2>
    <motion.h2
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 2, duration: 1 }}
    >
      and I like to <span className='message'>build</span>
    </motion.h2>
  </motion.div>
);

export default Intro;
