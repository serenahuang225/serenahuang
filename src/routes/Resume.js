import React from 'react'
import Switch from '../components/Switch'

const Resume = () => {
  return (
    <div id="app" data-theme="dark">
      <div className='maxWidth'>
        <Switch />
        <h1>Serena Huang</h1>
        <p>St. Louis, MO | (314) 901-1516 | <a href="mailto:serenahuang225@gmail.com">serenahuang225@gmail.com</a> | <a href="https://github.com/serenahuang225">GitHub</a> | <a href="https://www.linkedin.com/in/serenahuang225/">LinkedIn</a></p>

        <h2>EDUCATION</h2>
        <h3>Parkway Central High School, Chesterfield, MO</h3>
        <p>High School Diploma, Class of 2026</p>
        <ul>
          <li>GPA: 4.655 Weighted, 4.0/4.0 Unweighted | ACT: 35</li>
          <li>Relevant Coursework: AP Computer Science A, Honors Multivariable Calculus, AP Calculus BC, AP Statistics, AP Physics 1 & 2</li>
        </ul>

        <h2>RELEVANT EXPERIENCE</h2>

        <h3>Bubbly Studios, St. Louis, MO</h3>
        <p>Co-Founder & Lead Software Developer, Feb 2022 - Present</p>
        <ul>
          <li>Created an iOS productivity app featuring dynamic calendars, mood tracking, and social event planning</li>
          <li>Created Lively, an iOS app for productivity and social interaction that allows users to connect with friends and create personalized calendars, to-do lists, and journal entries</li>
          <li>Developed custom UI components (infinite pager, bottom sheet) with React Native Gesture Handler and Reanimated</li>
          <li>Implemented real-time notifications and friend syncing via Firebase on an Express.js server hosted on Render</li>
          <li>Earned 1st Place in the 2022-23 Congressional App Challenge with app achieving 700+ downloads and 10K+ monthly interactions</li>
        </ul>

        <h3>NASA & UT Austin's Center for Space Research, Austin, TX</h3>
        <p>Aerospace Engineer Intern, May 2024 - Aug 2024</p>
        <ul>
          <li>Chosen as 1 of 50 rising juniors in the nation for the STEM Enhancement in Earth Science (SEES) internship</li>
          <li>Developed an in-situ resource utilization system for lunar exploration and resource mining, including a solar-powered winch-pulley system, wireless power transfer, and in-situ toboggan creation, advancing NASA's Artemis mission</li>
          <li>Utilized the ZQube system and machine learning (k-means clustering and cosine similarity) to analyze regolith in microgravity, exploring the potential of various regoliths to be used as building materials</li>
          <li>Authored a research proposal studying the effects of astronaut drugs on brain organoids in Zero-G on a parabolic flight</li>
          <li>Applied data analysis techniques to NASA satellite data, determining star radial velocities after redshifts, creating histogram distributions, detailed surface temperature trends, and dispersion maps of the Andromeda Galaxy's star types</li>
        </ul>

        <h3>Ariel Premium Supply, St. Louis, MO</h3>
        <p>Software Engineer Intern, Jun 2023 - Aug 2023</p>
        <ul>
          <li>Created a React Native iOS app to scan misprinted and discarded promotional products with OCR and the USPTO's Trademark Status & Document Retrieval API</li>
          <li>Developed neural network clustering in PyTorch using EfficientNet transfer learning with a trademark dataset of over 10K self-collected data points</li>
        </ul>
        <p>Software Engineer Intern, Jun 2022 - Aug 2022</p>
        <ul>
          <li>Used Google Maps API, SERP API, and Selenium Web Scraper to collect and process 600+ data entries daily of Ariel client information</li>
          <li>Automated program execution and notification emails using Python and Linux cron jobs, cutting manual search time by 15 hours per week and eliminating annual business costs of $12K+</li>
          <li>Developed a business industry search tool with a React.js frontend and PHP backend, using SQL and Pandas to clean product order data, then implementing visualization tools and market trend reports</li>
          <li>Implemented spaCy to create a program that redacts personal information from PDFs, text documents, and images</li>
        </ul>

        <h2>LEADERSHIP & EXTRACURRICULARS</h2>

        <h3>Future Business Leaders of America, Chesterfield, MO</h3>
        <p>Chapter President, Aug 2022 - Present</p>
        <ul>
          <li>Directed chapter activities, resulting in achieving Champion Chapter of the Year status for 2 consecutive seasons</li>
          <li>Secured 3 key sponsorships and led recruitment initiatives that increased chapter membership by 66%</li>
          <li>Organized and executed biweekly meetings, study sessions, and fundraising events for 50+ student members</li>
        </ul>

        <h3>Dance Marathon, Chesterfield, MO</h3>
        <p>Sponsorships Executive Committee Chair, Aug 2022 - Present</p>
        <ul>
          <li>Spearheaded fundraising initiatives that raised a total of $34K, providing critical support to cancer patients in local hospitals</li>
          <li>Managed logistics and coordination of food catering for the final 4-hour event with over 200 attendees</li>
          <li>Led outreach efforts to 200 local businesses, securing 56 sponsorships that bolstered event funding and community engagement</li>
        </ul>

        <h3>Parkway Central Speech & Debate, Chesterfield, MO</h3>
        <p>Team Captain, Varsity LD Debater & Oratory Speaker, Aug 2022 - Present</p>
        <ul>
          <li>Led weekly coaching sessions for a team of 10 public speakers, focused on writing robust content and building strong presentation skills</li>
          <li>Conducted in-depth research on global and domestic issues to prepare for competitive debates, developing effective rebuttal strategies</li>
          <li>Organized and coordinated a large-scale tournament with over 350 participants, managing logistics, schedules, and communication with judges and teams</li>
        </ul>

        <h3>St. Louis All-Suburban Orchestra, Parkway Central Symphonic Orchestra, West County Strings, Chesterfield, MO</h3>
        <p>First Violinist & Soloist, Aug 2014 - Present</p>
        <ul>
          <li>Auditioned into the Parkway Central Symphonic Orchestra and St. Louis All-Suburban Orchestra</li>
          <li>Performed in 10 concerts and festivals annually and achieved gold ratings at the All-State Music Festival for 2 consecutive years</li>
          <li>Built over 10 years of experience playing the violin</li>
        </ul>

        <h3>Parkway Swim Club & Parkway Central High School Varsity Swim Team, Chesterfield, MO</h3>
        <p>All-State & Varsity, Aug 2013 - Present</p>
        <ul>
          <li>Competed as part of the Parkway Swim Club, a nationally competitive swim team, and achieved All-State honors, 2x finalist recognition, and 2nd Place in the 200 Free Relay at the Missouri State High School Girls' Swimming & Diving Championships</li>
          <li>Qualified for Speedo Sectionals and placed 5th at the COMO Invitational at the Mizzou Aquatic Center</li>
        </ul>

        <h2>HONORS & AWARDS</h2>
        <ul>
          <li>Aspirations in Computing Affiliate Winner - National Center for Women & Information Technology, 2024</li>
          <li>3x National Qualifier, 2x State Champion in UX Design and Mobile App Development, State Runner-Up in Cybersecurity, Website Design State Finalist, 2023-2024</li>
          <li>Missouri All-State Swimmer, Speedo Summer Sectionals Qualifier, Parkway Swim Club National Team, 2023-2024</li>
          <li>2x 1st Place Winner in the Congressional App Challenge, Student Presenter at #HouseOfCode Event, 2022-2023</li>
        </ul>

        <h2>TECHNICAL SKILLS & CERTIFICATIONS</h2>
        <ul>
          <li>Languages: Python, Java, JavaScript, TypeScript, C++, SQL, HTML/CSS</li>
          <li>Frameworks & Technologies: PyTorch, TensorFlow, Scikit-Learn, Matplotlib, Pandas, NumPy, React, Flask, Tableau, Git, Figma</li>
          <li>Certifications: <a href='https://coursera.org/share/d8236540e5ddde532d7bda0ac8ef51ff'>Machine Learning (Stanford & DeepLearning.AI)</a>, <a href='https://courses.edx.org/certificates/abeae55c189948ea9e7764c918df1640'>CS50's Introduction to Computer Science (HarvardX)</a></li>
        </ul>
      </div>
    </div>
  )
}

export default Resume