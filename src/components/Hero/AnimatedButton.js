import React from "react";
import { motion } from "framer-motion";
import "./AnimatedButton.css"

const AnimatedButton = () => {
  return (
    <motion.a
      href="mailto:serenahuang225@gmail.com"
      style={{textDecoration: 'none', width: 'fit-content'}}
    >
      <motion.button
        initial={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <motion.div
          initial={{ "--x": "100%", scale: 1 }}
          animate={{ "--x": "-100%" }}
          transition={{
            repeat: Infinity,
            repeatType: "loop",
            repeatDelay: 1,
            type: "spring",
            stiffness: 20,
            damping: 15,
            mass: 2,
            scale: {
              type: "spring",
              stiffness: 10,
              damping: 5,
              mass: 0.1,
            },
          }}
          style={{
            padding: "16px 24px",
            position: "relative",
            width: 'fit-content'
          }}
          className="radial-gradient"
        >
          <span
            style={{
              height: "100%",
              width: "100%",
              display: "block",
              position: "relative",
              color: 'white',
              fontSize: '1rem',
              fontFamily: "Host Grotesk"
            }}
            className="linear-mask"
          >
            CONTACT
          </span>

          <span
            style={{
              display: 'block',
              position: "absolute",
              inset: 0,
              padding: "2px",
            }}
            className="linear-overlay"
          />
        </motion.div>
      </motion.button>
    </motion.a>
  );
};

export default AnimatedButton;