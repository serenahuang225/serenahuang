import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import Section from '../components/Section';
import Navbar from '../components/Nav/Navbar';
import ParticlesBackground from '../components/ParticlesBackground';
import RotatingShapes from '../components/RotatingShapes';
import HeroSection from '../components/Hero/HeroSection';
import blob from './blob.gif'
import Intro from '../components/Intro/Intro';

const Home = () => {
  const sections = ['Intro', 'Projects', 'Skills', 'Contact'];
  
  return (
    <div style={{backgroundColor: 'black'}}>
      <Navbar />
      <HeroSection />
      <Intro />

      <ParticlesBackground />

      <img src={blob} style={{height: 300, width: 300}} />

      {sections.map((title, index) => (
        <Section key={index} title={title} index={index} />
      ))}
    </div>
  );
};

export default Home;