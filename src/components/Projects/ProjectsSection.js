import React from 'react'
import { motion } from 'framer-motion';
import "./ProjectsSection.css"
import brain from './brain.png'
import paint from './painting.png'
import livelyfbla from './livelyfbla.png'
import anchor from './anchor.png'
import AnimatedButton from '../Hero/AnimatedButton'

const ProjectsSection = () => {
  const bests = [
    {link: "https://github.com/serenahuang225/brain-model", imagy: <motion.img initial={{scale:1}} whileHover={{scale:1.03}} className='projImage' src={brain} alt="brain project" />},
    {link: "https://github.com/imemilyhuang/fbla-lively-website", imagy: <motion.img initial={{scale:1}} whileHover={{scale:1.03}} className='projImage' src={livelyfbla} alt="lively fbla project" />},
    {link: "https://github.com/serenahuang225/famous-painting-stylizer?tab=readme-ov-file", imagy: <motion.img initial={{scale:1}} whileHover={{scale:1.03}} className='projImage' src={paint} alt="painting project" />},
    {link: "https://github.com/serenahuang225/anchor", imagy: <motion.img initial={{scale:1}} whileHover={{scale:1.03}} className='projImage' src={anchor} alt="painting project" />},
  ]
  return (
    <div className="projects-section" id="projects">
      <div className='widthBig flexCol alignCenter justifyCenter'>
        <motion.h2>Projects</motion.h2>
        <motion.p style={{marginBottom: '1.5rem'}}>Some of my best works</motion.p>
        <div style={{marginBottom: '1.5rem'}} className='experienceGrid'>
          {
            bests.map((item, index) => <motion.a
              rel="noreferrer noopener"
              target="_blank" href={item.link}
              initial={{opacity: 0, y: 20}}
              whileInView={{opacity: 1, y: 0}}
              viewport={{ once: true }}
              whileHover={{skewY: 1.03}}
              whileTap={{skewX: 1.03}}
              transition={{type: "tween", delay: 0.2 * index, duration: 0.6}}
              className='noLink'>
              {item.imagy}
            </motion.a>)
          }
        </div>
        <AnimatedButton message="EXPLORE MORE" link="https://github.com/serenahuang225" />
      </div>
    </div>
  )
}

export default ProjectsSection