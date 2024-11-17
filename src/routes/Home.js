import React, { useEffect } from 'react';
import Navbar from '../components/Nav/Navbar';
import HeroSection from '../components/Hero/HeroSection';
import ExperiencesSection from '../components/Experiences/ExperiencesSection';
import ListeningSection from '../components/Listening/ListeningSection';
import ProjectsSection from '../components/Projects/ProjectsSection';
import SkillsSection from '../components/Skills/SkillsSection';

const Home = () => {
  return (
    <div id="app" data-theme="dark">
      <div className='scrollSnap'>
        <HeroSection />
        <ExperiencesSection />
        <ProjectsSection />
        <SkillsSection />
        <ListeningSection />
      </div>
    </div>
  );
};

export default Home;