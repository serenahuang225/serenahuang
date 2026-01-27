import React, { useState } from 'react'
import './ListeningSection.css'
import AudioButton from '../AudioButton/AudioButton'

const ListeningSection = () => {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="listening-section" id="music">
      <h2>What I'm Listening to</h2>
      <div className='listening-card-wrapper'>
        <div className='listening-card flexRow alignCenter'>
          <div className='flexCol alignCenter'>
            <AudioButton isBig={true} isPlaying={isPlaying} setIsPlaying={setIsPlaying} />
            <div>
              <h4>Golden</h4>
              <p className='small italic'>As featured in KPOP Demon Hunters</p>
              <p style={{ 
                  color: 'var(--primary-text-color)', 
                  fontSize: '0.9rem',
                  fontWeight: 400,
                  marginTop: '1rem',
                  lineHeight: '1.2rem',
                }}>
                  Click the record player to listen <br />
                  <a 
                  href="/golden-lyrics.html" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ textDecoration: 'underline', }}
                >
                  Or view lyrics here →
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ListeningSection