import React from 'react'
import { AnimatePresence, motion } from 'framer-motion';
import "./ProjectsSection.css"


const ProjectsSection = () => {
  return (
    <div className="projects-section snapDiv" id="projects">
      <div className='widthBig flexCol'>
        <motion.h1>Projects</motion.h1>
      </div>
    </div>
  )
}

export default ProjectsSection