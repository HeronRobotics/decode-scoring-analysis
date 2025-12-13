import { useState } from "react";

import NavigationBar from "./components/layout/NavigationBar";
import HomePage from "./pages/HomePage";
import TournamentPage from "./pages/TournamentPage";
import LifetimePage from "./pages/LifetimePage";

function App() {
  const [currentPage, setCurrentPage] = useState("home");

  return (
    <>
      <NavigationBar currentPage={currentPage} setCurrentPage={setCurrentPage} />
      {currentPage === "home" && <HomePage />}
      {currentPage === "tournament" && (
        <TournamentPage onBack={() => setCurrentPage("home")} />
      )}
      {currentPage === "lifetime" && <LifetimePage />}
    </>
  );
}

export default App;
