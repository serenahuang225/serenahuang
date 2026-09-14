"use client";
import { useRef, useState } from "react";
import { Play, Pause, ArrowLeft, ArrowRight } from "lucide-react";
import { listening } from "@/content/serena";
export default function MusicPlayer() {
  const audio = useRef<HTMLAudioElement>(null);
  const [current, setCurrent] = useState(0),
    [playing, setPlaying] = useState(false),
    [error, setError] = useState("");
  function browse(index: number) {
    const next = (index + listening.length) % listening.length;
    const el = audio.current;
    if (!el || next === current) return;
    el.pause();
    el.src = listening[next].audio || listening[next].href;
    el.load();
    setPlaying(false);
    setError("");
    setCurrent(next);
  }
  const swipeStart = useRef<number | null>(null);
  async function choose(index: number) {
    const el = audio.current;
    if (!el) return;
    setError("");
    if (index === current && playing) {
      el.pause();
      return;
    }
    if (index !== current) {
      el.pause();
      el.src = listening[index].audio || listening[index].href;
      setCurrent(index);
      el.load();
    }
    try {
      await el.play();
    } catch {
      setError("This track could not play. Please try again.");
    }
  }
  return (
    <div className="listening-layout">
      <div className="record-collection">
        <div
          className="record-crate"
          role="group"
          aria-label="Record collection"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
              event.preventDefault();
              browse(current + (event.key === "ArrowRight" ? 1 : -1));
            }
          }}
          onTouchStart={(event) => {
            swipeStart.current = event.touches[0].clientX;
          }}
          onTouchEnd={(event) => {
            if (swipeStart.current !== null) {
              const distance =
                event.changedTouches[0].clientX - swipeStart.current;
              if (Math.abs(distance) > 45)
                browse(current + (distance < 0 ? 1 : -1));
            }
            swipeStart.current = null;
          }}
        >
          {listening.map((track, i) => {
            const offset = (i - current + listening.length) % listening.length;
            return (
              <button
                key={track.title}
                className={`collection-sleeve sleeve-tone-${i} ${offset === 0 ? "is-current" : ""}`}
                style={{
                  transform: `translate(${offset * 25}px, ${-offset * 19}px) rotate(${offset * 7 - 5}deg)`,
                  zIndex: listening.length - offset,
                }}
                aria-label={
                  offset === 0
                    ? `${playing ? "Pause" : "Play"} record: ${track.title}`
                    : `Browse record: ${track.title}`
                }
                onClick={() => (offset === 0 ? choose(i) : browse(i))}
              >
                <span className="sleeve-edition">
                  SSH RECORDS <span>VOL. 0{i + 1}</span>
                </span>
                <span
                  className={`collection-vinyl ${offset === 0 && playing ? "is-spinning" : ""}`}
                  aria-hidden="true"
                >
                  <span>
                    ssh<small>33⅓</small>
                  </span>
                </span>
                <span className="sleeve-caption">
                  <strong>{track.title.split(" (feat.")[0]}</strong>
                  <small>{track.artist}</small>
                </span>
                {offset === 0 && (
                  <span className="sleeve-play">
                    {playing ? <Pause size={14} /> : <Play size={14} />}{" "}
                    {playing ? "PAUSE RECORD" : "PLAY RECORD"}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="record-browser">
          <button
            onClick={() => browse(current - 1)}
            aria-label="Previous record"
          >
            <ArrowLeft size={18} />
          </button>
          <span aria-live="polite">
            0{current + 1} / 0{listening.length}
            <small>FLIP THROUGH THE COLLECTION</small>
          </span>
          <button onClick={() => browse(current + 1)} aria-label="Next record">
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
      <div className="listening-copy">
        <span className="eyebrow">A DIFFERENT KIND OF NOTE</span>
        <h2>
          Life has
          <br />a <em>soundtrack.</em>
        </h2>
        <p>Flip through a few favorites. Pick a record, stay a while.</p>
        <div className="music-player">
          <div className="music-track-list">
            {listening.map((track, i) => (
              <button
                key={track.title}
                onClick={() => choose(i)}
                className={current === i ? "selected-track" : ""}
                aria-label={`${current === i && playing ? "Pause" : "Play"} ${track.title}`}
                aria-pressed={current === i && playing}
              >
                <span className="track-play">
                  {current === i && playing ? (
                    <Pause size={16} />
                  ) : (
                    <Play size={16} />
                  )}
                </span>
                <span className="track-info">
                  {track.title}
                  <small>{track.artist}</small>
                </span>
              </button>
            ))}
          </div>
          <audio
            ref={audio}
            controls
            preload="none"
            src={listening[0]?.audio || listening[0]?.href}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            onError={() => {
              setPlaying(false);
              setError("This track could not load. Please try again.");
            }}
            aria-label={`Audio player: ${listening[current]?.title}`}
          />
          {error && <p role="alert">{error}</p>}
        </div>
      </div>
    </div>
  );
}
