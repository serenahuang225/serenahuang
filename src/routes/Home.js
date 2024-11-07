import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import Section from '../components/Section';
import Navbar from '../components/Nav/Navbar';
import ParticlesBackground from '../components/ParticlesBackground';
import RotatingShapes from '../components/RotatingShapes';
import HeroSection from '../components/Hero/HeroSection';

const Home = () => {
  const sections = ['Intro', 'Projects', 'Skills', 'Contact'];
  
  return (
    <div className="home">
      <Navbar />
      <HeroSection />

      <ParticlesBackground />

      {sections.map((title, index) => (
        <Section key={index} title={title} index={index} />
      ))}
    </div>
  );
};

export default Home;