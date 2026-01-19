import React from 'react'
import "./ContactSection.css"
import { FaLinkedin, FaGithub, FaEnvelope, FaPhone } from 'react-icons/fa6';

const ContactSection = () => {
  return (
    <div className="contact-section" id="contact">
      <div className='widthBig'>
        <img 
          src="/profile.jpg" 
          alt="Profile" 
          className="profile-picture" 
        />
        <h2>
          Serena Huang
        </h2>
        
        <div className='contact-cards'>
          <div className="contact-card">
            <FaEnvelope className="contact-icon" size={28} color="#161616" />
            <div className='contact-text'>
              <p className='bold'>Email</p>
              <p className='small'><a href="mailto:serenahuang225@gmail.com">serenahuang225@gmail.com</a></p>
            </div>
          </div>
          <div className="contact-card">
            <FaPhone className="contact-icon" size={28} color="#161616" />
            <div className='contact-text'>
              <p className='bold'>Phone</p>
              <p className='small'><a href="tel:3149011516">314-901-1516</a></p>
            </div>
          </div>
        </div>

        <div className='flexRow'>
          <a href="https://github.com/serenahuang225" target="_blank" rel="noopener noreferrer">
            <FaGithub size={28} color="#161616" />
          </a>
          <a href="https://www.linkedin.com/in/serenahuang225/" target="_blank" rel="noopener noreferrer">
            <FaLinkedin size={28} color="#161616" />
          </a>
        </div>
      </div>
    </div>
  )
}

export default ContactSection