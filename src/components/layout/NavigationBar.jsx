import {
  Calendar,
  ChartLine,
  House,
  SignIn,
  SignOut,
  Trophy,
} from "@phosphor-icons/react";
import { logEvent } from "firebase/analytics";
import { analytics } from "../../firebase";
import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext.jsx";
import AuthModal from "../auth/AuthModal.jsx";

function NavigationBar({ currentPage, navigate }) {
  const { user, authLoading, signOut } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
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
              ? "!bg-[#445f8b] !text-white"
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
              ? "!bg-[#445f8b] !text-white"
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
              ? "!bg-[#445f8b] !text-white"
              : "bg-transparent text-[#445f8b] hover:bg-[#f0f5ff]"
          }`}
        >
          <ChartLine weight="bold" size={20} />
          Lifetime Stats
        </button>
        <button
          onClick={() => {
            navigate("myMatches");
            logEvent(analytics, "navigate_my_matches");
          }}
          className={`btn ${
            currentPage === "myMatches"
              ? "!bg-[#445f8b] !text-white"
              : "bg-transparent text-[#445f8b] hover:bg-[#f0f5ff]"
          }`}
        >
          <Trophy weight="bold" size={20} />
          My Matches
        </button>
        <div className="ml-auto flex items-center justify-center gap-2">
          {authLoading ? (
            <span className="text-xs text-[#666] ml-1">Loading...</span>
          ) : user ? (
            <>
              <span className="text-xs sm:text-sm text-[#445f8b] truncate max-w-[120px] sm:max-w-xs">
                {user.email}
              </span>
              <button
                onClick={signOut}
                className="btn !py-1 !px-3 text-xs sm:text-sm"
              >
                <SignOut weight="bold" size={16} />
                Sign out
              </button>
            </>
          ) : (
            <>
              <h2 className="hidden md:block text-lg font-bold">Heron Scout</h2>
              <button
                onClick={() => setAuthOpen(true)}
                className="btn !py-1 !px-3 text-xs sm:text-sm"
                data-auth-modal-trigger
              >
                <SignIn weight="bold" size={16} />
                Sign in / Sign up
              </button>
            </>
          )}
        </div>
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      </div>
    </div>
  );
}

export default NavigationBar;
