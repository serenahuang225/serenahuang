"use client";
import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
const experience = [
  {
    organization: "Jane Street",
    role: "AMP Scholar",
    date: "JUN — JUL 2026",
    description:
      "200+ hours immersed in combinatorics, probability, number theory, and algorithms. Placed in the top five of 78 in an algorithmic trading competition using reinforcement learning and rule-based strategies.",
  },
  {
    organization: "Bear Studios",
    role: "Technology Consultant",
    date: "DEC 2023 — APR 2026",
    description:
      "Built a digital placemaking mobile app for 50+ local businesses with React Native, Express, SQL, and AWS. Redesigned a celebrity gifting client’s website featuring more than 50 brand partners.",
  },
  {
    organization: "Stanford Code in Place",
    role: "Section Leader",
    date: "APR — JUN 2025",
    description:
      "Mentored 15 students through weekly Python discussion sections, debugging sessions, and individual code feedback as part of Stanford’s global introductory programming program.",
  },
  {
    organization: "NASA & UT Austin",
    role: "Aerospace Research Intern",
    date: "MAY — AUG 2024",
    description:
      "Used clustering and similarity analysis to study terrestrial analogues for lunar materials. Also analyzed more than 7,900 stars in Andromeda and was invited to present at the 2024 American Geophysical Union Fall Meeting.",
  },
  {
    organization: "Ariel Premium Supply",
    role: "Software Engineer Intern",
    date: "SUMMERS 2022 & 2023",
    description:
      "Built image similarity models for a logo search pipeline, working with more than 10,000 images. Earlier work included automated data collection and an NLP pipeline for redacting personal information.",
  },
];
export default function Experience() {
  const [chapter, setChapter] = useState(0);
  const [direction, setDirection] = useState("forward");
  const item = experience[chapter];
  const turn = (next: number) => {
    if (next < 0 || next >= experience.length || next === chapter) return;
    setDirection(next > chapter ? "forward" : "backward");
    setChapter(next);
  };
  return (
    <div className="experience chapter-experience">
      <div className="experience-heading">
        <span className="eyebrow">PLACES I’VE LEARNED BY DOING</span>
        <h3>
          A few chapters <em>so far.</em>
        </h3>
      </div>
      <div
        className="chapter-book"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") {
            e.preventDefault();
            turn(chapter + 1);
          }
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            turn(chapter - 1);
          }
        }}
      >
        <nav className="chapter-contents" aria-label="Experience chapters">
          <span className="eyebrow">CONTENTS</span>
          <span className="book-title">
            Learning,
            <br />
            <em>by doing.</em>
          </span>
          {experience.map((entry, i) => (
            <button
              key={entry.organization}
              aria-current={chapter === i ? "step" : undefined}
              aria-controls="chapter-page"
              onClick={() => turn(i)}
            >
              <span>0{i + 1}</span>
              {entry.organization}
            </button>
          ))}
          <span className="book-colophon">
            SERENA HUANG / SELECTED EXPERIENCE
          </span>
        </nav>
        <div className="chapter-right">
          <article
            className={`chapter-page turn-${direction}`}
            id="chapter-page"
            key={chapter}
            aria-live="polite"
          >
            <span className="chapter-kicker">
              CHAPTER {String(chapter + 1).padStart(2, "0")}
            </span>
            <span className="chapter-date">{item.date}</span>
            <h4>{item.organization}</h4>
            <span className="chapter-role">{item.role}</span>
            <p>{item.description}</p>
            <span className="page-number">
              {String(chapter + 1).padStart(2, "0")} /{" "}
              {String(experience.length).padStart(2, "0")}
            </span>
          </article>
          <div className="chapter-controls">
            <button
              aria-label="Previous chapter"
              disabled={chapter === 0}
              onClick={() => turn(chapter - 1)}
            >
              <ArrowLeft size={16} /> Previous
            </button>
            <button
              aria-label="Next chapter"
              disabled={chapter === experience.length - 1}
              onClick={() => turn(chapter + 1)}
            >
              Next chapter <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
