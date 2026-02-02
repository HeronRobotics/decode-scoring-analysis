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
    <div className="bg-brand-bg border-b border-brand-border z-20 sticky top-0">
      <div className="max-w-7xl mx-auto px-2 sm:px-5 py-2 sm:py-4 flex flex-wrap items-center gap-2 sm:gap-4 text-brand-text">
        <button
          onClick={() => {
            navigate("home", { replace: true });
            logEvent(analytics, "navigate_home");
          }}
          className={`btn ${
            currentPage === "home"
              ? "!bg-brand-accent !text-brand-bg !border-brand-accent"
              : "bg-transparent text-brand-text hover:bg-brand-surfaceStrong"
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
              ? "!bg-brand-accent !text-brand-bg !border-brand-accent"
              : "bg-transparent text-brand-text hover:bg-brand-surfaceStrong"
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
              ? "!bg-brand-accent !text-brand-bg !border-brand-accent"
              : "bg-transparent text-brand-text hover:bg-brand-surfaceStrong"
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
              ? "!bg-brand-accent !text-brand-bg !border-brand-accent"
              : "bg-transparent text-brand-text hover:bg-brand-surfaceStrong"
          }`}
        >
          <Trophy weight="bold" size={20} />
          My Matches
        </button>
        <div className="ml-auto flex items-center justify-center gap-2">
          {authLoading ? (
            <span className="text-xs text-brand-muted ml-1">Loading...</span>
          ) : user ? (
            <>
              <span className="text-xs sm:text-sm text-brand-muted truncate max-w-[120px] sm:max-w-xs">
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
              <h2 className="hidden md:block text-lg font-bold font-display text-brand-text">
                Heron Scout
              </h2>
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
