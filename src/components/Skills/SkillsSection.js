import React from 'react'

import { AnimatePresence, motion } from 'framer-motion';
import "./SkillsSection.css"
import blob from './blob.gif'

const SkillsSection = () => {
  const languagesData = [
    {name: "Python"},
    {name: "Java"},
    {name: "JavaScript"},
    {name: "TypeScript"},
    {name: "C++"},
    {name: "SQL"},
    {name: "HTML"},
    {name: "CSS"},
    {name: "Swift"},
    {name: "C"},
    {name: "PHP"},
  ]

  const fmntData = [
    {name: "PyTorch"},
    {name: "TensorFlow"},
    {name: "scikit-learn"},
    {name: "pandas"},
    {name: "NumPy"},
    {name: "React.js"},
    {name: "React Native"},
    {name: "Next.js"},
    {name: "TailwindCSS"},
    {name: "Git"},
    {name: "Linux"},
    {name: "Firebase"},
    {name: "AWS"},
    {name: "Streamlit"},
    {name: "Flask"},
  ]

  const certifications = [
    {name: "Machine Learning",provider:"Stanford Online & DeepLearning.AI",link:"https://coursera.org/share/d8236540e5ddde532d7bda0ac8ef51ff"},
    {name: "CS50's Introduction to Computer Science",provider:"HarvardX",link:"https://courses.edx.org/certificates/abeae55c189948ea9e7764c918df1640"},

  ]

  return (
    <div className="skills-section snapDiv" id="projects">
      <div className='widthBig flexCol'>
        <motion.h1>Skills</motion.h1>
        <div className='flexRow alignCenter'>
          <ul style={{listStyleType: 'none'}}>
            <b>Languages</b>
            {
              languagesData.map(item => <li key={item.name}>{item.name}</li>)
            }
          </ul>
          <ul style={{listStyleType: 'none'}}>
            <b>Frameworks and Technologies</b>
            {
              fmntData.map(item => <li key={item.name}>{item.name}</li>)
            }
          </ul>
          <ul style={{listStyleType: 'none'}}>
            <b>Certifications</b>
            {
              certifications.map(item => <li key={item.name}>{item.name}</li>)
            }
          </ul>
          <img src={blob} style={{height: 300, width: 300}} />
        </div>
      </div>
    </div>
  )
}

export default SkillsSection