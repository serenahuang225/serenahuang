import React from 'react'
import { motion } from 'framer-motion';
import "./ContactSection.css"
import { FaLinkedin, FaGithub, FaEnvelope, FaPhone } from 'react-icons/fa6';

const ContactSection = () => {
  return (
    <div className="contact-section" id="contact">
      <div className='widthBig'>
        <motion.img 
          initial={{ scale: 0.8, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          src="/profile.jpg" 
          alt="Profile" 
          className="profile-picture" 
        />
        <motion.h2
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          Serena Huang
        </motion.h2>
        
        <motion.div 
          className='contact-cards'
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <div className="contact-card">
            <FaEnvelope className="contact-icon" size={28} />
            <p className='bold'>Email</p>
            <p className='small'><a href="mailto:serenahuang225@gmail.com">serenahuang225@gmail.com</a></p>
          </div>
          <div className="contact-card">
            <FaPhone className="contact-icon" size={28} />
            <p className='bold'>Phone</p>
            <p className='small'><a href="tel:3149011516">314-901-1516</a></p>
          </div>
        </motion.div>

        <motion.div 
          className='flexRow'
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <a href="https://github.com/serenahuang225" target="_blank" rel="noopener noreferrer">
            <FaGithub size={28} />
          </a>
          <a href="https://www.linkedin.com/in/serenahuang225/" target="_blank" rel="noopener noreferrer">
            <FaLinkedin size={28} />
          </a>
        </motion.div>
      </div>
    </div>
  )
}

export default ContactSection