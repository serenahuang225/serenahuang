"use client";
import { useRef, useState } from "react";
import { Play, Pause, ArrowLeft, ArrowRight } from "lucide-react";
import { listening } from "@/content/serena";
import { pad2 } from "@/lib/format";

/** How far (px) a finger has to swipe across the records to flip to the next one. */
const SWIPE_PX = 45;

/**
 * "The soundtrack": a stack of record sleeves you can flip through, plus a
 * plain track list. Both share one <audio> element.
 */
export default function MusicPlayer() {
  const audio = useRef<HTMLAudioElement>(null);
  const swipeStart = useRef<number | null>(null);
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");

  /** Point the player at another track (stopped). */
  function load(index: number) {
    const el = audio.current;
    if (!el) return;
    el.pause();
    el.src = listening[index].audio;
    el.load();
    setCurrent(index);
  }

  /** Flip the stack to a record without playing it (wraps around at the ends). */
  function browse(index: number) {
    const next = (index + listening.length) % listening.length;
    if (next === current) return;
    load(next);
    setPlaying(false);
    setError("");
  }

  /** Play a record, or pause it if it's the one already playing. */
  async function choose(index: number) {
    const el = audio.current;
    if (!el) return;
    setError("");
    if (index === current && playing) {
      el.pause();
      return;
    }
    if (index !== current) load(index);
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
              const distance = event.changedTouches[0].clientX - swipeStart.current;
              if (Math.abs(distance) > SWIPE_PX) browse(current + (distance < 0 ? 1 : -1));
            }
            swipeStart.current = null;
          }}
        >
          {listening.map((track, i) => {
            // 0 = the record on top; the rest fan out behind it
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
                  SSH RECORDS <span>VOL. {pad2(i + 1)}</span>
                </span>
                <span className={`collection-vinyl ${offset === 0 && playing ? "is-spinning" : ""}`} aria-hidden="true">
                  <span>
                    ssh<small>33⅓</small>
                  </span>
                </span>
                <span className="sleeve-caption">
                  {/* the sleeve has room for the title, not the featured artists */}
                  <strong>{track.title.split(" (feat.")[0]}</strong>
                  <small>{track.artist}</small>
                </span>
                {offset === 0 && (
                  <span className="sleeve-play">
                    {playing ? <Pause size={14} /> : <Play size={14} />} {playing ? "PAUSE RECORD" : "PLAY RECORD"}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="record-browser">
          <button onClick={() => browse(current - 1)} aria-label="Previous record">
            <ArrowLeft size={18} />
          </button>
          <span aria-live="polite">
            {pad2(current + 1)} / {pad2(listening.length)}
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
            {listening.map((track, i) => {
              const isPlaying = current === i && playing;
              return (
                <button
                  key={track.title}
                  onClick={() => choose(i)}
                  className={current === i ? "selected-track" : ""}
                  aria-label={`${isPlaying ? "Pause" : "Play"} ${track.title}`}
                  aria-pressed={isPlaying}
                >
                  <span className="track-play">{isPlaying ? <Pause size={16} /> : <Play size={16} />}</span>
                  <span className="track-info">
                    {track.title}
                    <small>{track.artist}</small>
                  </span>
                </button>
              );
            })}
          </div>
          <audio
            ref={audio}
            controls
            preload="none"
            src={listening[0].audio}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            onError={() => {
              setPlaying(false);
              setError("This track could not load. Please try again.");
            }}
            aria-label={`Audio player: ${listening[current].title}`}
          />
          {error && <p role="alert">{error}</p>}
        </div>
      </div>
    </div>
  );
}
