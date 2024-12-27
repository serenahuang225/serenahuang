import React from 'react'

import { motion } from 'framer-motion';
import "./SkillsSection.css"
import { FaPython, FaJava, FaHtml5, FaCss3Alt, FaSwift, FaPhp, FaReact, FaGitAlt, FaLinux, FaAws } from "react-icons/fa";
import { SiJavascript, SiTypescript, SiPytorch, SiTensorflow, SiScikitlearn, SiPandas, SiNumpy, SiNextdotjs, SiTailwindcss, SiStreamlit, SiFlask, SiSelenium, SiBlender, SiTableau } from "react-icons/si";
import { TbBrandCpp } from "react-icons/tb";
import { GrMysql } from "react-icons/gr";
import { IoLogoFirebase } from 'react-icons/io5';

import ml from './ml.png'
import csfifty from './cs50.png'

const SkillsSection = () => {
  const languagesData = [
    {name: "Python", icon: <FaPython size={36} /> },
    {name: "Java", icon: <FaJava size={36} /> },
    {name: "JavaScript", icon: <SiJavascript size={36} /> },
    {name: "TypeScript", icon: <SiTypescript size={36} /> },
    {name: "C++", icon: <TbBrandCpp size={36} /> },
    {name: "SQL", icon: <GrMysql size={36} /> },
    {name: "HTML", icon: <FaHtml5 size={36} /> },
    {name: "CSS", icon: <FaCss3Alt size={36} /> },
    {name: "Swift", icon: <FaSwift size={36} /> },
    {name: "PHP", icon: <FaPhp size={36} /> },
  ]

  const fmntData = [
    {name: "PyTorch", icon: <SiPytorch size={36} />},
    {name: "TensorFlow", icon: <SiTensorflow size={36} />},
    {name: "Scikit-Learn", icon: <SiScikitlearn size={36} />},
    {name: "Pandas", icon: <SiPandas size={36} />},
    {name: "NumPy", icon: <SiNumpy size={36} />},
    {name: "React.js", icon: <FaReact size={36} />},
    {name: "React Native", icon: <FaReact size={36} />},
    {name: "Next.js", icon: <SiNextdotjs size={36} />},
    {name: "TailwindCSS", icon: <SiTailwindcss size={36} />},
    {name: "Git", icon: <FaGitAlt size={36} />},
    {name: "Linux", icon: <FaLinux size={36} />},
    {name: "Firebase", icon: <IoLogoFirebase size={36} />},
    {name: "AWS", icon: <FaAws size={36} />},
    {name: "Streamlit", icon: <SiStreamlit size={36} />},
    {name: "Flask", icon: <SiFlask size={36} />},
    {name: "Selenium", icon: <SiSelenium size={36} />},
    {name: "Blender", icon: <SiBlender size={36} />},
    {name: "Tableau", icon: <SiTableau size={36} />},
  ]

  const certifications = [
    {name: "Machine Learning",provider:"Stanford Online & DeepLearning.AI",link:"https://coursera.org/share/d8236540e5ddde532d7bda0ac8ef51ff", imagey: <img className='certImg' src={ml} alt="cs50 certificate" />},
    {name: "CS50's Intro to Computer Science",provider:"HarvardX",link:"https://courses.edx.org/certificates/abeae55c189948ea9e7764c918df1640", imagey: <img className='certImg' src={csfifty} alt="cs50 certificate" />},
  ]

  return (
    <div className="skills-section snapDiv" id="projects">
      <div className='widthBig flexCol'>
        <motion.h1>Skills</motion.h1>
        <div className='flexCol alignCenter'>
          <h3>Languages</h3>
          <ul className='flexRow' style={{listStyleType: 'none'}}>
            {
              languagesData.map(item => <li className='skillBlock flexRow alignCenter' key={item.name}>{item.icon} {item.name}</li>)
            }
          </ul>
          <h3>Frameworks and Technologies</h3>
          <ul className='flexRow' style={{listStyleType: 'none'}}>
            {
              fmntData.map(item => <li className='skillBlock flexRow alignCenter' key={item.name}>{item.icon} {item.name}</li>)
            }
          </ul>
          <h3>Certifications</h3>
          <ul className='flexRow' style={{listStyleType: 'none'}}>
            {
              certifications.map(item => <li className='certContainer'><a style={{gap: "0.5rem"}} className='flexRow noLink alignCenter' rel="noreferrer noopener" target="_blank" href={item.link} key={item.name}>{item.imagey}
              <p><b>{item.name}</b>: <br></br> {item.provider}</p></a></li>)
            }
          </ul>
        </div>
      </div>
    </div>
  )
}

export default SkillsSection