import { useLocation, useRoutes } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { cloneElement } from "react";
import Home from "./routes/Home";

function App() {
  const element = useRoutes([
    {
      path:"/",
      element: <Home />
    },
    {
      path:"/home",
      element: <Home />
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