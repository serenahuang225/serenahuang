import React from 'react';
import { motion } from 'framer-motion';
import { experienceData } from './data';

const Experience = () => (
  <div className="experience-container">
    <h2>Experience</h2>
    {experienceData.map((exp, index) => (
      <motion.div
        key={index}
        className="experience-item"
        initial={{ x: index % 2 === 0 ? -100 : 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 1, delay: index * 0.2 }}
      >
        <img src={exp.image} alt={exp.company} className="experience-image" />
        <div className="experience-details">
          <h3>{exp.title}</h3>
          <p>{exp.company}</p>
          <p>{exp.description}</p>
        </div>
      </motion.div>
    ))}
  </div>
);

export default Experience;
