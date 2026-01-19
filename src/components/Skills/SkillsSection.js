import React, { useEffect, useState } from 'react'
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
  const {width} = useDimensions()
  useEffect(()=>{
    if (width<800) {
      setItemSize(20)
    }
  }, [width])

  const frontendSkills = [
    {name: "JavaScript", icon: <SiJavascript size={itemSize} color="#161616" /> },
    {name: "TypeScript", icon: <SiTypescript size={itemSize} color="#161616" /> },
    {name: "React Native", icon: <FaReact size={itemSize} color="#161616" /> },
    {name: "React.js", icon: <FaReact size={itemSize} color="#161616" /> },
    {name: "Next.js", icon: <SiNextdotjs size={itemSize} color="#161616" /> },
    {name: "HTML", icon: <FaHtml5 size={itemSize} color="#161616" /> },
    {name: "CSS", icon: <FaCss3Alt size={itemSize} color="#161616" /> },
    {name: "TailwindCSS", icon: <SiTailwindcss size={itemSize} color="#161616" /> },
    {name: "Swift", icon: <FaSwift size={itemSize} color="#161616" /> },
  ]

  const backendSkills = [
    {name: "Python", icon: <FaPython size={itemSize} color="#161616" /> },
    {name: "Java", icon: <FaJava size={itemSize} color="#161616" /> },
    {name: "C++", icon: <TbBrandCpp size={itemSize} color="#161616" /> },
    {name: "SQL", icon: <GrMysql size={itemSize} color="#161616" /> },
    {name: "PHP", icon: <FaPhp size={itemSize} color="#161616" /> },
    {name: "Firebase", icon: <IoLogoFirebase size={itemSize} color="#161616" /> },
    {name: "AWS", icon: <FaAws size={itemSize} color="#161616" /> },
    {name: "Linux", icon: <FaLinux size={itemSize} color="#161616" /> },
    {name: "Git", icon: <FaGitAlt size={itemSize} color="#161616" /> },
    {name: "Flask", icon: <SiFlask size={itemSize} color="#161616" /> },
    {name: "Streamlit", icon: <SiStreamlit size={itemSize} color="#161616" /> },
    {name: "Selenium", icon: <SiSelenium size={itemSize} color="#161616" /> },
  ]

  const dataScienceSkills = [
    {name: "PyTorch", icon: <SiPytorch size={itemSize} color="#161616" />},
    {name: "TensorFlow", icon: <SiTensorflow size={itemSize} color="#161616" />},
    {name: "Scikit-Learn", icon: <SiScikitlearn size={itemSize} color="#161616" />},
    {name: "Pandas", icon: <SiPandas size={itemSize} color="#161616" />},
    {name: "NumPy", icon: <SiNumpy size={itemSize} color="#161616" />},
    {name: "Tableau", icon: <SiTableau size={itemSize} color="#161616" />},
    {name: "Blender", icon: <SiBlender size={itemSize} color="#161616" />},
  ]

  const certifications = [
    {name: "Machine Learning",provider:"Stanford Online & DeepLearning.AI",link:"https://coursera.org/share/d8236540e5ddde532d7bda0ac8ef51ff", imagey: <img className='certImg' src={ml} alt="cs50 certificate" />},
    {name: "CS50's Intro to Computer Science",provider:"HarvardX",link:"https://courses.edx.org/certificates/abeae55c189948ea9e7764c918df1640", imagey: <img className='certImg' src={csfifty} alt="cs50 certificate" />},
  ]

  return (
    <div className="skills-section" id="about">
      <div className='widthBig flexCol'>
        <h2> 
          Skills
        </h2>
        
        <div className='skills-cards-container'>
          <div className='skill-card cardContainer'>
            <h4>AI & Data Science</h4>
            <p className='small'>Skilled in machine learning and data analysis tools, creating intelligent models and visualizations.</p>
            <ul className='flexRow' style={{listStyleType: 'none'}}>
              {dataScienceSkills.map(item => (
                <li 
                  className='skillBlock flexRow alignCenter' 
                  key={item.name}
                >
                  <div className="skill-icon">
                    {item.icon}
                    <span className="skill-name">{item.name}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          
          <div className='skill-card cardContainer'>
            <h4>Frontend Development</h4>
            <p className='small'>Expert in modern app and web development frameworks and tools.</p>
            <ul className='flexRow' style={{listStyleType: 'none'}}>
              {frontendSkills.map(item => (
                <li 
                  className='skillBlock flexRow alignCenter' 
                  key={item.name}
                >
                  <div className="skill-icon">
                    {item.icon}
                    <span className="skill-name">{item.name}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className='skill-card cardContainer'>
            <h4>Backend Development</h4>
            <p className='small'>Proficient in multiple coding languages and cloud services.</p>
            <ul className='flexRow' style={{listStyleType: 'none'}}>
              {backendSkills.map(item => (
                <li 
                  className='skillBlock flexRow alignCenter' 
                  key={item.name}
                >
                  <div className="skill-icon">
                    {item.icon}
                    <span className="skill-name">{item.name}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className='certifications-container'>
          <h4>Certifications</h4>
          <ul className='flexRow' style={{listStyleType: 'none'}}>
            {certifications.map(item => (
              <li 
                className='cardContainer certCard'
                key={item.name}
              >
                <a style={{gap: "1rem"}} className='flexRow noLink alignCenter' rel="noreferrer noopener" target="_blank" href={item.link}>
                  {/* {width>800 && item.imagey} */}
                  <p className='small italic'><b>{item.name}</b>: <br></br> <span className='normal-italic'>{item.provider}</span></p>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

export default SkillsSection