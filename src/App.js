import { useRoutes } from "react-router-dom";
import Home from "./routes/Home";
import Resume from "./routes/Resume";

function App() {
  const element = useRoutes([
    {
      path:"/",
      element: <Home />
    },
    {
      path:"/resume",
      element: <Resume />
    }
  ])

  return element;
}

export default App;