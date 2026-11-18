"use client";
import { useState } from "react";
import { Hammer, BookOpen, Fingerprint, Activity, RotateCw } from "lucide-react";
import { SERENA_AXIOMS, type Axiom } from "@/content/serena";

/** The drawing on the front of each card. */
const ICONS: Record<Axiom["icon"], typeof Hammer> = {
  hammer: Hammer,
  "book-open": BookOpen,
  fingerprint: Fingerprint,
  activity: Activity,
};

/**
 * "Values to live by": four cards that flip over to show a reflection.
 * A mouse flips a card while hovering; a click (or tap) pins it open until
 * clicked again or Escape is pressed.
 */
export default function Values() {
  const [hovered, setHovered] = useState<string | null>(null);
  const [pinned, setPinned] = useState<Record<string, boolean>>({});
  const close = (id: string) => {
    setHovered(null);
    setPinned((p) => ({ ...p, [id]: false }));
  };
  return (
    <div className="values-explorer">
      <div className="value-choices" role="group" aria-label="Explore my values">
        {SERENA_AXIOMS.map((axiom, i) => {
          const Icon = ICONS[axiom.icon];
          const flipped = hovered === axiom.id || !!pinned[axiom.id];
          return (
            <button
              key={axiom.id}
              // value-0..3 pick each card's own little animation in globals.css
              className={`value-flip value-${i} ${flipped ? "is-flipped" : ""}`}
              aria-label={`${flipped ? "Close" : "Read"} ${axiom.title}`}
              aria-expanded={flipped}
              aria-controls={`${axiom.id}-reflection`}
              onPointerEnter={(e) => {
                if (e.pointerType === "mouse") setHovered(axiom.id);
              }}
              onPointerLeave={() => setHovered(null)}
              onClick={() => (flipped ? close(axiom.id) : setPinned((p) => ({ ...p, [axiom.id]: true })))}
              onKeyDown={(e) => {
                if (e.key === "Escape") close(axiom.id);
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
                  <span className="value-prompt">{axiom.prompt}</span>
                  <span className="flip-hint">TURN OVER A THOUGHT ↗</span>
                </span>
                <span id={`${axiom.id}-reflection`} className="value-face value-back" aria-hidden={!flipped}>
                  <span className="eyebrow">
                    AXIOM {axiom.number} / {axiom.title}
                  </span>
                  <span className="value-statement">{axiom.statement}</span>
                  <span className="value-elaboration">{axiom.elaboration}</span>
                  <span className="flip-hint">A BELIEF TO PUT INTO PRACTICE</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
