import React, { useState } from 'react'
import { motion } from 'framer-motion';
import './ListeningSection.css'
import AudioButton from '../AudioButton/AudioButton'

const ListeningSection = () => {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="listening-section" id="music">
      <div class={`noot noot-1 ${isPlaying && 'playing'}`}>&#9835; &#9833;</div>
      <div class={`noot noot-2 ${isPlaying && 'playing'}`}>&#119070;</div>
      <div class={`noot noot-3 ${isPlaying && 'playing'}`}>&#119074;</div>
      <div class={`noot noot-4 ${isPlaying && 'playing'}`}>&#9833;</div>
      <div class={`noot noot-5 ${isPlaying && 'playing'}`}>&#9839; &#9834;</div>
      <div class={`noot noot-6 ${isPlaying && 'playing'}`}>&#9834;</div>
      <div class={`noot noot-7 ${isPlaying && 'playing'}`}>&#9836; &#9835;</div>
      <div class={`noot noot-8 ${isPlaying && 'playing'}`}>&#9839; &#9835;</div>
      <div class={`noot noot-9 ${isPlaying && 'playing'}`}>&#9838; &#9839;</div>
      <div class={`noot noot-10 ${isPlaying && 'playing'}`}>&#9834; &#9833;</div>

      <motion.h2>What I'm Listening to</motion.h2>
      <div className='listening-card-wrapper'>
        <div className='listening-card flexRow alignCenter'>
          <div className='flexCol alignCenter'>
            <AudioButton isBig={true} isPlaying={isPlaying} setIsPlaying={setIsPlaying} />
            <div>
              <motion.h4>Mendelssohn: Symphony<br></br> No. 4 in A Major</motion.h4>
              <motion.p className='small italic'>As featured in Barbie in the 12 Dancing Princesses</motion.p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ListeningSection