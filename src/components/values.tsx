"use client";
import { useState } from "react";
import {
  Hammer,
  BookOpen,
  Fingerprint,
  Activity,
  RotateCw,
} from "lucide-react";
import { SERENA_AXIOMS } from "@/content/serena";
const icons = [Hammer, BookOpen, Fingerprint, Activity];
const prompts = [
  "Think. Make. Understand.",
  "Stay curious. Go deeper.",
  "Show up as yourself.",
  "Train body. Train mind.",
];
export default function Values() {
  const [hovered, setHovered] = useState<string | null>(null);
  const [pinned, setPinned] = useState<Record<string, boolean>>({});
  return (
    <div className="values-explorer">
      <div
        className="value-choices"
        role="group"
        aria-label="Explore my values"
      >
        {SERENA_AXIOMS.map((axiom, i) => {
          const Icon = icons[i],
            flipped = hovered === axiom.id || !!pinned[axiom.id];
          return (
            <button
              key={axiom.id}
              className={`value-flip value-${i} ${flipped ? "is-flipped" : ""}`}
              aria-label={`${flipped ? "Close" : "Read"} ${axiom.title}`}
              aria-expanded={flipped}
              aria-controls={`${axiom.id}-reflection`}
              onPointerEnter={(e) => {
                if (e.pointerType === "mouse") setHovered(axiom.id);
              }}
              onPointerLeave={() => setHovered(null)}
              onClick={() => {
                if (flipped) {
                  setHovered(null);
                  setPinned({ ...pinned, [axiom.id]: false });
                } else setPinned({ ...pinned, [axiom.id]: true });
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setHovered(null);
                  setPinned({ ...pinned, [axiom.id]: false });
                }
              }}
            >
              <span className="value-flip-inner">
                <span className="value-face value-front" aria-hidden={flipped}>
                  <span className="value-card-top">
                    <span>{axiom.number}</span>
                    <RotateCw size={16} />
                  </span>
                  <span className="value-symbol" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                    <Icon size={58} strokeWidth={1} />
                  </span>
                  <span className="value-title">{axiom.title}</span>
                  <span className="value-prompt">{prompts[i]}</span>
                  <span className="flip-hint">TURN OVER A THOUGHT ↗</span>
                </span>
                <span
                  id={`${axiom.id}-reflection`}
                  className="value-face value-back"
                  aria-hidden={!flipped}
                >
                  <span className="eyebrow">
                    AXIOM {axiom.number} / {axiom.title}
                  </span>
                  <span className="value-statement">{axiom.statement}</span>
                  <span className="value-elaboration">{axiom.elaboration}</span>
                  <span className="flip-hint">
                    A BELIEF TO PUT INTO PRACTICE
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
