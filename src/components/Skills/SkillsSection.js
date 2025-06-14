import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion';
import "./SkillsSection.css"
import { FaPython, FaJava, FaHtml5, FaCss3Alt, FaSwift, FaPhp, FaReact, FaGitAlt, FaLinux, FaAws } from "react-icons/fa";
import { SiJavascript, SiTypescript, SiPytorch, SiTensorflow, SiScikitlearn, SiPandas, SiNumpy, SiNextdotjs, SiTailwindcss, SiStreamlit, SiFlask, SiSelenium, SiBlender, SiTableau } from "react-icons/si";
import { TbBrandCpp } from "react-icons/tb";
import { GrMysql } from "react-icons/gr";
import { IoLogoFirebase } from 'react-icons/io5';

import ml from './ml.png'
import csfifty from './cs50.png'
import useDimensions from '../../utils/useDimensions';

const SkillsSection = () => {
  const [itemSize, setItemSize] = useState(30)
  const {width, _} = useDimensions()
  useEffect(()=>{
    if (width<800) {
      setItemSize(20)
    }
  }, [width])

  const frontendSkills = [
    {name: "JavaScript", icon: <SiJavascript size={itemSize} /> },
    {name: "TypeScript", icon: <SiTypescript size={itemSize} /> },
    {name: "React Native", icon: <FaReact size={itemSize} /> },
    {name: "React.js", icon: <FaReact size={itemSize} /> },
    {name: "Next.js", icon: <SiNextdotjs size={itemSize} /> },
    {name: "HTML", icon: <FaHtml5 size={itemSize} /> },
    {name: "CSS", icon: <FaCss3Alt size={itemSize} /> },
    {name: "TailwindCSS", icon: <SiTailwindcss size={itemSize} /> },
    {name: "Swift", icon: <FaSwift size={itemSize} /> },
  ]

  const backendSkills = [
    {name: "Python", icon: <FaPython size={itemSize} /> },
    {name: "Java", icon: <FaJava size={itemSize} /> },
    {name: "C++", icon: <TbBrandCpp size={itemSize} /> },
    {name: "SQL", icon: <GrMysql size={itemSize} /> },
    {name: "PHP", icon: <FaPhp size={itemSize} /> },
    {name: "Firebase", icon: <IoLogoFirebase size={itemSize} /> },
    {name: "AWS", icon: <FaAws size={itemSize} /> },
    {name: "Linux", icon: <FaLinux size={itemSize} /> },
    {name: "Git", icon: <FaGitAlt size={itemSize} /> },
    {name: "Flask", icon: <SiFlask size={itemSize} /> },
    {name: "Streamlit", icon: <SiStreamlit size={itemSize} /> },
    {name: "Selenium", icon: <SiSelenium size={itemSize} /> },
  ]

  const dataScienceSkills = [
    {name: "PyTorch", icon: <SiPytorch size={itemSize} />},
    {name: "TensorFlow", icon: <SiTensorflow size={itemSize} />},
    {name: "Scikit-Learn", icon: <SiScikitlearn size={itemSize} />},
    {name: "Pandas", icon: <SiPandas size={itemSize} />},
    {name: "NumPy", icon: <SiNumpy size={itemSize} />},
    {name: "Tableau", icon: <SiTableau size={itemSize} />},
    {name: "Blender", icon: <SiBlender size={itemSize} />},
  ]

  const certifications = [
    {name: "Machine Learning",provider:"Stanford Online & DeepLearning.AI",link:"https://coursera.org/share/d8236540e5ddde532d7bda0ac8ef51ff", imagey: <img className='certImg' src={ml} alt="cs50 certificate" />},
    {name: "CS50's Intro to Computer Science",provider:"HarvardX",link:"https://courses.edx.org/certificates/abeae55c189948ea9e7764c918df1640", imagey: <img className='certImg' src={csfifty} alt="cs50 certificate" />},
  ]

  return (
    <div className="skills-section" id="about">
      <div className='widthBig flexCol'>
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          Who am I?
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          I'm a high school student who loves to build things that make a difference.
        </motion.p>
        
        <div className='skills-cards-container'>
          <motion.div 
            className='skill-card cardContainer'
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
          >
            <h3>Front-end Development</h3>
            <p>Expert in modern web technologies, crafting responsive and high-performance websites with the latest frameworks and tools.</p>
            <ul className='flexRow' style={{listStyleType: 'none'}}>
              {frontendSkills.map(item => (
                <motion.li 
                  className='skillBlock flexRow alignCenter' 
                  key={item.name}
                  whileHover={{ scale: 1.1 }}
                  transition={{ type: "easeInOut", stiffness: 400, damping: 10 }}
                >
                  <div className="skill-icon">
                    {item.icon}
                    <span className="skill-name">{item.name}</span>
                  </div>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          <motion.div 
            className='skill-card cardContainer'
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
            <h3>Back-end Development</h3>
            <p>Proficient in multiple programming languages and cloud services, building robust and scalable applications.</p>
            <ul className='flexRow' style={{listStyleType: 'none'}}>
              {backendSkills.map(item => (
                <motion.li 
                  className='skillBlock flexRow alignCenter' 
                  key={item.name}
                  whileHover={{ scale: 1.1 }}
                  transition={{ type: "easeInOut", stiffness: 400, damping: 10 }}
                >
                  <div className="skill-icon">
                    {item.icon}
                    <span className="skill-name">{item.name}</span>
                  </div>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          <motion.div 
            className='skill-card cardContainer'
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.6 }}
          >
            <h3>Data Science & AI</h3>
            <p>Skilled in machine learning frameworks and data analysis tools, creating intelligent solutions and visualizations.</p>
            <ul className='flexRow' style={{listStyleType: 'none'}}>
              {dataScienceSkills.map(item => (
                <motion.li 
                  className='skillBlock flexRow alignCenter' 
                  key={item.name}
                  whileHover={{ scale: 1.1 }}
                  transition={{ type: "easeInOut", stiffness: 400, damping: 10 }}
                >
                  <div className="skill-icon">
                    {item.icon}
                    <span className="skill-name">{item.name}</span>
                  </div>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>

        <motion.div 
          className='certifications-container'
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.6 }}
        >
          <h3>Certifications</h3>
          <ul className='flexRow' style={{listStyleType: 'none'}}>
            {certifications.map(item => (
              <motion.li 
                className='cardContainer certCard'
                key={item.name}
                whileHover={{ scale: 1.05 }}
                transition={{ type: "easeInOut", stiffness: 400, damping: 10 }}
              >
                <a style={{gap: "1rem"}} className='flexRow noLink alignCenter' rel="noreferrer noopener" target="_blank" href={item.link}>
                  {width>800 && item.imagey}
                  <p><b>{item.name}</b>: <br></br> {item.provider}</p>
                </a>
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </div>
    </div>
  )
}

export default SkillsSection