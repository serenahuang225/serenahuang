import React from 'react';
import { FaHouse, FaBook, FaBriefcase, FaEnvelope, FaMusic, FaFolderClosed } from 'react-icons/fa6';
import './Navbar.css';

const Navbar = () => {
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-content widthBig">
        <div className="profile-part">
          <img src="/profile.jpg" alt="Profile" className="profile-picture" />
        </div>
        
        <div className="nav-links">
          <button onClick={() => scrollToSection('hero')} className="displayNone nav-link">
            <FaHouse size={24} color="#161616" />
            <span>Home</span>
          </button>
          <button onClick={() => scrollToSection('projects')} className="nav-link">
            <FaFolderClosed size={24} color="#161616" />
            <span>Projects</span>
          </button>
          <button onClick={() => scrollToSection('about')} className="nav-link">
            <FaBook size={24} color="#161616" />
            <span>Skills</span>
          </button>
          <button onClick={() => scrollToSection('experience')} className="nav-link">
            <FaBriefcase size={24} color="#161616" />
            <span>Experience</span>
          </button>
          <button onClick={() => scrollToSection('music')} className="nav-link">
            <FaMusic size={24} color="#161616" />
            <span>Music</span>
          </button>
          <button onClick={() => scrollToSection('contact')} className="nav-link">
            <FaEnvelope size={24} color="#161616" />
            <span>Contact</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

