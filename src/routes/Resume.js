import React, { useState } from 'react'
import AudioButton from '../components/AudioButton/AudioButton'

const Resume = () => {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div id="app" data-theme="dark">
      <div className='widthBig flexCol pad2 resume'>
        <AudioButton isPlaying={isPlaying} setIsPlaying={setIsPlaying} />
        <h1>Serena Huang</h1>
        <p>(314) 901-1516 | <a rel="noreferrer noopener" target="_blank" href="mailto:serenahuang225@gmail.com">serenahuang225@gmail.com</a> | <a rel="noreferrer noopener" target="_blank" href="https://github.com/serenahuang225">github.com/serenahuang225</a> | <a rel="noreferrer noopener" target="_blank" href="https://www.linkedin.com/in/serenahuang225">linkedin.com/in/serenahuang225</a></p>

        <h2>EDUCATION</h2>
        <h3>Parkway Central High School	Chesterfield, MO</h3>
        <p>High School Diploma | GPA: 4.77/4.00 | ACT: 36/36 | SAT: 1560/1600	Expected May 2026</p>
        <p>Honors & Awards: NCWIT Aspirations in Computing National Winner (Top 40 of 2.7K+ Applicants), USACO Gold Division Competitor, National STEM Festival Finalist, 3x 1st Place Congressional App Challenge Winner, Girls Who Code Scholar</p>

        <h2>PROFESSIONAL EXPERIENCE</h2>

        <h3>Bear Studios Consulting Group	St. Louis, MO</h3>
        <p>Technology Consultant	Dec 2023 - Present</p>
        <ul>
          <li>Developed digital placemaking mobile app for 50+ local businesses using React Native, Express.js, SQL, and AWS, and integrated map APIs, live video stream, and sensor data to enhance real-time user experience</li>
          <li>Overhauled website using Figma and React.js for celebrity gift bag client featuring 50+ brand partners and 100+ A-list events with 30M+ viewers, including the Grammys, Emmys, and Dancing with the Stars</li>
        </ul>

        <h3>Stanford University	Stanford, CA</h3>
        <p>Section Leader, Code in Place Program	Apr 2025 - Jun 2025</p>
        <ul>
          <li>Selected from competitive global applicant pool to teach Python through Stanford's CS106A course to 40K+ learners</li>
          <li>Mentored 15 students in debugging and problem-solving during weekly discussion sections, and provided detailed code feedback</li>
        </ul>

        <h3>NASA & UT Austin's Center for Space Research	Austin, TX</h3>
        <p>Aerospace Research Intern, STEM Enhancement in Earth Science (SEES) Program	May 2024 - Aug 2024</p>
        <ul>
          <li>Applied k-means clustering and cosine similarity using NumPy and Scikit-Learn to compare 50+ terrestrial building materials, identifying Portland cement and brick as 93.5% matches to lunar basalt and regolith for Artemis mission planning</li>
          <li>Analyzed NASA astrophysical datasets to catalog 7.9K+ stars in Andromeda galaxy and generate velocity dispersion and temperature trend maps using NumPy and Matplotlib for galactic dynamics research</li>
          <li>Invited to present findings at American Geophysical Union's 2024 Annual Fall Meeting through Bright STaRs program</li>
        </ul>

        <h3>Ariel Premium Supply	St. Louis, MO</h3>
        <p>Software Engineer Intern	Jun 2023 - Aug 2023</p>
        <ul>
          <li>Applied transfer learning with EfficientNet in PyTorch to learn visually similarity embeddings of over 10K+ images collected from U.S. Patent & Trademark Office, detecting near-duplicate logos to flag potential trademark infringement</li>
          <li>Integrated learned representations  into production logo search pipeline with OCR, achieving 85% accuracy on validation data</li>
        </ul>
        <p>Software Engineer Intern	Jun 2022 - Aug 2022</p>
        <ul>
          <li>Built Selenium and Linux cron data pipeline scrape 600+ client records daily, saving 15+ hours per week and $12K+ annually</li>
          <li>Developed spaCy natural language processing (NLP) pipeline to redact personally identifiable information from PDFs, text, and images, ensuring legal compliance</li>
        </ul>

        <h2>PERSONAL PROJECTS</h2>

        <h3>AI Hydrological Modeling Research | PyTorch, Pandas, Matplotlib	<a rel="noreferrer noopener" target="_blank" href="https://github.com/serenahuang225/transformer-hydro-model">github.com/serenahuang225/transformer-hydro-model</a></h3>
        <ul>
          <li>Developed transformer-based rainfall prediction models with PyTorch and custom data loaders on CAMELS dataset covering 531 basins with 20-40 years of vegetation, topography, and soil data</li>
          <li>Benchmarked single-basin and multi-basin models, achieving Nash–Sutcliffe Efficiency score of 0.764 and outperforming LSTM baselines by 6%, classified as "Very Good" by hydrological modeling standards</li>
        </ul>

        <h3>Tunas Swim Meet Dashboard | Next.js, FastAPI, MCMC	<a rel="noreferrer noopener" target="_blank" href="https://github.com/serenahuang225/tunas-webapp-frontend">github.com/serenahuang225/tunas-webapp-frontend</a></h3>
        <ul>
          <li>Developed FastAPI backend hosted on Railway with Pydantic models and Markov Chain Monte Carlo (MCMC) simulator to analyze 800K+ race and relay outcomes for 1.2K+ USA Swimming clubs and 26K+ swimmers</li>
          <li>Built Next.js, TypeScript, and Recharts dashboard to visualize swimmer history, analytics, and relay optimization</li>
        </ul>

        <h3>Mock Operating System | C++	<a rel="noreferrer noopener" target="_blank" href="https://github.com/serenahuang225/mockos">github.com/serenahuang225/mockos</a></h3>
        <ul>
          <li>Implemented core file system operations (create, read, write, delete) using abstract base classes (AbstractFile) and concrete types (TextFile, ImageFile), and packaged operating system as static C++ library with CMake</li>
        </ul>

        <h3>Lively: Planner and Journal App | React Native, Express.js, Firebase, Figma	<a rel="noreferrer noopener" target="_blank" href="https://bubblystudios.com/lively">bubblystudios.com/lively</a></h3>
        <ul>
          <li>Created Lively, a React Native productivity app with dynamic calendars, mood tracking, live chat, and social event planning, scaling to 1K+ iOS App Store downloads and 10K+ monthly interactions</li>
          <li>Implemented real-time notifications and friend synchronization via Firebase on an Express.js server hosted on Render, and built custom UI components (infinite pager, bottom sheet) with React Native Gesture Handler and Reanimated</li>
        </ul>

        <h2>TECHNICAL SKILLS & CERTIFICATIONS</h2>
        <ul>
          <li>Languages: Python, C++, Java, SQL, JavaScript, Swift, HTML/CSS</li>
          <li>Frameworks & Technologies: PyTorch, TensorFlow, Scikit-Learn, Keras, Pandas, NumPy, Matplotlib, React, Git, Jira</li>
          <li>Certifications: Machine Learning & Intro to Statistical Learning (Stanford Online), CS50's Intro to Computer Science (HarvardX)</li>
        </ul>
      </div>
    </div>
  )
}

export default Resume