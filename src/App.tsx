import { ThemeProvider } from "./components/ThemeProvider";
import HomePage from "./pages/Home";

function App() {
  return (
    <ThemeProvider>
      <HomePage />
    </ThemeProvider>
  );
}

export default App;
