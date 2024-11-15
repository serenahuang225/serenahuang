import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import Section from '../components/Section';
import Navbar from '../components/Nav/Navbar';
import HeroSection from '../components/Hero/HeroSection';
import blob from './blob.gif'
import Intro from '../components/Intro/Intro';
import AudioButton from '../components/AudioButton/AudioButton';

const Home = () => {
  const sections = ['Intro', 'Projects', 'Skills', 'Contact'];
  
  return (
    <div id="app" data-theme="dark">
      <div className='scrollSnap'>
        <div className='maxWidth'>
          <div>
            <AudioButton />
          </div>
        </div>
        {sections.map((title, index) => (
          <Section key={index} title={title} index={index} />
        ))}
      </div>
      <section>
        <img src={blob} style={{height: 300, width: 300}} />
      </section>

    </div>
  );
};

export default Home;