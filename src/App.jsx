import { useEffect, useMemo, useState } from "react";

import NavigationBar from "./components/layout/NavigationBar";
import HomePage from "./pages/HomePage";
import TournamentPage from "./pages/TournamentPage";
import LifetimePage from "./pages/LifetimePage";
import MatchPage from "./pages/MatchPage";

import { setPath } from "./utils/navigation";
import MyMatchesPage from "./pages/MyMatchesPage.jsx";

function App() {
  const pageToPath = useMemo(
    () => ({
      home: "/",
      tournament: "/tournament",
      lifetime: "/lifetime",
      match: "/match",
      myMatches: "/my-matches",
    }),
    [],
  );

  const getPageFromLocation = () => {
    const rawPath = window.location.pathname || "/";
    const path = rawPath.replace(/\/+$/, "") || "/";

    if (path === "/") return "home";
    if (path.startsWith("/tournament")) return "tournament";
    if (path.startsWith("/lifetime")) return "lifetime";
    if (path.startsWith("/match")) return "match";
    if (path.startsWith("/my-matches")) return "myMatches";
    return "home";
  };

  const [currentPage, setCurrentPage] = useState(() => getPageFromLocation());

  useEffect(() => {
    const onPopState = () => {
      setCurrentPage(getPageFromLocation());
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = (page, { replace = false } = {}) => {
    const nextPage = pageToPath[page] ? page : "home";
    const nextPath = pageToPath[nextPage];

    setCurrentPage(nextPage);

    setPath(nextPath, { replace });
  };

  return (
    <>
      <NavigationBar currentPage={currentPage} navigate={navigate} />
      {currentPage === "home" && <HomePage />}
      {currentPage === "match" && <MatchPage />}
      {currentPage === "tournament" && (
        <TournamentPage onBack={() => navigate("home", { replace: true })} />
      )}
      {currentPage === "lifetime" && <LifetimePage />}
      {currentPage === "myMatches" && <MyMatchesPage />}
    </>
  );
}

export default App;
