import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import Section from '../components/Section';
import Navbar from '../components/Nav/Navbar';
import HeroSection from '../components/Hero/HeroSection';
import blob from './blob.gif'
import Intro from '../components/Intro/Intro';
import AudioButton from '../components/AudioButton/AudioButton';

const Home = () => {
  const sections = ['intro', 'projects', 'skills', 'contact'];

  return (
    <div id="app" data-theme="dark">
      <div className='scrollSnap'>
        <HeroSection />
        <div className='maxWidth snapDiv'>
        </div>
        {sections.map((title, index) => (
          <Section key={index} title={title} index={index} />
        ))}
      </div>
    </div>
  );
};

export default Home;