import React, { useState, useRef } from "react";
import "./AudioButton.css";
import sound from "./Mendelssohn Symphony 4 mvt 1.mp3"

const AudioButton = ({isBig=false, isPlaying, setIsPlaying}) => {
  const audioRef = useRef(new Audio(sound));

  const toggleAudio = (play) => {
    if (play) {
      setIsPlaying(true);
      audioRef.current.play();
      audioRef.current.loop = true;
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  return (
    <>
    {
      isBig ?
      <div className="vinyl-player-big" onClick={() => toggleAudio(!isPlaying)} onMouseEnter={() => toggleAudio(true)} onMouseLeave={() => toggleAudio(false)}>
        <div className={`vinyl-big ${isPlaying ? "spinning" : ""}`}></div>
        <div className={`tonearm-big ${isPlaying ? "playing" : ""}`}></div>
      </div> :
      <div className="vinyl-player" onClick={() => toggleAudio(!isPlaying)} onMouseEnter={() => toggleAudio(true)} onMouseLeave={() => toggleAudio(false)}>
        <div className={`vinyl ${isPlaying ? "spinning" : ""}`}></div>
        <div className={`tonearm ${isPlaying ? "playing" : ""}`}></div>
      </div>
    }
    </>
  );
};

export default AudioButton;