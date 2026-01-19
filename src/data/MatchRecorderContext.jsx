import { createContext, useContext } from "react";

import useMatchRecorder from "../hooks/useMatchRecorder";

const MatchRecorderContext = createContext(null);

export function MatchRecorderProvider({ children }) {
  const recorder = useMatchRecorder();
  return (
    <MatchRecorderContext.Provider value={recorder}>
      {children}
    </MatchRecorderContext.Provider>
  );
}

export function useMatchRecorderContext() {
  const ctx = useContext(MatchRecorderContext);
  if (!ctx) {
    throw new Error(
      "useMatchRecorderContext must be used within MatchRecorderProvider"
    );
  }
  return ctx;
}
