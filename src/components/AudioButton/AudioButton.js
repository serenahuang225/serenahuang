import React, { useState, useRef } from "react";
import "./AudioButton.css";
import sound from "./Mendelssohn Symphony 4 mvt 1.mp3"

const AudioButton = ({isBig=false, isPlaying, setIsPlaying}) => {
  const audioRef = useRef(new Audio(sound));

  const toggleAudio = () => {
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      audioRef.current.play();
      audioRef.current.loop = true;
    }
  };

  return (
    <>
    {
      isBig ?
      <div className="vinyl-player-big" onClick={toggleAudio}>
        <div className={`vinyl-big ${isPlaying ? "spinning" : ""}`}></div>
        <div className={`tonearm-big ${isPlaying ? "playing" : ""}`}></div>
      </div> :
      <div className="vinyl-player" onClick={toggleAudio}>
        <div className={`vinyl ${isPlaying ? "spinning" : ""}`}></div>
        <div className={`tonearm ${isPlaying ? "playing" : ""}`}></div>
      </div>
    }
    </>
  );
};

export default AudioButton;