import React from 'react'
import "./ProjectsSection.css"
import brain from './brain.png'
import paint from './painting.png'
import livelyfbla from './livelyfbla.png'
import anchor from './anchor.png'
import AnimatedButton from '../Hero/AnimatedButton'

const ProjectsSection = () => {
  const projects = [
    {
      title: "Brain Model",
      description: "A machine learning project that models brain activity patterns using neural networks and data analysis techniques.",
      link: "https://github.com/serenahuang225/brain-model",
      image: brain,
      alt: "brain project"
    },
    {
      title: "Lively FBLA Website",
      description: "A website for the Lively FBLA project, showcasing features and functionality of the productivity app.",
      link: "https://github.com/imemilyhuang/fbla-lively-website",
      image: livelyfbla,
      alt: "lively fbla project"
    },
    {
      title: "Famous Painting Stylizer",
      description: "An AI-powered tool that applies famous painting styles to user images using deep learning and computer vision.",
      link: "https://github.com/serenahuang225/famous-painting-stylizer?tab=readme-ov-file",
      image: paint,
      alt: "painting stylizer project"
    },
    {
      title: "Anchor",
      description: "A project management and organization tool designed to help users stay focused and productive.",
      link: "https://github.com/serenahuang225/anchor",
      image: anchor,
      alt: "anchor project"
    },
  ]
  
  return (
    <div className="projects-section" id="projects">
      <div className='widthBig flexCol'>
        <h2>Projects</h2>
        <p>Some of my best works</p>
        <div className='projects-list'>
          {
            projects.map((project, index) => (
              <div key={index} className='project-card'>
                <img className='projImage' src={project.image} alt={project.alt} />
                <div className='project-content'>
                  <h4 className='project-title'>
                    <a href={project.link} target="_blank" rel="noreferrer noopener" className='noLink'>
                      {project.title}
                    </a>
                  </h4>
                  <p className='project-description'>{project.description}</p>
                  <a href={project.link} target="_blank" rel="noreferrer noopener" className='project-link'>
                    View Project →
                  </a>
                </div>
              </div>
            ))
          }
        </div>
        <AnimatedButton message="EXPLORE MORE" link="https://github.com/serenahuang225" />
      </div>
    </div>
  )
}

export default ProjectsSection