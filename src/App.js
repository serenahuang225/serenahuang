import { useLocation, useRoutes } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { cloneElement } from "react";
import Home from "./routes/Home";
import Navbar from "./components/Nav/Navbar";
import Resume from "./routes/Resume";

function App() {
  const element = useRoutes([
    {
      path:"/",
      element: <Resume />
    },
    {
      path:"/resume",
      element: <Resume />
    }
  ])

  const location = useLocation();

  return (
    <AnimatePresence mode='wait'>
      {cloneElement(element, { key: location.pathname })}
    </AnimatePresence>
  );
}

export default App;