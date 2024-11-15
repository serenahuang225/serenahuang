import React from 'react';
import { motion } from 'framer-motion';
// import './Section.css';

const Section = ({ title, index }) => {
  return (
    <div
      className="maxWidth"
      // initial={{ opacity: 0, y: 50 }}
      // animate={{ opacity: 1, y: 0 }}
      // transition={{ duration: 0.8, delay: index * 0.3 }}
    >
      <h1>{title}</h1>
      <p>Content for {title}</p>
    </div>
  );
};

export default Section;