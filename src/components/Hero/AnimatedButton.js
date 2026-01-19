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
            border: '1px solid #161616'
          }}
        >
          <span
            style={{
              height: "100%",
              width: "100%",
              display: "block",
              position: "relative",
              color: '#161616',
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
