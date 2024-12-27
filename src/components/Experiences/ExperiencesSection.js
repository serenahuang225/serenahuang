import React, { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion';
import "./ExperiencesSection.css"

const ExperiencesSection = () => {
  const tabs = [
    { label: "Bubbly Studios", icon: "🫧", title: 'Co-Founder & Lead Software Developer', date: 'Feb 2022 - Present',
      description: [
      "Created Lively, an iOS app for productivity and social interaction that allows users to connect with friends and create personalized calendars, to-do lists, and journal entries",
      "Developed custom UI components (infinite pager, bottom sheet) with React Native Gesture Handler and Reanimated",
      "Implemented real-time notifications and friend syncing via Firebase on an Express.js server hosted on Render",
      "Earned 1st Place in the 2022-23 Congressional App Challenge with app achieving 700+ downloads and 10K+ monthly interactions"
    ] },
    { label: "NASA SEES", icon: "🚀", title: 'Aerospace Engineer Intern', date: 'May 2024 - Aug 2024',
      description: [
      "Chosen as 1 of 50 rising juniors in the nation for the STEM Enhancement in Earth Science (SEES) internship",
      "Developed an in-situ resource utilization system for lunar exploration and resource mining, including a solar-powered winch-pulley system, wireless power transfer, and in-situ toboggan creation",
      "Utilized the ZQube system and machine learning (k-means clustering and cosine similarity) to analyze regolith in microgravity, exploring the potential of various regoliths to be used as building materials",
      "Authored a research proposal studying the effects of astronaut drugs on brain organoids in Zero-G on a parabolic flight",
      "Applied data analysis techniques to NASA satellite data, determining star radial velocities after redshifts, creating histogram distributions, surface temperature trends, and dispersion maps of the Andromeda Galaxy"
    ] },
    { label: "Ariel", icon: "🖨️", title: 'Software Engineer Intern', date: 'Jun 2022 - Aug 2022 and Jun 2023 - Aug 2023',
      description: [
      "Created a React Native iOS app to scan misprinted and discarded promotional products with OCR (optical character recognition) and USPTO's Trademark API",
      "Developed neural network clustering in PyTorch using EfficientNet transfer learning with a trademark dataset of over 10K self-collected data points",
      "Designed a data collection and processing system using Google Maps API, SERP API, Selenium, Pandas, and SQL, collecting 600+ daily data entries",
      "Automated program execution and email notifications using Python and Linux cron jobs, saving 15 hours/week and $12K/year",
      "Developed a business industry search tool by programming a web interface with a React.js frontend and PHP backend containing product order data cleaned using SQL and Pandas, then implementing visualization tools and market trend reports for Ariel's marketing department",
    ] },
    { label: "FBLA President", icon: "💼", title: 'Chapter President', date: 'Aug 2022 - Present',
      description: [
      "Directed chapter activities, resulting in achieving Champion Chapter of the Year status for 2 consecutive seasons",
      "Secured 3 key sponsorships and led recruitment initiatives that increased chapter membership by 66%",
      "Organized and executed biweekly meetings, study sessions, and fundraising events for 50+ student members"
    ] },
    { label: "Dance Marathon", icon: "💃", title: 'Sponsorships Executive Committee Chair', date: 'Aug 2022 - Present',
      description: [
      "Spearheaded fundraising initiatives that raised a total of $34K, providing critical support to cancer patients in local hospitals",
      "Managed logistics and coordination of food catering for the final 4-hour event with over 200 attendees",
      "Led outreach efforts to 200 local businesses, securing 56 sponsorships that bolstered event funding and community engagement"
    ] }
  ];

  const [selectedTab, setSelectedTab] = useState(tabs[0]);

  return (
    <div className="experiences-section snapDiv" id="hero">
      <div className='widthBig flexCol'>
        <motion.h1>Experiences</motion.h1>
        <div className='flexRow alignTop'>
          <div className='leftTabs flexCol'>
            <ul style={{ listStyle: "none" }}>
              {tabs.map((item) => (
                <motion.li
                  initial={{scale: 1}}
                  whileHover={{scale: 1.02}}
                  whileTap={{scale: 0.98}}
                  key={item.label} className='singleTab'
                  onClick={() => setSelectedTab(item)}
                >
                  <span style={{ marginRight: "8px" }}>{item.icon}</span> {item.label}
                  {item.icon === selectedTab.icon ? (
                    <motion.div
                      layoutId="underline"
                      className='selectedBorder'
                    />
                  ) : null}
                </motion.li>
              ))}
            </ul>
          </div>

          <AnimatePresence mode="wait">
            <motion.div className={`rightTabContent`}
              key={selectedTab ? selectedTab.label : "empty"}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h2>{selectedTab.title}</h2>
              <p>{selectedTab.date}</p>
              <ul>
                {selectedTab.description.map(text => <li id={text}>{text}</li>)}
              </ul>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

export default ExperiencesSection