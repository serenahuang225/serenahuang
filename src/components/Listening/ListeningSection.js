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
              <h4>Mendelssohn: Symphony<br></br> No. 4 in A Major</h4>
              <p className='small italic'>As featured in Barbie in the 12 Dancing Princesses</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ListeningSection