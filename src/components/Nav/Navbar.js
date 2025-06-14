import React from 'react';
import { motion } from 'framer-motion';
import { FaHouse, FaUser, FaBriefcase, FaEnvelope, FaMusic, FaFolderClosed } from 'react-icons/fa6';
import './Navbar.css';

const Navbar = () => {
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <motion.nav 
      className="navbar"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="navbar-content widthBig">
        <div className="profile-part">
          <img src="/profile.jpg" alt="Profile" className="profile-picture" />
        </div>
        
        <div className="nav-links">
          <button onClick={() => scrollToSection('hero')} className="displayNone nav-link">
            <FaHouse size={24} />
            <span>Home</span>
          </button>
          <button onClick={() => scrollToSection('about')} className="nav-link">
            <FaUser size={24} />
            <span>About</span>
          </button>
          <button onClick={() => scrollToSection('projects')} className="nav-link">
            <FaBriefcase size={24} />
            <span>Projects</span>
          </button>
          <button onClick={() => scrollToSection('experience')} className="nav-link">
            <FaFolderClosed size={24} />
            <span>Experience</span>
          </button>
          <button onClick={() => scrollToSection('contact')} className="nav-link">
            <FaEnvelope size={24} />
            <span>Contact</span>
          </button>
          <button onClick={() => scrollToSection('music')} className="nav-link">
            <FaMusic size={24} />
            <span>Music</span>
          </button>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;

