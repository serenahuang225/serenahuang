import React, { useState, useRef } from "react";
import "./AudioButton.css";
import sound from "./Mendelssohn Symphony 4 mvt 1.mp3"

const AudioButton = ({isBig=false, isPlaying, setIsPlaying}) => {
  const audioRef = useRef(new Audio(sound));
  const [hasClicked, setHasClicked] = useState(false)
  const [didClick, setDidClick] = useState(false)

  const toggleAudio = () => {
    if (!hasClicked) {
      setHasClicked(true);
      setIsPlaying(true);
      audioRef.current.play();
      audioRef.current.loop = true;
      setDidClick(true);
      return;
    }
    if (didClick) {
      audioRef.current.pause();
      setIsPlaying(false);
      setDidClick(false)
    } else if (!didClick) {
      setIsPlaying(true);
      audioRef.current.play();
      audioRef.current.loop = true;
      setDidClick(true)
    }
  };

  const toggleHoverAudio = (isEnter) => {
    if (!hasClicked) {
      return
    }
    if (isEnter) {
      setIsPlaying(true);
      audioRef.current.play();
      audioRef.current.loop = true;
    } else if (!isEnter && didClick) {
      // do nothing, continue playing
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }

  return (
    <>
    {
      isBig ?
      <div className="vinyl-player-big" onClick={toggleAudio} onMouseEnter={() => toggleHoverAudio(true)} onMouseLeave={() => toggleHoverAudio(false)}>
        <div className={`vinyl-big ${isPlaying ? "spinning" : ""}`}></div>
        <div className={`tonearm-big ${isPlaying ? "playing" : ""}`}></div>
      </div> :
      <div className="vinyl-player" onClick={toggleAudio} onMouseEnter={() => toggleHoverAudio(true)} onMouseLeave={() => toggleHoverAudio(false)}>
        <div className={`vinyl ${isPlaying ? "spinning" : ""}`}></div>
        <div className={`tonearm ${isPlaying ? "playing" : ""}`}></div>
      </div>
    }
    </>
  );
};

export default AudioButton;