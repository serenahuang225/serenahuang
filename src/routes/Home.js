import React, { useEffect } from 'react';
import Navbar from '../components/Nav/Navbar';
import HeroSection from '../components/Hero/HeroSection';
import ExperiencesSection from '../components/Experiences/ExperiencesSection';
import ListeningSection from '../components/Listening/ListeningSection';
import ProjectsSection from '../components/Projects/ProjectsSection';
import SkillsSection from '../components/Skills/SkillsSection';
import ContactSection from '../components/Contact/ContactSection';

const Home = () => {
  return (
    <div id="app" data-theme="dark">
      <Navbar />
      <HeroSection />
      <ExperiencesSection />
      <SkillsSection />
      <ProjectsSection />
      <ContactSection />
      <ListeningSection />
    </div>
  );
};

export default Home;