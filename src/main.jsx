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
          <footer className="text-center text-sm text-brand-accent my-4">
            <div className="w-full flex flex-row justify-center items-center gap-2">
              <p className="font-semibold">
                <img
                  src="https://heronrobotics.vercel.app/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fheronlogo.b712bcb0.png&w=828&q=75"
                  className="inline-block w-6 h-6 mx-2"
                />{" "}
                Heron Robotics, FTC 27621. &copy; 2025. All rights reserved.
              </p>
              <a
                href="https://heronscout.me/privacy"
                className="block underline"
              >
                Privacy Policy
              </a>
            </div>
            <div className="text-sm">
              Made with late nights and free time —{" "}
              <a
                className="underline"
                href="https://github.com/HeronRobotics/decode-scoring-analysis"
                target="_blank"
                rel="noopener noreferrer"
              >
                Contribute on GitHub
              </a>
              !
            </div>
          </footer>
        </MatchRecorderProvider>
      </TournamentProvider>
    </PostHogProvider>
  </StrictMode>,
);
