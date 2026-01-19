import React from 'react';
import './HeroSection.css';
import AnimatedButton from './AnimatedButton';
import { FaGithub, FaLinkedin } from 'react-icons/fa';

const HeroSection = () => {
  return (
    <div className="hero-section" id="hero">
      <div className='widthBig flexRowChange justifySpaceBetween alignCenter'>
        <div>
          <p className='nobold'>
            Hello there, I'm Serena!
          </p>
          <h1 className='nobold' style={{margin: '1rem 0'}}>
            Engineer, developer, and learner
          </h1>
          <p className='nobold' style={{margin: '1rem 0'}}>
            I like to build cool stuff.
          </p>
          <div className='flexRow alignCenter gapChange'>
            <AnimatedButton message="LET'S WORK TOGETHER" />
            <div className='flexRow alignCenter gapChangeSmall'>
              <a className='noLink' href="https://www.linkedin.com/in/serenahuang225/" rel="noreferrer noopener" target="_blank">
                <FaLinkedin size={36} color="#161616" />
              </a>
              <a className='noLink' href="https://github.com/serenahuang225" rel="noreferrer noopener" target="_blank">
                <FaGithub size={36} color="#161616" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
