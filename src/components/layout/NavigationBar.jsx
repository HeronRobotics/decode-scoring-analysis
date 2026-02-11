import {
  Calendar,
  ChartLine,
  House,
  List,
  SignIn,
  SignOut,
  Trophy,
  X,
} from "@phosphor-icons/react";
import { logEvent } from "firebase/analytics";
import { analytics } from "../../firebase";
import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext.jsx";
import AuthModal from "../auth/AuthModal.jsx";

const NAV_ITEMS = [
  { key: "tournament", label: "Tournament Analysis", icon: Calendar },
  { key: "lifetime", label: "Lifetime Stats", icon: ChartLine },
  { key: "myMatches", label: "My Matches", icon: Trophy },
];

function NavigationBar({ currentPage, navigate }) {
  const { user, authLoading, signOut } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const handleNavigate = (page) => {
    navigate(page);
    logEvent(analytics, `navigate_${page}`);
    setMenuOpen(false);
  };

  return (
    <div className="backdrop-blur-lg border-b border-brand-border z-20 sticky top-0">
      <div className="max-w-7xl mx-auto px-2 sm:px-5 py-2 sm:py-4 flex items-center gap-2 sm:gap-4 text-brand-text">
        {/* Brand */}
        <button
          onClick={() => handleNavigate("home")}
          className="px-4 py-2 light bg-transparent text-brand-main-text"
        >
          Heron Scout
        </button>

        {/* Desktop nav items */}
        <div className="hidden sm:flex items-center gap-2">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => handleNavigate(item.key)}
              className={`px-4 text-base! py-2 light ${
                currentPage === item.key
                  ? "!bg-brand-accent !text-brand-bg !border-brand-accent"
                  : "bg-transparent text-brand-text"
              }`}
            >
              <item.icon size={20} />
              {item.label}
            </button>
          ))}
        </div>

        {/* Right side: auth + hamburger */}
        <div className="ml-auto flex items-center justify-center gap-2">
          {authLoading ? (
            <span className="text-xs text-brand-text ml-1">Loading...</span>
          ) : user ? (
            <>
              <span className="text-xs sm:text-sm text-brand-text truncate max-w-[120px] sm:max-w-xs">
                {user.email}
              </span>
              <button
                onClick={signOut}
                className="btn !py-1 !px-3 text-xs sm:text-sm"
              >
                <SignOut size={16} />
                Sign out
              </button>
            </>
          ) : (
            <button
              onClick={() => setAuthOpen(true)}
              className="!py-1 !px-3 text-xs sm:text-sm"
              data-auth-modal-trigger
            >
              Sign in
              <SignIn size={16} />
            </button>
          )}

          {/* Hamburger button (mobile only) */}
          <button
            onClick={() => setMenuOpen(true)}
            className="sm:hidden p-2 text-brand-text hover:text-brand-accent transition-colors"
            aria-label="Open menu"
          >
            <List size={24} weight="bold" />
          </button>
        </div>

        {/* Mobile menu overlay */}
        {menuOpen && (
          <div
            className="fixed inset-0 z-30 bg-brand-bg/95 backdrop-blur-lg sm:hidden"
            onClick={() => setMenuOpen(false)}
          >
            <div
              className="flex flex-col h-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-brand-border">
                <span className="text-brand-main-text font-semibold">
                  Heron Scout
                </span>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="p-2 text-brand-text hover:text-brand-accent transition-colors"
                  aria-label="Close menu"
                >
                  <X size={24} weight="bold" />
                </button>
              </div>

              {/* Nav items */}
              <nav className="flex-1 flex flex-col py-4">
                {NAV_ITEMS.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => handleNavigate(item.key)}
                    className={`py-4 px-6 text-left text-lg flex items-center gap-3 transition-colors ${
                      currentPage === item.key
                        ? "text-brand-accent bg-brand-accentBg font-semibold"
                        : "text-brand-text hover:bg-brand-surface"
                    }`}
                  >
                    <item.icon size={24} weight={currentPage === item.key ? "fill" : "regular"} />
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        )}

        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      </div>
    </div>
  );
}

export default NavigationBar;
