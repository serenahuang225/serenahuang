import React from 'react'
import { AnimatePresence, motion } from 'framer-motion';
import "./ProjectsSection.css"
import brain from './brain.png'
import paint from './painting.png'
import livelyfbla from './livelyfbla.png'
import anchor from './anchor.png'

const ProjectsSection = () => {
  const bests = [
    {link: "https://github.com/serenahuang225/brain-model", imagy: <motion.img initial={{scale:1}} whileHover={{scale:1.1}} className='projImage' src={brain} alt="brain project" />},
    {link: "https://github.com/imemilyhuang/fbla-lively-website", imagy: <motion.img initial={{scale:1}} whileHover={{scale:1.1}} className='projImage' src={livelyfbla} alt="lively fbla project" />},
    {link: "https://github.com/serenahuang225/famous-painting-stylizer?tab=readme-ov-file", imagy: <motion.img initial={{scale:1}} whileHover={{scale:1.1}} className='projImage' src={paint} alt="painting project" />},
    {link: "https://github.com/serenahuang225/anchor", imagy: <motion.img initial={{scale:1}} whileHover={{scale:1.1}} className='projImage' src={anchor} alt="painting project" />},
  ]
  return (
    <div className="projects-section snapDiv" id="projects">
      <div className='widthBig flexCol'>
        <motion.h1>Projects</motion.h1>
        <motion.p>Some of my best works</motion.p>
        <div>
          {
            bests.map(item => <motion.a
              rel="noreferrer noopener"
              target="_blank" href={item.link}
              initial={{opacity: 0.5}}
              whileHover={{opacity: 1}}
              className='noLink'>
              {item.imagy}
            </motion.a>)
          }
        </div>
      </div>
    </div>
  )
}

export default ProjectsSection