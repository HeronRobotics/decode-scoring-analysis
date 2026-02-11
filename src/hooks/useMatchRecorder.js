import { useCallback, useEffect, useRef, useState } from "react";
import { saveDraft, clearDraft } from "../utils/localMatchStorage";

const AUTO_DURATION = 30; // seconds
const BUFFER_DURATION = 8; // seconds
const TELEOP_DURATION = 120; // seconds
const MATCH_TOTAL_DURATION = AUTO_DURATION + BUFFER_DURATION + TELEOP_DURATION;

export const matchRecorderConstants = {
  AUTO_DURATION,
  BUFFER_DURATION,
  TELEOP_DURATION,
  MATCH_TOTAL_DURATION,
};

export default function useMatchRecorder() {
  const [matchStartTime, setMatchStartTime] = useState(null);
  const [timerDuration, setTimerDuration] = useState(null); // seconds
  const [elapsedTime, setElapsedTime] = useState(0); // ms
  const [events, setEvents] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isReady, setIsReady] = useState(false); // New state: match initialized but not started
  const [notes, setNotes] = useState("");
  const [teamNumber, setTeamNumber] = useState("");
  const [mode, setMode] = useState("free"); // "free" | "match"
  const [phase, setPhase] = useState("idle"); // "idle" | "auto" | "buffer" | "teleop" | "finished"

  // Scoring state
  const [motif, setMotif] = useState(null); // "GPP", "PGP", or "PPG"
  const [autoPattern, setAutoPattern] = useState(""); // P/G pattern at end of auto
  const [teleopPattern, setTeleopPattern] = useState(""); // P/G pattern at end of teleop
  const [autoLeave, setAutoLeave] = useState(false); // Did robot leave in auto?
  const [teleopPark, setTeleopPark] = useState("none"); // "none", "partial", or "full"

  const intervalRef = useRef(null);
  const draftTimeoutRef = useRef(null);

  useEffect(() => {
    if (isRecording) {
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const elapsed = now - matchStartTime;
        setElapsedTime(elapsed);

        if (mode === "match") {
          const elapsedSeconds = Math.floor(elapsed / 1000);
          if (elapsedSeconds < AUTO_DURATION) {
            setPhase("auto");
          } else if (elapsedSeconds < AUTO_DURATION + BUFFER_DURATION) {
            setPhase("buffer");
          } else if (elapsedSeconds < AUTO_DURATION + BUFFER_DURATION + TELEOP_DURATION) {
            setPhase("teleop");
          } else {
            setPhase("finished");
          }
        }

        if (timerDuration && elapsed >= timerDuration * 1000) {
          setIsRecording(false);
          setElapsedTime(timerDuration * 1000);
          if (mode === "match") {
            setPhase("finished");
          }
        }
      }, 100);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRecording, matchStartTime, timerDuration, mode]);

  // Auto-save draft while recording (debounced 500ms)
  useEffect(() => {
    if (!isRecording) return;

    if (draftTimeoutRef.current) {
      clearTimeout(draftTimeoutRef.current);
    }

    draftTimeoutRef.current = setTimeout(() => {
      saveDraft({
        events,
        teamNumber,
        notes,
        mode,
        phase,
        timerDuration,
        elapsedTime,
        motif,
        autoPattern,
        teleopPattern,
        autoLeave,
        teleopPark,
      });
    }, 500);

    return () => {
      if (draftTimeoutRef.current) {
        clearTimeout(draftTimeoutRef.current);
      }
    };
  }, [isRecording, events, teamNumber, notes, mode, phase, timerDuration, elapsedTime, motif, autoPattern, teleopPattern, autoLeave, teleopPark]);

  const startMatch = (duration, newMode = "free", initialMotif = null) => {
    // Set up the match but don't start the timer yet
    setTimerDuration(duration);
    setElapsedTime(0);
    setEvents([]);
    setNotes("");
    setIsReady(true);
    setIsRecording(false);
    setMode(newMode);
    setPhase(newMode === "match" ? "auto" : "idle");
    // Initialize scoring state
    setMotif(initialMotif);
    setAutoPattern("");
    setTeleopPattern("");
    setAutoLeave(false);
    setTeleopPark("none");
  };

  const beginMatch = () => {
    // Actually start the timer
    const now = Date.now();
    setMatchStartTime(now);
    setIsRecording(true);
    setIsReady(false);
  };

  const stopMatch = () => {
    setIsRecording(false);
    clearDraft();
    if (mode === "match") {
      setPhase("finished");
    }
  };

  const resetMatch = () => {
    setMatchStartTime(null);
    setEvents([]);
    setElapsedTime(0);
    setNotes("");
    setMode("free");
    setPhase("idle");
    setIsRecording(false);
    setIsReady(false);
    setTimerDuration(null);
    // Reset scoring state
    setMotif(null);
    setAutoPattern("");
    setTeleopPattern("");
    setAutoLeave(false);
    setTeleopPark("none");
    clearDraft();
  };

  const addCycle = ({ total, scored }) => {
    if (!isRecording) return;
    const event = {
      type: "cycle",
      timestamp: elapsedTime,
      total,
      scored,
      phase: mode === "match" ? phase : undefined,
    };
    setEvents((prev) => [...prev, event]);
  };

  const addGate = () => {
    if (!isRecording) return;
    const event = {
      type: "gate",
      timestamp: elapsedTime,
      phase: mode === "match" ? phase : undefined,
    };
    setEvents((prev) => [...prev, event]);
  };

  const undoLastEvent = useCallback(() => {
    setEvents((prev) => prev.slice(0, -1));
  }, []);

  const restoreFromDraft = useCallback((draft) => {
    if (!draft) return;
    // Restore all state, adjust matchStartTime so timer picks up correctly
    const adjustedStartTime = Date.now() - (draft.elapsedTime || 0);
    setMatchStartTime(adjustedStartTime);
    setTimerDuration(draft.timerDuration ?? null);
    setElapsedTime(draft.elapsedTime || 0);
    setEvents(draft.events || []);
    setNotes(draft.notes || "");
    setTeamNumber(draft.teamNumber || "");
    setMode(draft.mode || "free");
    setPhase(draft.phase || "idle");
    setIsRecording(true);
    setIsReady(false);
    setMotif(draft.motif || null);
    setAutoPattern(draft.autoPattern || "");
    setTeleopPattern(draft.teleopPattern || "");
    setAutoLeave(draft.autoLeave ?? false);
    setTeleopPark(draft.teleopPark || "none");
    clearDraft();
  }, []);

  const applyParsedMatchData = useCallback((parsedData) => {
    if (!parsedData || !Array.isArray(parsedData.events)) return false;

    const otherEvents = parsedData.events.filter((e) => e.type !== "info");
    if (otherEvents.length === 0) return false;

    setMatchStartTime(parsedData.startTime || Date.now());
    setTimerDuration(parsedData.duration || null);
    setEvents(otherEvents);
    setElapsedTime(
      otherEvents.length > 0 ? otherEvents[otherEvents.length - 1].timestamp : 0
    );
    setIsRecording(false);
    setNotes(parsedData.notes || "");
    setTeamNumber(parsedData.teamNumber || "");
    setMode("free");
    setPhase("idle");
    // Load scoring state
    setMotif(parsedData.motif || null);
    setAutoPattern(parsedData.autoPattern || "");
    setTeleopPattern(parsedData.teleopPattern || "");
    setAutoLeave(parsedData.autoLeave ?? false);
    setTeleopPark(parsedData.teleopPark || "none");

    return true;
  }, []);

  return {
    matchStartTime,
    timerDuration,
    elapsedTime,
    events,
    isRecording,
    isReady,
    notes,
    teamNumber,
    mode,
    phase,

    // Scoring state
    motif,
    autoPattern,
    teleopPattern,
    autoLeave,
    teleopPark,

    setNotes,
    setTeamNumber,

    // Scoring setters
    setMotif,
    setAutoPattern,
    setTeleopPattern,
    setAutoLeave,
    setTeleopPark,

    startMatch,
    beginMatch,
    stopMatch,
    resetMatch,
    addCycle,
    addGate,
    undoLastEvent,
    restoreFromDraft,
    applyParsedMatchData,
  };
}
