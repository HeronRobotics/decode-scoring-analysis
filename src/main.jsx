import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { TournamentProvider } from "./data/TournamentContext.jsx";
import { PostHogProvider } from "posthog-js/react";
import { MatchRecorderProvider } from "./data/MatchRecorderContext.jsx";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import { TeamNamesProvider } from "./contexts/TeamNamesContext.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <PostHogProvider
      apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_KEY}
      options={{
        api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
        defaults: "2025-05-24",
        capture_exceptions: true, // This enables capturing exceptions using Error Tracking, set to false if you don't want this
        debug: import.meta.env.MODE === "development",
        person_profiles: "always",
      }}
    >
      <TournamentProvider>
        <MatchRecorderProvider>
          <AuthProvider>
            <TeamNamesProvider>
              <App />
            </TeamNamesProvider>
          </AuthProvider>
          <footer className="border-t border-brand-muted/20 text-center text-sm text-brand-muted mt-6 py-4">
            <div className="flex flex-col items-center gap-2">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="flex items-center gap-2">
                  <img
                    src="public/heronicon.png"
                    className="h-8"
                    alt="Heron Robotics"
                  />
                  <span className="font-semibold">
                    Heron Robotics, FTC 27621.
                  </span>
                </div>
                <span className="text-brand-muted/70">&copy; 2025</span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2">
                <a
                  href="https://heronscout.me/privacy"
                  className="underline underline-offset-4"
                >
                  Privacy Policy
                </a>
                <span className="hidden sm:inline text-brand-muted/40">·</span>
                <a
                  className="underline underline-offset-4"
                  href="https://github.com/HeronRobotics/decode-scoring-analysis"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Contribute on GitHub
                </a>
              </div>

              <div className="text-xs text-brand-muted/70">
                Made with late nights and free time.
              </div>
            </div>
          </footer>
        </MatchRecorderProvider>
      </TournamentProvider>
    </PostHogProvider>
  </StrictMode>,
);
