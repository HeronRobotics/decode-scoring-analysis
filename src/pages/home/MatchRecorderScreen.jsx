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
} from "@phosphor-icons/react";
import { logEvent } from "firebase/analytics";
import { usePostHog } from "posthog-js/react";
import { analytics } from "../../firebase";

import Timeline from "../../components/Timeline";
import Statistics from "../../components/Statistics";
import CycleModal from "../../components/home/modals/CycleModal";
import KeyboardEntryToast from "../../components/home/KeyboardEntryToast";
import MatchDataPanel from "../../components/home/MatchDataPanel";
import PatternInput from "../../components/home/PatternInput";
import { calculateTotalPoints } from "../../utils/scoring";

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
  const [showCycleModal, setShowCycleModal] = useState(false);
  const [cycleData, setCycleData] = useState({ total: 1, scored: 0 });
  const [showQuickGuide, setShowQuickGuide] = useState(false);

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

  const posthog = usePostHog();
  const wasRecordingRef = useRef(false);
  const wasManualStopRef = useRef(false);
  const shareUrlCacheRef = useRef(new Map());
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
    // Scoring state
    motif,
    autoPattern,
    teleopPattern,
    autoLeave,
    teleopPark,
  } = recorder;

  const { keyEntry, keyEntryVisible } = useKeyboardCycleEntry({
    enabled: isRecording,
    blocked: showCycleModal,
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
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
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
    copyWithFeedback(url, setCopied);
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
        return;
      } catch {
        // ignore and fall through
      }
    }

    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const buildMatchPayload = () => ({
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
  });

  const exportMatchJson = () => {
    const data = buildMatchPayload();

    downloadJson(`match-${new Date().toISOString()}.json`, data);

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
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error) {
      console.error(error);
      alert("Failed to save match. Please try again.");
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 2000);
    }
  }, [events, user, loadedMatchId, buildMatchPayload]);

  useEffect(() => {
    if (!isRecording && events.length === 0) {
      setHasSavedThisSession(false);
      autoSaveRef.current = false;
    }
  }, [isRecording, events.length]);

  // Track match finish with PostHog and auto-save for logged-in users
  useEffect(() => {
    if (wasRecordingRef.current && !isRecording) {
      const totalCycles = events.filter((e) => e.type === "cycle").length;
      const finishReason = wasManualStopRef.current ? "manual_stop" : "timeout";

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

      wasManualStopRef.current = false;
    }

    if (!wasRecordingRef.current && isRecording) {
      autoSaveRef.current = false;
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
  ]);

  const confirmCycle = () => {
    recorder.addCycle({ total: cycleData.total, scored: cycleData.scored });
    setShowCycleModal(false);
    setCycleData({ total: 1, scored: 0 });
  };

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
    <div className="w-full max-w-5xl space-y-4">
      {/* Timeline - Full width anchor at top */}
      <Timeline events={events} currentTime={elapsedTime} mode={mode} />

      {/* Timer Display - Full width */}
      <div
        className={`${getPhaseClass()} text-white p-5 sm:p-6 border-2 border-[#445f8b] shadow-md`}
      >
        <div className="flex items-center justify-between mb-3">
          {/* Phase badge */}
          {mode === "match" && (
            <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full">
              {phaseInfo.icon}
              <span className="text-xs font-bold tracking-wider">
                {phaseInfo.text}
              </span>
            </div>
          )}
          {/* Live stats */}
          <div className="flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1.5">
              <Target size={16} weight="bold" />
              <span className="font-mono font-bold">
                {totalScored}/{totalBalls}
              </span>
            </span>
            <span className="opacity-60">|</span>
            <span className="font-mono">{accuracy}%</span>
          </div>
        </div>

        {/* Main timer */}
        <div className="text-center">
          <h2 className="text-5xl sm:text-6xl font-mono font-bold tracking-tight text-white!">
            {displayTime}
          </h2>
          <p className="text-sm opacity-80 mt-1">
            {cycleCount} cycle{cycleCount !== 1 ? "s" : ""} recorded
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Begin Match Button - Shows when ready but not recording */}
        {isReady && !isRecording && (
          <button
            onClick={() => recorder.beginMatch()}
            className="w-96 mx-auto py-6 px-6 text-xl font-bold bg-[#445f8b] text-white border-2 border-[#445f8b] hover:bg-[#2d3e5c] transition-all flex items-center justify-center gap-3 shadow-lg animate-pulse"
          >
            <Play size={32} weight="fill" />
            <span className="mt-0.5">Begin Match</span>
          </button>
        )}

        {/* Action Buttons (Full width) */}
        {isRecording ? (
          <div className="flex flex-row items-center justify-center space-x-2">
            <button
              onClick={() => setShowCycleModal(true)}
              className="w-full py-4 px-4 text-base font-bold bg-[#445f8b] text-white border-2 border-[#445f8b] hover:bg-[#2d3e5c] transition-all flex items-center justify-center gap-2 shadow-md"
            >
              <Record size={24} weight="fill" />
              Record Cycle
              <span className="hidden sm:flex items-center gap-1 text-xs font-normal opacity-70 ml-2">
                <span className="kbd border-white/30! shadow-none! text-[12px]!">
                  1-3
                </span>
              </span>
            </button>

            <button
              onClick={() => recorder.addGate()}
              className="btn w-full py-3! justify-center"
            >
              <DoorOpen size={20} weight="bold" />
              Gate
            </button>

            <button
              onClick={() => {
                wasManualStopRef.current = true;
                recorder.stopMatch();
              }}
              className="error-btn w-full py-3! justify-center"
            >
              <Stop size={18} weight="fill" />
              Stop Match
            </button>
          </div>
        ) : (
          <button
            onClick={() => recorder.resetMatch()}
            className="bg-white border-2 border-[#445f8b] w-48 mx-auto text-sm transition-all flex items-center justify-center gap-1.5 shadow-lg"
          >
            <ArrowClockwise size={20} weight="bold" />
            Start New Match
          </button>
        )}

        {/* Quick Guide - Inline when recording */}
        {isRecording && (
          <div className="bg-white border border-[#ddd] rounded-lg overflow-hidden">
            <button
              onClick={() => setShowQuickGuide(!showQuickGuide)}
              className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-[#f8fafc] transition-colors text-sm"
            >
              <span className="flex items-center gap-2 text-[#666]">
                <Keyboard
                  size={16}
                  weight="duotone"
                  className="text-[#445f8b]"
                />
                Keyboard shortcuts
              </span>
              <CaretRight
                size={14}
                weight="bold"
                className={`text-[#445f8b] transition-transform ${
                  showQuickGuide ? "rotate-90" : ""
                }`}
              />
            </button>

            {showQuickGuide && (
              <div className="px-4 pb-3 pt-1 border-t border-[#eee]">
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#555]">
                  <span className="kbd">1</span>
                  <span className="kbd">2</span>
                  <span className="kbd">3</span>
                  <span className="text-[#888]">=attempted</span>
                  <ArrowFatLineRight size={12} className="text-[#445f8b]" />
                  <span className="kbd">0</span>-<span className="kbd">3</span>
                  <span className="text-[#888]">=scored</span>
                  <ArrowFatLineRight size={12} className="text-[#445f8b]" />
                  <span className="kbd">Enter</span>
                  <span className="text-[#888] ml-2">|</span>
                  <span className="kbd ml-2">G</span>
                  <span className="text-[#888]">=gate</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Points Entry - Secondary importance */}
        {
          <div className="bg-white border border-[#ddd] overflow-hidden">
            <button
              onClick={() => setShowPointsEntry(!showPointsEntry)}
              className="w-full p-3 flex items-center justify-between hover:bg-[#f8fafc] transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <Palette
                  size={20}
                  weight="duotone"
                  className="text-[#445f8b]"
                />
                <span className="text-base font-semibold">Points Entry</span>
                <span className="text-xs bg-[#445f8b] text-white px-2 py-0.5 rounded-full font-bold">
                  {pointsBreakdown.total} pts
                </span>
              </div>
              <CaretDown
                size={18}
                weight="bold"
                className={`text-[#445f8b] transition-transform ${showPointsEntry ? "rotate-180" : ""}`}
              />
            </button>

            {showPointsEntry && (
              <div className="p-3 border-t border-[#eee] space-y-4">
                {/* Motif Selector */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold mb-2">
                    <Palette
                      size={16}
                      weight="bold"
                      className="text-[#445f8b]"
                    />
                    Motif Pattern
                  </label>
                  <select
                    value={motif || ""}
                    onChange={(e) => recorder.setMotif(e.target.value || null)}
                    className="w-full px-3 py-2 border-2 border-[#ddd] focus:border-[#445f8b] outline-none rounded text-sm"
                  >
                    <option value="">Not set</option>
                    <option value="GPP">GPP — Green Purple Purple</option>
                    <option value="PGP">PGP — Purple Green Purple</option>
                    <option value="PPG">PPG — Purple Purple Green</option>
                  </select>
                </div>

                {/* Pattern Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <PatternInput
                    label="Auto Pattern (end of auto)"
                    value={autoPattern}
                    onChange={recorder.setAutoPattern}
                    motif={motif}
                    disabled={!motif}
                  />
                  <PatternInput
                    label="Teleop Pattern (end of teleop)"
                    value={teleopPattern}
                    onChange={recorder.setTeleopPattern}
                    motif={motif}
                    disabled={!motif}
                  />
                </div>

                {/* Auto Leave & Teleop Park */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold mb-2">
                      <Car size={16} weight="bold" className="text-[#445f8b]" />
                      Auto Leave
                    </label>
                    <label className="flex items-center gap-3 p-3 border-2 border-[#ddd] rounded cursor-pointer hover:border-[#445f8b] transition-colors">
                      <input
                        type="checkbox"
                        checked={autoLeave}
                        onChange={(e) =>
                          recorder.setAutoLeave(e.target.checked)
                        }
                        className="w-5 h-5 accent-[#445f8b]"
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
                        className="text-[#445f8b]"
                      />
                      Teleop Park
                    </label>
                    <select
                      value={teleopPark}
                      onChange={(e) => recorder.setTeleopPark(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-[#ddd] focus:border-[#445f8b] outline-none rounded text-sm"
                    >
                      <option value="none">None (0 pts)</option>
                      <option value="partial">Partial (5 pts)</option>
                      <option value="full">Full (10 pts)</option>
                    </select>
                  </div>
                </div>

                {/* Points Summary */}
                <div className="bg-[#f7f9ff] border border-[#445f8b]/30 rounded-lg p-4">
                  <h4 className="font-semibold text-sm mb-3 text-[#445f8b]">
                    Points Breakdown
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div className="text-center p-2 bg-white rounded border border-[#ddd]">
                      <div className="text-2xl font-bold text-[#445f8b]">
                        {pointsBreakdown.artifact}
                      </div>
                      <div className="text-xs text-gray-500">
                        Artifact ({totalScored}×3)
                      </div>
                    </div>
                    <div className="text-center p-2 bg-white rounded border border-[#ddd]">
                      <div className="text-2xl font-bold text-[#445f8b]">
                        {pointsBreakdown.motif.total}
                      </div>
                      <div className="text-xs text-gray-500">
                        Motif ({pointsBreakdown.motif.auto}+
                        {pointsBreakdown.motif.teleop})
                      </div>
                    </div>
                    <div className="text-center p-2 bg-white rounded border border-[#ddd]">
                      <div className="text-2xl font-bold text-[#445f8b]">
                        {pointsBreakdown.leave}
                      </div>
                      <div className="text-xs text-gray-500">Leave</div>
                    </div>
                    <div className="text-center p-2 bg-white rounded border border-[#ddd]">
                      <div className="text-2xl font-bold text-[#445f8b]">
                        {pointsBreakdown.park}
                      </div>
                      <div className="text-xs text-gray-500">Park</div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-[#445f8b]/20 text-center">
                    <span className="text-sm text-gray-600">Total Points:</span>
                    <span className="text-3xl font-bold text-[#445f8b] ml-2">
                      {pointsBreakdown.total}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        }

        {/* Metadata - Reduced visual weight */}
        <div className="bg-white border border-[#ddd] p-4">
          <h3 className="text-sm font-semibold text-[#666] mb-3 uppercase tracking-wide">Match Details</h3>
          <div className="space-y-3 flex flex-row flex-wrap justify-start gap-4">
            <div className="w-full">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Match Title (e.g. Driver practice, match 3, etc.)"
                className="w-full px-3 py-2 border border-[#ddd] focus:border-[#445f8b] outline-none rounded text-lg"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold mb-1 text-[#666]">
                <Target size={14} weight="bold" className="text-[#445f8b]" />
                Team Number
              </label>
              <input
                type="number"
                value={teamNumber}
                onChange={(e) => recorder.setTeamNumber(e.target.value)}
                placeholder="Enter team #"
                className="w-48 p-2 border border-[#ddd] focus:border-[#445f8b] outline-none text-center text-sm font-mono rounded transition-colors"
                min="1"
                max="99999"
              />
            </div>

            <div>
              <label className="text-xs font-semibold mb-1 text-[#666] block">
                Match Date
              </label>
              <input
                type="date"
                value={matchDate}
                onChange={(e) => setMatchDate(e.target.value)}
                className="w-48 px-3 py-2 border border-[#ddd] focus:border-[#445f8b] outline-none rounded text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold mb-1 text-[#666] block">
                Tournament Tag <span className="text-[#999] font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={tournamentName}
                onChange={(e) => setTournamentName(e.target.value)}
                placeholder="e.g. Play Space Qualifier, Regionals, etc."
                className="w-full px-3 py-2 border border-[#ddd] focus:border-[#445f8b] outline-none rounded text-sm"
              />
              {knownTournaments.length > 0 && (
                <div className="mt-2 flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                  <span className="text-xs text-[#666]">
                    Or pick from previous:
                  </span>
                  <select
                    value=""
                    onChange={(e) => {
                      if (!e.target.value) return;
                      setTournamentName(e.target.value);
                    }}
                    className="px-2 py-1 border border-[#ddd] focus:border-[#445f8b] outline-none text-xs rounded min-w-40"
                  >
                    <option value="">Select tournament...</option>
                    {knownTournaments.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="w-full">
              <label className="flex items-center gap-2 text-xs font-semibold mb-1 text-[#666]">
                <Note size={14} weight="bold" className="text-[#445f8b]" />
                Match Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => recorder.setNotes(e.target.value)}
                placeholder="Defense, robot issues, strategy..."
                className="w-full px-3 py-2 border border-[#ddd] focus:border-[#445f8b] outline-none resize-none h-20 rounded transition-colors text-sm"
              />
            </div>
          </div>
        </div>
      </div>

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
              document.querySelector("[data-auth-modal-trigger]")?.click();
            }}
            onDismiss={() => setHasSavedThisSession(true)}
          />
        )}

      <KeyboardEntryToast visible={keyEntryVisible} keyEntry={keyEntry} />
      <CycleModal
        open={showCycleModal}
        cycleData={cycleData}
        setCycleData={setCycleData}
        onConfirm={confirmCycle}
        onClose={() => setShowCycleModal(false)}
      />
    </div>
  );
}

function SaveMatchPromptToast({ onSave, onDismiss }) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:bottom-4 sm:right-4 z-50 w-[min(22rem,calc(100vw-1.5rem))]">
      <div className="bg-white border-2 border-[#445f8b] shadow p-4 w-full">
        <div className="text-sm font-semibold text-[#2d3e5c] mb-1">
          Save match?
        </div>
        <div className="text-xs text-[#666] mb-3">
          You&apos;re viewing a match that isn&apos;t saved to your account.
        </div>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onDismiss}
            className="text-xs px-3 py-1.5 border border-[#ddd] rounded hover:bg-[#f3f4f6] text-[#555]"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={onSave}
            className="btn !py-2 !px-3 !text-xs flex items-center gap-2"
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
      <div className="bg-white border-2 border-[#445f8b] shadow p-4 w-full">
        <div className="text-sm font-semibold text-[#2d3e5c] mb-1">
          Sign up?
        </div>
        <div className="text-xs text-[#666] mb-3">
          Sign up to save matches to your team account and access them later.
        </div>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onDismiss}
            className="text-xs px-3 py-1.5 border border-[#ddd] rounded hover:bg-[#f3f4f6] text-[#555]"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={onSign}
            className="btn !py-2 !px-3 !text-xs flex items-center gap-2"
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
