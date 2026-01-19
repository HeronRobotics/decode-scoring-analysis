import { Calendar, ChartLine, House } from "@phosphor-icons/react";
import { logEvent } from "firebase/analytics";
import { analytics } from "../../firebase";

function NavigationBar({ currentPage, navigate }) {
  return (
    <div className="bg-white border-b-2 border-[#445f8b] z-20 sticky top-0">
      <div className="max-w-7xl mx-auto px-2 sm:px-5 py-2 sm:py-4 flex flex-wrap items-center gap-2 sm:gap-4">
        <button
          onClick={() => {
            navigate("home", { replace: true });
            logEvent(analytics, "navigate_home");
          }}
          className={`btn ${
            currentPage === "home"
              ? "bg-[#445f8b]! text-white!"
              : "bg-transparent text-[#445f8b] hover:bg-[#f0f5ff]"
          }`}
        >
          <House weight="bold" size={20} />
          Home
        </button>
        <button
          onClick={() => {
            navigate("tournament");
            logEvent(analytics, "navigate_tournament");
          }}
          className={`btn ${
            currentPage === "tournament"
              ? "bg-[#445f8b]! text-white!"
              : "bg-transparent text-[#445f8b] hover:bg-[#f0f5ff]"
          }`}
        >
          <Calendar weight="bold" size={20} />
          Tournament Analysis
        </button>
        <button
          onClick={() => {
            navigate("lifetime");
            logEvent(analytics, "navigate_lifetime");
          }}
          className={`btn ${
            currentPage === "lifetime"
              ? "bg-[#445f8b]! text-white!"
              : "bg-transparent text-[#445f8b] hover:bg-[#f0f5ff]"
          }`}
        >
          <ChartLine weight="bold" size={20} />
          Lifetime Stats
        </button>
        <div className="hidden md:flex ml-auto items-center">
          <h2 className="text-lg font-bold">Heron Scout</h2>
        </div>
      </div>
    </div>
  );
}

export default NavigationBar;
