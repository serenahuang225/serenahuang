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
  const [itemSize, setItemSize] = useState(36)
  const {width, _} = useDimensions()
  useEffect(()=>{
    if (width<800) {
      setItemSize(24)
    }
  }, [width])

  const languagesData = [
    {name: "Python", icon: <FaPython size={itemSize} /> },
    {name: "Java", icon: <FaJava size={itemSize} /> },
    {name: "JavaScript", icon: <SiJavascript size={itemSize} /> },
    {name: "TypeScript", icon: <SiTypescript size={itemSize} /> },
    {name: "C++", icon: <TbBrandCpp size={itemSize} /> },
    {name: "SQL", icon: <GrMysql size={itemSize} /> },
    {name: "HTML", icon: <FaHtml5 size={itemSize} /> },
    {name: "CSS", icon: <FaCss3Alt size={itemSize} /> },
    {name: "Swift", icon: <FaSwift size={itemSize} /> },
    {name: "PHP", icon: <FaPhp size={itemSize} /> },
  ]

  const fmntData = [
    {name: "PyTorch", icon: <SiPytorch size={itemSize} />},
    {name: "TensorFlow", icon: <SiTensorflow size={itemSize} />},
    {name: "Scikit-Learn", icon: <SiScikitlearn size={itemSize} />},
    {name: "Pandas", icon: <SiPandas size={itemSize} />},
    {name: "NumPy", icon: <SiNumpy size={itemSize} />},
    {name: "React.js", icon: <FaReact size={itemSize} />},
    {name: "React Native", icon: <FaReact size={itemSize} />},
    {name: "Next.js", icon: <SiNextdotjs size={itemSize} />},
    {name: "TailwindCSS", icon: <SiTailwindcss size={itemSize} />},
    {name: "Git", icon: <FaGitAlt size={itemSize} />},
    {name: "Linux", icon: <FaLinux size={itemSize} />},
    {name: "Firebase", icon: <IoLogoFirebase size={itemSize} />},
    {name: "AWS", icon: <FaAws size={itemSize} />},
    {name: "Streamlit", icon: <SiStreamlit size={itemSize} />},
    {name: "Flask", icon: <SiFlask size={itemSize} />},
    {name: "Selenium", icon: <SiSelenium size={itemSize} />},
    {name: "Blender", icon: <SiBlender size={itemSize} />},
    {name: "Tableau", icon: <SiTableau size={itemSize} />},
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
              certifications.map(item => <li className='certContainer'>
                <a style={{gap: "0.5rem"}} className='flexRow noLink alignCenter' rel="noreferrer noopener" target="_blank" href={item.link} key={item.name}>
                  {width>800 && item.imagey}
                <p><b>{item.name}</b>: <br></br> {item.provider}</p>
              </a></li>)
            }
          </ul>
        </div>
      </div>
    </div>
  )
}

export default SkillsSection