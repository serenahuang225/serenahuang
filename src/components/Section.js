import React from 'react';
import { motion } from 'framer-motion';
// import './Section.css';

const Section = ({ title, index }) => {
  return (
    <div className="maxWidth snapDiv" id={title}>
      <h1>{title}</h1>
      <p>Content for {title}</p>
    </div>
  );
};

export default Section;