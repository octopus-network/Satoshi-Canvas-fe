import { ThemeProvider } from "./components/ThemeProvider";
import { LaserEyesProvider } from "@omnisat/lasereyes";
import { ReeProvider } from "@omnity/ree-client-ts-sdk";
import { laserEyesConfig, reeConfig, isWalletConfigValid } from "./config/wallet";
import HomePage from "./pages/Home";

function App() {
  return (
    <ThemeProvider>
      <LaserEyesProvider config={laserEyesConfig}>
        {isWalletConfigValid() ? (
          <ReeProvider config={reeConfig}>
            <HomePage />
          </ReeProvider>
        ) : (
          <HomePage />
        )}
      </LaserEyesProvider>
    </ThemeProvider>
  );
}

export default App;
