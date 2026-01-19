import React from 'react'
import "./ExperiencesSection.css"

const ExperiencesSection = () => {
  const tabs = [
    { label: "Stanford Code in Place", icon: "", title: 'Section Leader', date: 'Apr 2025 - Jun 2025', sortDate: '2025-04',
      description: [
      "Selected from competitive global applicant pool to teach Python through Stanford’s CS106A course to 40K+ learners",
      "Mentored 15 students in debugging and problem-solving during weekly discussion sections, and provided detailed code feedback"
    ] },
    { label: "NASA SEES", icon: "", title: 'Aerospace Engineer Intern', date: 'May 2024 - Aug 2024', sortDate: '2024-05',
      description: [
      "Chosen as 1 of 50 rising juniors in the nation for the STEM Enhancement in Earth Science (SEES) internship",
      "Developed an in-situ resource utilization system for lunar exploration and resource mining, including a solar-powered winch-pulley system, wireless power transfer, and in-situ toboggan creation",
      "Utilized the ZQube system and machine learning (k-means clustering and cosine similarity) to analyze regolith in microgravity, exploring the potential of various regoliths to be used as building materials",
      "Authored a research proposal studying the effects of astronaut drugs on brain organoids in Zero-G on a parabolic flight",
      "Applied data analysis techniques to NASA satellite data, determining star radial velocities after redshifts, creating histogram distributions, surface temperature trends, and dispersion maps of the Andromeda Galaxy"
    ] },
    { label: "Bubbly Studios", icon: "", title: 'Co-Founder & Lead Software Developer', date: 'Feb 2022 - Present', sortDate: '2022-02',
      description: [
      "Created Lively, an iOS app for productivity and social interaction that allows users to connect with friends and create personalized calendars, to-do lists, and journal entries",
      "Developed custom UI components (infinite pager, bottom sheet) with React Native Gesture Handler and Reanimated",
      "Implemented real-time notifications and friend syncing via Firebase on an Express.js server hosted on Render",
      "Earned 1st Place in the 2022-23 Congressional App Challenge with app achieving 700+ downloads and 10K+ monthly interactions"
    ] },
    { label: "FBLA", icon: "", title: 'Chapter President', date: 'Aug 2022 - Present', sortDate: '2022-08',
      description: [
      "Directed chapter activities, resulting in achieving Champion Chapter of the Year status for 2 consecutive seasons",
      "Secured 3 key sponsorships and led recruitment initiatives that increased chapter membership by 66%",
      "Organized and executed biweekly meetings, study sessions, and fundraising events for 50+ student members"
    ] },
    { label: "Ariel", icon: "", title: 'Software Engineer Intern', date: 'Jun 2022 - Aug 2022 and Jun 2023 - Aug 2023', sortDate: '2023-06',
      description: [
      "Created a React Native iOS app to scan misprinted and discarded promotional products with OCR (optical character recognition) and USPTO's Trademark API",
      "Developed neural network clustering in PyTorch using EfficientNet transfer learning with a trademark dataset of over 10K self-collected data points",
      "Designed a data collection and processing system using Google Maps API, SERP API, Selenium, Pandas, and SQL, collecting 600+ daily data entries",
      "Automated program execution and email notifications using Python and Linux cron jobs, saving 15 hours/week and $12K/year",
      "Developed a business industry search tool by programming a web interface with a React.js frontend and PHP backend containing product order data cleaned using SQL and Pandas, then implementing visualization tools and market trend reports for Ariel's marketing department",
    ] }
  ].sort((a, b) => {
    // Sort by date, newest first (Present = highest priority)
    if (a.date.includes('Present') && !b.date.includes('Present')) return -1;
    if (!a.date.includes('Present') && b.date.includes('Present')) return 1;
    return b.sortDate.localeCompare(a.sortDate);
  });


  return (
    <div className="experiences-section" id="experience">
      <div className='widthBig flexCol'>
        <h2>
          Experience
        </h2>
        <div className='experiences-list flexCol'>
          {tabs.map((item, index) => (
            <div key={item.label} className='experience-item'>
              <div className='experience-header'>
                {item.icon && <span className='experience-icon'>{item.icon}</span>}
                <div>
                  <p className='experience-label'>{item.label}</p>
                  <h5>{item.title}</h5>
                  <p className='experience-date'>{item.date}</p>
                </div>
              </div>
              <ul className='experience-description'>
                {item.description.map((text, textIndex) => (
                  <li key={textIndex}>
                    {text}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ExperiencesSection