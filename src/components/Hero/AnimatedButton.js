import React from "react";
import "./AnimatedButton.css"

const AnimatedButton = ({link="mailto:serenahuang225@gmail.com", message="LETS WORK TOGETHER" }) => {
  return (
    <a
      href={link} rel="noopener noreferrer" target="_blank"
      style={{textDecoration: 'none', width: 'fit-content'}}
    >
      <button>
        <div
          style={{
            padding: "16px 24px",
            position: "relative",
            width: 'fit-content',
            backgroundColor: '#ffffff',
            border: '1px solid var(--primary-border-color)'
          }}
        >
          <span
            style={{
              height: "100%",
              width: "100%",
              display: "block",
              position: "relative",
              color: 'var(--primary-text-color)',
              fontSize: '1.2rem',
              fontFamily: "Outfit, sans-serif",
              fontWeight: '400'
            }}
          >
            {message}
          </span>
        </div>
      </button>
    </a>
  );
};

export default AnimatedButton;
