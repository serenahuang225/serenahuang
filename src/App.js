import { useLocation, useRoutes } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { cloneElement } from "react";
import Home from "./routes/Home";
import Navbar from "./components/Nav/Navbar";
import ParticlesBackground from "./components/ParticlesBackground";
import RotatingShapes from "./components/RotatingShapes";
import Resume from "./routes/Resume";

function App() {
  const element = useRoutes([
    {
      path:"/",
      element: <Resume />
    },
    {
      path:"/home",
      element: <Resume />
    }
  ])

  const location = useLocation();

  return (
    <AnimatePresence mode='wait'>
      {/* <RotatingShapes /> */}
      {cloneElement(element, { key: location.pathname })}
    </AnimatePresence>
  );
}

export default App;