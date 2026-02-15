import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowClockwise,
  Record,
  Stop,
  Target,
  Clock,
  Keyboard,
  Note,
  Timer,
  CheckCircle,
  Crosshair,
  CaretRight,
  ArrowFatLineRight,
  DoorOpen,
  Palette,
  CaretDown,
  Car,
  Flag,
  FloppyDisk,
  UserPlus,
  Play,
  ShareNetwork,
  ArrowUpIcon,
} from "@phosphor-icons/react";
import { logEvent } from "firebase/analytics";
import { usePostHog } from "posthog-js/react";
import { analytics } from "../../firebase";

import Timeline from "../../components/Timeline";
import Statistics from "../../components/Statistics";
import KeyboardEntryToast from "../../components/home/KeyboardEntryToast";
import MatchDataPanel from "../../components/home/MatchDataPanel";
import PatternInput from "../../components/home/PatternInput";
import QuickCycleGrid from "../../components/home/QuickCycleGrid";
import PostMatchComparison from "../../components/home/PostMatchComparison";
import { calculateTotalPoints } from "../../utils/scoring";
import {
  saveLocalMatch,
  getLocalMatches,
  markLocalMatchSynced,
  setPendingMatchSyncId,
  getPendingMatchSyncId,
  clearPendingMatchSyncId,
  saveRecoveryMatch,
  loadRecoveryMatch,
  clearRecoveryMatch,
} from "../../utils/localMatchStorage";

import useKeyboardCycleEntry from "../../hooks/useKeyboardCycleEntry";
import { formatTime } from "../../utils/format";
import { formatMatchText, formatPhaseMatchText } from "../../utils/matchFormat";
import { downloadJson } from "../../utils/fileJson";
import { matchRecorderConstants } from "../../hooks/useMatchRecorder";
import { createPaste } from "../../utils/pasteService";
import { useAuth } from "../../contexts/AuthContext.jsx";
import {
  createMatchForUser,
  listMatchesForCurrentUser,
  saveMatchEdits,
} from "../../api/matchesApi.js";

function MatchRecorderScreen({
  recorder,
  loadedMatchId,
  initialTitle,
  initialTournamentName,
}) {
  const [showQuickGuide, setShowQuickGuide] = useState(false);

  const beginMatchButtonRef = useRef(null);
  const startMatchToastTimeoutRef = useRef(null);
  const [startMatchToastVisible, setStartMatchToastVisible] = useState(false);

  const [copiedFull, setCopiedFull] = useState(false);
  const [copiedAuto, setCopiedAuto] = useState(false);
  const [copiedTeleop, setCopiedTeleop] = useState(false);
  const [copiedFullUrl, setCopiedFullUrl] = useState(false);
  const [copiedAutoUrl, setCopiedAutoUrl] = useState(false);
  const [copiedTeleopUrl, setCopiedTeleopUrl] = useState(false);

  const [saveStatus, setSaveStatus] = useState("idle");
  const [hasSavedThisSession, setHasSavedThisSession] = useState(false);
  const [title, setTitle] = useState("");
  const [tournamentName, setTournamentName] = useState("");
  const [knownTournaments, setKnownTournaments] = useState([]);
  const [matchDate, setMatchDate] = useState("");
  const [previousMatches, setPreviousMatches] = useState(null);

  const posthog = usePostHog();
  const wasRecordingRef = useRef(false);
  const wasManualStopRef = useRef(false);
  const shareUrlCacheRef = useRef(new Map());
  const localSaveRef = useRef(false);
  const lastLocalMatchIdRef = useRef(null);
  const [recovery, setRecovery] = useState(null);
  const [recoveryDismissed, setRecoveryDismissed] = useState(false);
  const { user } = useAuth();

  const {
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
    motif,
    autoPattern,
    teleopPattern,
    autoLeave,
    teleopPark,
  } = recorder;

  const mustBeginMatch = isReady && !isRecording;

  const nudgeToBeginMatch = useCallback(() => {
    if (!mustBeginMatch) return;

    beginMatchButtonRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "center",
    });

    requestAnimationFrame(() => {
      beginMatchButtonRef.current?.focus?.();
    });

    setStartMatchToastVisible(true);
    if (startMatchToastTimeoutRef.current) {
      clearTimeout(startMatchToastTimeoutRef.current);
    }
    startMatchToastTimeoutRef.current = setTimeout(() => {
      setStartMatchToastVisible(false);
    }, 2200);
  }, [mustBeginMatch]);

  useEffect(() => {
    if (!mustBeginMatch) setStartMatchToastVisible(false);
  }, [mustBeginMatch]);

  useEffect(() => {
    return () => {
      if (startMatchToastTimeoutRef.current) {
        clearTimeout(startMatchToastTimeoutRef.current);
      }
    };
  }, []);

  const { keyEntry, keyEntryVisible } = useKeyboardCycleEntry({
    enabled: isRecording,
    blocked: false,
    elapsedTime,
    mode,
    phase,
    onAddCycle: ({ total, scored }) => recorder.addCycle({ total, scored }),
    onAddGate: () => recorder.addGate(),
  });

  const totalScored = useMemo(() => {
    return events
      .filter((e) => e.type === "cycle")
      .reduce((sum, e) => sum + e.scored, 0);
  }, [events]);

  const totalBalls = useMemo(() => {
    return events
      .filter((e) => e.type === "cycle")
      .reduce((sum, e) => sum + e.total, 0);
  }, [events]);

  const cycleCount = useMemo(() => {
    return events.filter((e) => e.type === "cycle").length;
  }, [events]);

  const accuracy = useMemo(() => {
    if (totalBalls === 0) return 0;
    return Math.round((totalScored / totalBalls) * 100);
  }, [totalScored, totalBalls]);

  const pointsBreakdown = useMemo(() => {
    return calculateTotalPoints({
      events,
      motif,
      autoPattern,
      teleopPattern,
      autoLeave,
      teleopPark,
    });
  }, [events, motif, autoPattern, teleopPattern, autoLeave, teleopPark]);

  const [showPointsEntry, setShowPointsEntry] = useState(true);

  const autoSaveRef = useRef(false);

  useEffect(() => {
    if (!matchStartTime) {
      setMatchDate("");
      return;
    }
    const d = new Date(matchStartTime);
    if (Number.isNaN(d.getTime())) {
      setMatchDate("");
      return;
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    setMatchDate(`${year}-${month}-${day}`);
  }, [matchStartTime]);

  useEffect(() => {
    if (initialTitle !== undefined && initialTitle !== null) {
      setTitle(initialTitle);
    }
  }, [initialTitle]);

  useEffect(() => {
    if (initialTournamentName !== undefined && initialTournamentName !== null) {
      setTournamentName(initialTournamentName);
    }
  }, [initialTournamentName]);

  useEffect(() => {
    if (!user) {
      setKnownTournaments([]);
      return;
    }

    const load = async () => {
      try {
        const data = await listMatchesForCurrentUser();
        const names = Array.from(
          new Set(
            data.map((m) => (m.tournamentName || "").trim()).filter(Boolean),
          ),
        ).sort((a, b) => a.localeCompare(b));
        setKnownTournaments(names);
      } catch {
        // ignore
      }
    };

    load();
  }, [user]);

  useEffect(() => {
    if (loadedMatchId) {
      setHasSavedThisSession(true);
    }
  }, [loadedMatchId]);

  const matchText = useMemo(
    () =>
      formatMatchText({
        events,
        notes,
        teamNumber,
        matchStartTime,
        timerDuration,
        elapsedTime,
      }),
    [events, notes, teamNumber, matchStartTime, timerDuration, elapsedTime],
  );

  const autoText = useMemo(
    () =>
      formatPhaseMatchText({
        events,
        notes,
        teamNumber,
        matchStartTime,
        timerDuration,
        elapsedTime,
        mode,
        phaseFilter: "auto",
        autoDuration: matchRecorderConstants.AUTO_DURATION,
        bufferDuration: matchRecorderConstants.BUFFER_DURATION,
        teleopDuration: matchRecorderConstants.TELEOP_DURATION,
      }),
    [
      events,
      notes,
      teamNumber,
      matchStartTime,
      timerDuration,
      elapsedTime,
      mode,
    ],
  );

  const teleopText = useMemo(
    () =>
      formatPhaseMatchText({
        events,
        notes,
        teamNumber,
        matchStartTime,
        timerDuration,
        elapsedTime,
        mode,
        phaseFilter: "teleop",
        autoDuration: matchRecorderConstants.AUTO_DURATION,
        bufferDuration: matchRecorderConstants.BUFFER_DURATION,
        teleopDuration: matchRecorderConstants.TELEOP_DURATION,
      }),
    [
      events,
      notes,
      teamNumber,
      matchStartTime,
      timerDuration,
      elapsedTime,
      mode,
    ],
  );

  const copyWithFeedback = (text, setCopied) => {
    return navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return true;
      })
      .catch(() => false);
  };

  const getShareUrl = async (text) => {
    if (shareUrlCacheRef.current.has(text)) {
      return shareUrlCacheRef.current.get(text);
    }

    const encoded = btoa(text);

    let url;
    try {
      const key = await createPaste(encoded);
      url = `${window.location.origin}/?p=${encodeURIComponent(key)}`;
    } catch {
      url = `${window.location.origin}/?mt=${encodeURIComponent(encoded)}`;
    }

    shareUrlCacheRef.current.set(text, url);
    return url;
  };

  const copyUrlWithFeedback = async (text, setCopied) => {
    const url = await getShareUrl(text);
    const ok = await copyWithFeedback(url, setCopied);
    if (ok) clearRecoveryMatch();
  };

  const shareUrl = async (text, label) => {
    const url = await getShareUrl(text);

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Heron Scout",
          text: label,
          url,
        });
        clearRecoveryMatch();
        return;
      } catch {
        // ignore and fall through
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      alert("Share URL copied to clipboard!");
      clearRecoveryMatch();
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
      clearRecoveryMatch();
    }
  };

  const buildMatchPayload = useCallback(
    () => ({
      startTime: (() => {
        if (matchDate) {
          const dateOnly = new Date(matchDate);
          if (!Number.isNaN(dateOnly.getTime())) {
            if (matchStartTime) {
              const existing = new Date(matchStartTime);
              const combined = new Date(
                dateOnly.getFullYear(),
                dateOnly.getMonth(),
                dateOnly.getDate(),
                existing.getHours(),
                existing.getMinutes(),
                existing.getSeconds(),
                existing.getMilliseconds(),
              );
              return combined.getTime();
            }
            return dateOnly.getTime();
          }
        }
        return matchStartTime;
      })(),
      duration: timerDuration,
      teamNumber,
      events,
      notes: notes || "",
      title: title || "",
      tournamentName: tournamentName || "",
      // Scoring fields
      motif: motif || null,
      autoPattern: autoPattern || "",
      teleopPattern: teleopPattern || "",
      autoLeave: autoLeave ?? false,
      teleopPark: teleopPark || "none",
    }),
    [
      matchDate,
      matchStartTime,
      timerDuration,
      teamNumber,
      events,
      notes,
      title,
      tournamentName,
      motif,
      autoPattern,
      teleopPattern,
      autoLeave,
      teleopPark,
    ],
  );

  const exportMatchJson = () => {
    const data = buildMatchPayload();

    downloadJson(`match-${new Date().toISOString()}.json`, data);
    clearRecoveryMatch();

    logEvent(analytics, "export_match_json", {
      numEvents: events.length,
      totalScored,
      totalBalls,
    });
  };

  const handleSaveToAccount = useCallback(async () => {
    if (!events.length) return;
    if (!user) {
      alert("Sign in (top right) to save matches to your account.");
      return;
    }

    try {
      setSaveStatus("saving");
      const payload = buildMatchPayload();
      if (loadedMatchId) {
        await saveMatchEdits(loadedMatchId, payload);
      } else {
        await createMatchForUser(user.id, payload, "recorder");
      }
      setSaveStatus("saved");
      setHasSavedThisSession(true);
      clearRecoveryMatch();
      setTimeout(() => setSaveStatus("idle"), 2000);
      return true;
    } catch (error) {
      console.error(error);
      posthog.capture("save_match_error", {
        message: error?.message || "Unknown error",
        hasUser: Boolean(user),
        eventCount: events.length,
        loadedMatchId: loadedMatchId || null,
      });
      alert(
        "Failed to save match. Please try again. Hint: Are you on the robot wifi? Tip: Save as JSON just in case to avoid data loss.",
      );
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 2000);
      return false;
    }
  }, [events, user, loadedMatchId, buildMatchPayload, posthog]);

  useEffect(() => {
    if (isRecording) return;
    if (events.length > 0) return;
    if (recoveryDismissed) return;
    const rec = loadRecoveryMatch();
    if (rec?.payload?.events?.length) {
      setRecovery(rec);
    }
  }, [isRecording, events.length, recoveryDismissed]);

  useEffect(() => {
    if (!user) return;

    const pendingId = getPendingMatchSyncId();
    if (!pendingId) return;

    const syncPending = async () => {
      try {
        setSaveStatus("saving");

        let payload = null;
        if (pendingId.startsWith("local_")) {
          payload = getLocalMatches().find((m) => m.id === pendingId) || null;
        }
        if (!payload) {
          payload = loadRecoveryMatch()?.payload || null;
        }

        if (!payload) {
          clearPendingMatchSyncId();
          setSaveStatus("idle");
          return;
        }

        await createMatchForUser(user.id, payload, "pending_signup");

        if (pendingId.startsWith("local_")) {
          markLocalMatchSynced(pendingId);
        }

        clearPendingMatchSyncId();
        clearRecoveryMatch();
        setHasSavedThisSession(true);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch (err) {
        console.error(err);
        setSaveStatus("error");
        setTimeout(() => setSaveStatus("idle"), 2000);
      }
    };

    syncPending();
  }, [user]);

  useEffect(() => {
    if (!isRecording && events.length === 0) {
      setHasSavedThisSession(false);
      autoSaveRef.current = false;
      localSaveRef.current = false;
    }
  }, [isRecording, events.length]);

  // Track match finish, auto-save, local save, and load previous matches for comparison
  useEffect(() => {
    if (wasRecordingRef.current && !isRecording) {
      const totalCycles = events.filter((e) => e.type === "cycle").length;
      const finishReason = wasManualStopRef.current ? "manual_stop" : "timeout";

      if (events.length) {
        saveRecoveryMatch(buildMatchPayload());
      }

      posthog.capture("finish_match", {
        finishReason,
        teamNumber,
        totalCycles,
        matchDuration: elapsedTime,
        mode,
      });

      if (
        user &&
        events.length &&
        !autoSaveRef.current &&
        !hasSavedThisSession
      ) {
        handleSaveToAccount();
        autoSaveRef.current = true;
      }

      // Save locally when not signed in
      if (!user && events.length && !localSaveRef.current) {
        const local = saveLocalMatch(buildMatchPayload());
        lastLocalMatchIdRef.current = local?.id || null;
        localSaveRef.current = true;
        clearRecoveryMatch();
      }

      // Load previous matches for comparison
      const loadPrevious = async () => {
        try {
          const sources = [];
          if (user) {
            const remote = await listMatchesForCurrentUser();
            sources.push(...remote);
          }
          const local = getLocalMatches().filter((m) => !m.synced);
          sources.push(...local);

          // Exclude the match we just recorded (by checking events length/timestamp similarity)
          const prev = sources.filter(
            (m) => m.events && m.events.length > 0 && m.id !== loadedMatchId,
          );
          if (prev.length > 0) {
            setPreviousMatches(prev);
          }
        } catch {
          // ignore comparison load errors
        }
      };
      loadPrevious();

      wasManualStopRef.current = false;
    }

    if (!wasRecordingRef.current && isRecording) {
      autoSaveRef.current = false;
      localSaveRef.current = false;
      setPreviousMatches(null);
    }

    wasRecordingRef.current = isRecording;
  }, [
    isRecording,
    events,
    teamNumber,
    elapsedTime,
    mode,
    posthog,
    user,
    hasSavedThisSession,
    handleSaveToAccount,
    buildMatchPayload,
    loadedMatchId,
    saveRecoveryMatch,
    saveLocalMatch,
    clearRecoveryMatch,
    getLocalMatches,
    listMatchesForCurrentUser,
  ]);

  // Softer, on-brand phase colors with good contrast
  const getPhaseClass = () => {
    switch (phase) {
      case "auto":
        return "phase-auto";
      case "buffer":
        return "phase-buffer";
      case "teleop":
        return "phase-teleop";
      case "finished":
        return "phase-finished";
      default:
        return "phase-default";
    }
  };

  const getPhaseLabel = () => {
    switch (phase) {
      case "auto":
        return { text: "AUTO", icon: <Timer size={18} weight="bold" /> };
      case "buffer":
        return { text: "BUFFER", icon: <Clock size={18} weight="bold" /> };
      case "teleop":
        return { text: "TELEOP", icon: <Crosshair size={18} weight="bold" /> };
      case "finished":
        return {
          text: "COMPLETE",
          icon: <CheckCircle size={18} weight="bold" />,
        };
      default:
        return { text: "RECORDING", icon: <Record size={18} weight="fill" /> };
    }
  };

  const phaseInfo = getPhaseLabel();

  // Calculate display time based on mode and phase
  const displayTime = useMemo(() => {
    // Only apply special formatting for full matches
    if (mode !== "match") {
      return formatTime(elapsedTime);
    }

    const { AUTO_DURATION, BUFFER_DURATION, TELEOP_DURATION } =
      matchRecorderConstants;
    const elapsedSeconds = elapsedTime / 1000;
    const elapsedMs = elapsedTime;

    if (phase === "auto" || elapsedSeconds < AUTO_DURATION) {
      // Count UP from 0 to 30
      const autoTimeMs = Math.min(elapsedMs, AUTO_DURATION * 1000);
      return formatTime(autoTimeMs);
    } else if (
      phase === "buffer" ||
      elapsedSeconds < AUTO_DURATION + BUFFER_DURATION
    ) {
      // Count DOWN from 8 to 0
      const bufferElapsedMs = elapsedMs - AUTO_DURATION * 1000;
      const bufferRemainingMs = Math.max(
        0,
        BUFFER_DURATION * 1000 - bufferElapsedMs,
      );
      return formatTime(bufferRemainingMs);
    } else if (
      phase === "teleop" ||
      elapsedSeconds < AUTO_DURATION + BUFFER_DURATION + TELEOP_DURATION
    ) {
      // Count DOWN from 120 (2:00) to 0
      const teleopElapsedMs =
        elapsedMs - (AUTO_DURATION + BUFFER_DURATION) * 1000;
      const teleopRemainingMs = Math.max(
        0,
        TELEOP_DURATION * 1000 - teleopElapsedMs,
      );
      return formatTime(teleopRemainingMs);
    } else {
      // Finished - show 0:00.000
      return formatTime(0);
    }
  }, [elapsedTime, mode, phase]);

  return (
    <div className="w-full max-w-6xl space-y-5">
      {/* Timeline - Full width anchor at top */}
      <Timeline events={events} currentTime={elapsedTime} mode={mode} />

      {/* Timer Display - Prominent and centered */}
      <div
        className={`${getPhaseClass()} relative overflow-hidden rounded-2xl shadow-lg`}
      >
        {/* Gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/20 pointer-events-none" />

        <div className="relative p-6 pb-15">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            {/* Phase badge */}
            {mode === "match" && (
              <div className="flex items-center gap-2.5 text-white bg-black/20 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
                {phaseInfo.icon}
                <span className="text-sm font-bold tracking-wider">
                  {phaseInfo.text}
                </span>
              </div>
            )}

            {/* Live stats */}
            <div className="flex items-center gap-5 text-white">
              <div className="flex items-center gap-2 bg-black/20 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                <Target size={18} weight="bold" />
                <span className="font-mono font-bold text-lg">
                  {totalScored}/{totalBalls}
                </span>
              </div>
              <div className="bg-black/20 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                <span className="font-mono font-bold text-lg">{accuracy}%</span>
              </div>
              <div className="bg-black/20 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                <span className="text-sm font-semibold">
                  {cycleCount} cycles
                </span>
              </div>
            </div>
          </div>

          {/* Main timer - Centered and huge */}
          <div className="text-center">
            <h2 className="text-6xl sm:text-7xl md:text-8xl font-mono font-bold tracking-tight text-white drop-shadow-lg">
              {displayTime}
            </h2>
          </div>
        </div>
      </div>

      {/* Recording Controls - Clear action area */}
      <div className="space-y-4">
        {isReady && !isRecording && (
          <div className="section-card bg-gradient-to-br from-brand-accent/10 to-brand-accent/5 border-brand-accent">
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold text-brand-accent mb-2">
                Ready to Record
              </h3>
              <p className="text-sm text-brand-text">
                Click below to start the match timer
              </p>
            </div>
            <button
              ref={beginMatchButtonRef}
              onClick={() => recorder.beginMatch()}
              className="button button-large w-full max-w-md mx-auto flex items-center justify-center gap-3 animate-pulse hover:animate-none"
            >
              <Play size={28} weight="fill" />
              <span>Begin Match</span>
            </button>
          </div>
        )}

        {/* Recording Active - Prominent controls */}
        {isRecording && (
          <div className="section-card border-brand-accent bg-gradient-to-br from-brand-surface to-brand-surfaceStrong">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-brand-border">
              <h3 className="text-lg font-bold text-brand-accent flex items-center gap-2">
                <Record size={20} weight="fill" className="animate-pulse" />
                Recording in Progress
              </h3>
            </div>

            {/* Quick Cycle Grid */}
            <QuickCycleGrid
              onAddCycle={({ total, scored }) =>
                recorder.addCycle({ total, scored })
              }
              onUndo={recorder.undoLastEvent}
              eventCount={events.length}
            />

            {/* Gate and Stop row */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <button
                onClick={() => recorder.addGate()}
                className="btn py-4 justify-center text-base"
              >
                <DoorOpen size={22} weight="bold" />
                Add Gate
              </button>

              <button
                onClick={() => {
                  wasManualStopRef.current = true;
                  recorder.stopMatch();
                }}
                className="error-btn py-4 justify-center text-base"
              >
                <Stop size={20} weight="fill" />
                Stop Match
              </button>
            </div>
          </div>
        )}

        {/* Post-match actions */}
        {!isReady && events.length > 0 && (
          <div className="section-card bg-gradient-to-br from-green-500/5 to-green-500/10 border-green-500/30">
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold text-green-400 mb-2 flex items-center justify-center gap-2">
                <CheckCircle size={24} weight="fill" />
                Match Complete!
              </h3>
              <p className="text-sm text-brand-text">
                Share your results or start a new match
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div></div>
              <button
                onClick={() => shareUrl(matchText, "Match data link")}
                className="button py-4 flex items-center justify-center gap-2"
              >
                <ShareNetwork size={20} weight="bold" />
                Share
              </button>

              {user && (
                <button
                  onClick={handleSaveToAccount}
                  disabled={saveStatus === "saving"}
                  className="btn py-4 flex items-center justify-center gap-2"
                >
                  <FloppyDisk size={20} weight="bold" />
                  {saveStatus === "saving"
                    ? "Saving..."
                    : saveStatus === "saved"
                      ? "Saved"
                      : "Save"}
                </button>
              )}

              <button
                onClick={() => recorder.resetMatch()}
                className="btn py-4 flex items-center justify-center gap-2"
              >
                <ArrowClockwise size={20} weight="bold" />
                New Match
              </button>
            </div>
          </div>
        )}

        {!isReady && events.length === 0 && (
          <div className="text-center">
            <button
              onClick={() => recorder.resetMatch()}
              className="btn px-6 py-3"
            >
              <ArrowClockwise size={20} weight="bold" />
              Start New Match
            </button>
          </div>
        )}

        {/* Quick Guide - Inline when recording, hidden on mobile */}
        {isRecording && (
          <div className="hidden sm:block card-compact bg-brand-bg/50">
            <button
              onClick={() => setShowQuickGuide(!showQuickGuide)}
              className="w-full flex items-center justify-between transition-colors"
            >
              <span className="flex items-center gap-2.5 text-brand-text font-medium">
                <Keyboard
                  size={18}
                  weight="duotone"
                  className="text-brand-accent"
                />
                Keyboard Shortcuts
              </span>
              <CaretDown
                size={16}
                weight="bold"
                className={`text-brand-accent transition-transform ${
                  showQuickGuide ? "" : "-rotate-90"
                }`}
              />
            </button>

            {showQuickGuide && (
              <div className="mt-3 pt-3 border-t border-brand-border">
                <div className="flex flex-wrap items-center gap-2.5 text-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="kbd">1</span>
                    <span className="kbd">2</span>
                    <span className="kbd">3</span>
                    <span className="text-brand-text text-xs">=balls</span>
                  </div>
                  <ArrowFatLineRight size={14} className="text-brand-accent" />
                  <div className="flex items-center gap-1.5">
                    <span className="kbd">0</span>
                    <span className="text-xs text-brand-text">to</span>
                    <span className="kbd">3</span>
                    <span className="text-brand-text text-xs">=scored</span>
                  </div>
                  <ArrowFatLineRight size={14} className="text-brand-accent" />
                  <div className="flex items-center gap-1.5">
                    <span className="kbd">Enter</span>
                  </div>
                  <div className="h-4 w-px bg-brand-border" />
                  <div className="flex items-center gap-1.5">
                    <span className="kbd">G</span>
                    <span className="text-brand-text text-xs">=gate</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        {
          <div className="section-card relative">
            {mustBeginMatch && (
              <button
                type="button"
                aria-label="Start match to enable points entry"
                onPointerDown={(e) => {
                  e.preventDefault();
                  nudgeToBeginMatch();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    nudgeToBeginMatch();
                  }
                }}
                className="mx-auto inset-0 z-20 cursor-not-allowed bg-brand-bg/60 backdrop-blur-[2px] rounded-2xl flex items-center justify-center"
              >
                <div className="bg-brand-dangerBg border-1 border-brand-danger px-6 py-3 text-brand-danger font-semibold flex flex-row items-center justify-center gap-2 rounded-xl shadow-lg">
                  <p className="">Start the match first</p>
                  <ArrowUpIcon weight="bold" />
                </div>
              </button>
            )}

            <button
              onClick={() => {
                if (mustBeginMatch) {
                  nudgeToBeginMatch();
                  return;
                }
                setShowPointsEntry(!showPointsEntry);
              }}
              className="w-full flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-accentBg flex items-center justify-center">
                  <Palette
                    size={20}
                    weight="duotone"
                    className="text-brand-accent"
                  />
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-bold text-brand-main-text">
                    Scoring Details
                  </h3>
                  <p className="text-xs text-brand-text">
                    Motif patterns & bonus points
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-brand-accent text-over-accent px-4 py-2 rounded-lg font-bold">
                  {pointsBreakdown.total} pts
                </div>
                <CaretDown
                  size={18}
                  weight="bold"
                  className={`text-brand-accent transition-transform ${showPointsEntry ? "" : "-rotate-90"}`}
                />
              </div>
            </button>

            {showPointsEntry && (
              <div className="mt-6 pt-6 border-t border-brand-border space-y-5">
                {/* Motif Selector */}
                <div className="bg-brand-bg/50 rounded-xl p-4 border border-brand-border">
                  <label className="flex items-center gap-2 text-sm font-bold mb-3 text-brand-accent">
                    <Palette size={18} weight="bold" />
                    Motif Pattern
                  </label>
                  <select
                    value={motif || ""}
                    onChange={(e) => recorder.setMotif(e.target.value || null)}
                    disabled={mustBeginMatch}
                    className="w-full px-4 py-3 border-2 border-brand-border focus:border-brand-accent outline-none rounded-xl text-base font-medium text-brand-main-text disabled:opacity-60 disabled:cursor-not-allowed bg-brand-surface"
                  >
                    <option value="">Select motif pattern...</option>
                    <option value="GPP">GPP</option>
                    <option value="PGP">PGP</option>
                    <option value="PPG">PPG</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <PatternInput
                    label="Auto Pattern (end of auto)"
                    value={autoPattern}
                    onChange={recorder.setAutoPattern}
                    motif={motif}
                    disabled={mustBeginMatch || !motif}
                  />
                  <PatternInput
                    label="Teleop Pattern (end of teleop)"
                    value={teleopPattern}
                    onChange={recorder.setTeleopPattern}
                    motif={motif}
                    disabled={mustBeginMatch || !motif}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold mb-2">
                      <Car
                        size={16}
                        weight="bold"
                        className="text-brand-accent"
                      />
                      Auto Leave
                    </label>
                    <label
                      className={`flex items-center gap-3 p-3 border-2 border-brand-border rounded-xl transition-colors ${
                        mustBeginMatch
                          ? "cursor-not-allowed opacity-60"
                          : "cursor-pointer hover:border-brand-accent"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={autoLeave}
                        onChange={(e) =>
                          recorder.setAutoLeave(e.target.checked)
                        }
                        disabled={mustBeginMatch}
                        className="w-5 h-5 accent-brand-accent disabled:cursor-not-allowed"
                      />
                      <span className="text-sm">
                        Robot left launch line (+3 pts)
                      </span>
                    </label>
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold mb-2">
                      <Flag
                        size={16}
                        weight="bold"
                        className="text-brand-accent"
                      />
                      Teleop Park
                    </label>
                    <select
                      value={teleopPark}
                      onChange={(e) => recorder.setTeleopPark(e.target.value)}
                      disabled={mustBeginMatch}
                      className="w-full px-3 py-2 border-2 border-brand-border focus:border-brand-accent outline-none rounded text-sm  text-brand-text disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="none">None (0 pts)</option>
                      <option value="partial">Partial (5 pts)</option>
                      <option value="full">Full (10 pts)</option>
                    </select>
                  </div>
                </div>

                <div className=" border border-brand-border bg-brand-bg rounded-lg p-4">
                  <h4 className="font-semibold text-sm mb-3 text-brand-accent">
                    Points Breakdown
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div className="text-center p-2 rounded border-brand-border">
                      <div
                        className={`text-2xl font-bold ${
                          pointsBreakdown.artifact === 0
                            ? "text-brand-muted"
                            : "text-brand-accent"
                        }`}
                      >
                        {pointsBreakdown.artifact}
                      </div>
                      <div
                        className={`text-xs ${
                          pointsBreakdown.artifact === 0
                            ? "text-brand-muted"
                            : "text-brand-text"
                        }`}
                      >
                        Artifact ({totalScored}x3)
                      </div>
                    </div>
                    <div className="text-center p-2 rounded border-brand-border">
                      <div
                        className={`text-2xl font-bold ${
                          pointsBreakdown.motif.total === 0
                            ? "text-brand-muted"
                            : "text-brand-accent"
                        }`}
                      >
                        {pointsBreakdown.motif.total}
                      </div>
                      <div
                        className={`text-xs ${
                          pointsBreakdown.motif.total === 0
                            ? "text-brand-muted"
                            : "text-brand-text"
                        }`}
                      >
                        Motif ({pointsBreakdown.motif.auto}+
                        {pointsBreakdown.motif.teleop})
                      </div>
                    </div>
                    <div className="text-center p-2 rounded border-brand-border">
                      <div
                        className={`text-2xl font-bold ${
                          pointsBreakdown.leave === 0
                            ? "text-brand-muted"
                            : "text-brand-accent"
                        }`}
                      >
                        {pointsBreakdown.leave}
                      </div>
                      <div
                        className={`text-xs ${
                          pointsBreakdown.leave === 0
                            ? "text-brand-muted"
                            : "text-brand-text"
                        }`}
                      >
                        Leave
                      </div>
                    </div>
                    <div className="text-center p-2 rounded border-brand-border">
                      <div
                        className={`text-2xl font-bold ${
                          pointsBreakdown.park === 0
                            ? "text-brand-muted"
                            : "text-brand-accent"
                        }`}
                      >
                        {pointsBreakdown.park}
                      </div>
                      <div
                        className={`text-xs ${
                          pointsBreakdown.park === 0
                            ? "text-brand-muted"
                            : "text-brand-text"
                        }`}
                      >
                        Park
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-brand-border text-center">
                    <span className="text-sm text-brand-text">
                      Total Points:
                    </span>
                    <span className="text-3xl font-bold text-brand-accent ml-2">
                      {pointsBreakdown.total}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        }

        {/* Match Details - Organized section */}
        <div className="section-card">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-brand-accentBg flex items-center justify-center">
              <Note size={20} weight="duotone" className="text-brand-accent" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-brand-main-text">
                Match Information
              </h3>
              <p className="text-xs text-brand-text">
                Team, tournament, and notes
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-brand-accent mb-2">
                Match Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Quals 12, Finals 2, Practice Match"
                className="w-full px-4 py-3 border-2 border-brand-border focus:border-brand-accent outline-none rounded-xl text-base text-brand-main-text bg-brand-surface font-medium"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-brand-accent mb-2">
                  Team Number
                </label>
                <input
                  type="number"
                  value={teamNumber}
                  onChange={(e) => recorder.setTeamNumber(e.target.value)}
                  placeholder="e.g. 12345"
                  className="w-full px-4 py-3 border-2 border-brand-border focus:border-brand-accent outline-none rounded-xl text-base font-mono text-brand-main-text bg-brand-surface"
                  min="1"
                  max="99999"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-brand-accent mb-2">
                  Match Date
                </label>
                <input
                  type="date"
                  value={matchDate}
                  onChange={(e) => setMatchDate(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-brand-border focus:border-brand-accent outline-none rounded-xl text-base text-brand-main-text bg-brand-surface"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-brand-accent mb-2">
                Tournament{" "}
                <span className="text-brand-text font-normal text-xs">
                  (optional)
                </span>
              </label>
              <input
                type="text"
                value={tournamentName}
                onChange={(e) => setTournamentName(e.target.value)}
                placeholder="e.g. State Championship, League Meet"
                className="w-full px-4 py-3 border-2 border-brand-border focus:border-brand-accent outline-none rounded-xl text-base text-brand-main-text bg-brand-surface"
              />
              {knownTournaments.length > 0 && (
                <select
                  value=""
                  onChange={(e) => {
                    if (!e.target.value) return;
                    setTournamentName(e.target.value);
                  }}
                  className="mt-2 w-full sm:w-auto px-3 py-2 border border-brand-border focus:border-brand-accent outline-none rounded-lg text-sm text-brand-text bg-brand-bg"
                >
                  <option value="">Select from previous tournaments...</option>
                  {knownTournaments.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-brand-accent mb-2">
                Match Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => recorder.setNotes(e.target.value)}
                placeholder="Add notes about defense, robot performance, strategy..."
                className="w-full px-4 py-3 border-2 border-brand-border focus:border-brand-accent outline-none resize-none rounded-xl text-base text-brand-main-text bg-brand-surface min-h-[100px]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Post-match comparison */}
      {!isRecording && events.length > 0 && previousMatches && (
        <PostMatchComparison
          currentMatch={buildMatchPayload()}
          previousMatches={previousMatches}
        />
      )}

      {/* Statistics */}
      {events.length > 0 && (
        <Statistics
          events={events}
          teamNumber={teamNumber}
          notes={notes}
          motif={motif}
          autoPattern={autoPattern}
          teleopPattern={teleopPattern}
          autoLeave={autoLeave}
          teleopPark={teleopPark}
        />
      )}

      {/* Export Panel */}
      {!isRecording && events.length > 0 && (
        <MatchDataPanel
          mode={mode}
          matchText={matchText}
          autoText={autoText}
          teleopText={teleopText}
          onCopyFullText={() => copyWithFeedback(matchText, setCopiedFull)}
          copiedFull={copiedFull}
          onShareFull={() => shareUrl(matchText, "Match data link")}
          onCopyFullUrl={() => copyUrlWithFeedback(matchText, setCopiedFullUrl)}
          copiedFullUrl={copiedFullUrl}
          onCopyAutoText={() => copyWithFeedback(autoText, setCopiedAuto)}
          copiedAuto={copiedAuto}
          onShareAuto={() => shareUrl(autoText, "Auto-only match data link")}
          onCopyAutoUrl={() => copyUrlWithFeedback(autoText, setCopiedAutoUrl)}
          copiedAutoUrl={copiedAutoUrl}
          onCopyTeleopText={() => copyWithFeedback(teleopText, setCopiedTeleop)}
          copiedTeleop={copiedTeleop}
          onShareTeleop={() =>
            shareUrl(teleopText, "TeleOp-only match data link")
          }
          onCopyTeleopUrl={() =>
            copyUrlWithFeedback(teleopText, setCopiedTeleopUrl)
          }
          copiedTeleopUrl={copiedTeleopUrl}
          onExportJson={exportMatchJson}
          onSaveToAccount={handleSaveToAccount}
          saveStatus={saveStatus}
        />
      )}

      {user &&
        !isRecording &&
        events.length > 0 &&
        !loadedMatchId &&
        !hasSavedThisSession && (
          <SaveMatchPromptToast
            onSave={handleSaveToAccount}
            onDismiss={() => setHasSavedThisSession(true)}
          />
        )}

      {!user &&
        !isRecording &&
        events.length > 0 &&
        !loadedMatchId &&
        !hasSavedThisSession && (
          <SignUpPromptToast
            onSign={() => {
              if (lastLocalMatchIdRef.current) {
                setPendingMatchSyncId(lastLocalMatchIdRef.current);
              } else {
                const payload = buildMatchPayload();
                if (payload?.events?.length) {
                  saveRecoveryMatch(payload);
                  setPendingMatchSyncId("recovery");
                }
              }
              document.querySelector("[data-auth-modal-trigger]")?.click();
            }}
            onDismiss={() => setHasSavedThisSession(true)}
          />
        )}

      {!isRecording &&
        events.length === 0 &&
        recovery &&
        !recoveryDismissed && (
          <RecoverUnsavedMatchToast
            onRecover={() => {
              const ok = recorder.applyParsedMatchData(recovery.payload);
              if (ok) {
                setRecovery(null);
              }
            }}
            onDismiss={() => {
              setRecoveryDismissed(true);
            }}
          />
        )}

      <KeyboardEntryToast visible={keyEntryVisible} keyEntry={keyEntry} />
      <StartMatchToBeginToast visible={startMatchToastVisible} />
    </div>
  );
}

function RecoverUnsavedMatchToast({ onRecover, onDismiss }) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:bottom-4 sm:right-4 z-50 w-[min(24rem,calc(100vw-1.5rem))]">
      <div className="bg-brand-surface border-2 border-brand-border shadow-lg p-4 w-full">
        <div className="text-sm font-semibold text-brand-main-text mb-1">
          Recover unsaved match?
        </div>
        <div className="text-xs text-brand-text mb-3">
          We found a finished match that wasn&apos;t saved.
        </div>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onDismiss}
            className="text-xs px-3 py-1.5 border border-brand-border rounded hover: text-brand-text"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={onRecover}
            className="btn !py-2 !px-3 !text-xs flex items-center gap-2 bg-brand-surface!"
          >
            Recover
          </button>
        </div>
      </div>
    </div>
  );
}

function StartMatchToBeginToast({ visible }) {
  if (!visible) return null;

  return (
    <div className="fixed top-14 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:top-4 sm:right-4 z-50 w-[min(22rem,calc(100vw-1.5rem))]">
      <div className="card shadow p-4 w-full">
        <div className="text-sm font-semibold text-brand-text">
          Start the match to begin recording.
        </div>
      </div>
    </div>
  );
}

function SaveMatchPromptToast({ onSave, onDismiss }) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:bottom-4 sm:right-4 z-50 w-[min(22rem,calc(100vw-1.5rem))]">
      <div className="bg-brand-surface border-2 border-brand-border shadow p-4 w-full">
        <div className="text-sm font-semibold text-brand-text mb-1">
          Save match?
        </div>
        <div className="text-xs text-brand-text mb-3">
          You&apos;re viewing a match that isn&apos;t saved to your account.
        </div>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onDismiss}
            className="text-xs px-3 py-1.5 border border-brand-border rounded hover: text-brand-text"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={onSave}
            className="btn !py-2 !px-3 !text-xs flex items-center gap-2 bg-brand-surface!"
          >
            <FloppyDisk size={14} weight="bold" />
            Save to My Matches
          </button>
        </div>
      </div>
    </div>
  );
}

function SignUpPromptToast({ onSign, onDismiss }) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:bottom-4 sm:right-4 z-50 w-[min(22rem,calc(100vw-1.5rem))]">
      <div className=" border-2 border-brand-border shadow-lg p-4 w-full bg-brand-surface shadow-brand-shadow">
        <div className="text-sm font-semibold text-brand-main-text mb-1">
          Sign up?
        </div>
        <div className="text-xs text-brand-text mb-3">
          Sign up to save matches to your team account and access them later.
        </div>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onDismiss}
            className="text-xs px-3 py-1.5 border border-brand-border rounded hover: text-brand-text"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={onSign}
            className="btn !py-2 !px-3 !text-xs flex items-center gap-2 bg-brand-surface!"
          >
            <UserPlus size={14} weight="bold" />
            Sign up
          </button>
        </div>
      </div>
    </div>
  );
}

export default MatchRecorderScreen;
