import { useEffect, useMemo, useRef, useState } from "react";
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
} from "@phosphor-icons/react";
import { logEvent } from "firebase/analytics";
import { usePostHog } from "posthog-js/react";
import { analytics } from "../../firebase";

import Timeline from "../../components/Timeline";
import Statistics from "../../components/Statistics";
import CycleModal from "../../components/home/modals/CycleModal";
import KeyboardEntryToast from "../../components/home/KeyboardEntryToast";
import MatchDataPanel from "../../components/home/MatchDataPanel";

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
} from "../../api/matchesApi.js";

function MatchRecorderScreen({ recorder }) {
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
  const [title, setTitle] = useState("");
  const [tournamentName, setTournamentName] = useState("");
  const [knownTournaments, setKnownTournaments] = useState([]);

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
    notes,
    teamNumber,
    mode,
    phase,
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

  // Track match finish with PostHog
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

      wasManualStopRef.current = false;
    }
    wasRecordingRef.current = isRecording;
  }, [isRecording, events, teamNumber, elapsedTime, mode, posthog]);

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
    startTime: matchStartTime,
    duration: timerDuration,
    teamNumber,
    events,
    notes: notes || "",
    title: title || "",
    tournamentName: tournamentName || "",
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

  const handleSaveToAccount = async () => {
    if (!events.length) return;
    if (!user) {
      alert("Sign in (top right) to save matches to your account.");
      return;
    }

    try {
      setSaveStatus("saving");
      const payload = buildMatchPayload();
      await createMatchForUser(user.id, payload, "recorder");
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error) {
      console.error(error);
      alert("Failed to save match. Please try again.");
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 2000);
    }
  };

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
            {formatTime(elapsedTime)}
          </h2>
          <p className="text-sm opacity-80 mt-1">
            {cycleCount} cycle{cycleCount !== 1 ? "s" : ""} recorded
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Action Buttons (Full width) */}
        {isRecording ? (
          <div className="space-y-2">
            <button
              onClick={() => setShowCycleModal(true)}
              className="w-full py-4 px-4 text-base font-bold bg-[#445f8b] text-white border-2 border-[#445f8b] hover:bg-[#2d3e5c] transition-all flex items-center justify-center gap-2 shadow-md"
            >
              <Record size={24} weight="fill" />
              Record Cycle
              <span className="hidden sm:flex items-center gap-1 text-xs font-normal opacity-70 ml-2">
                <span className="kbd bg-white/20! border-white/30! text-white! shadow-none! text-[10px]!">
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
            className="btn w-full py-3! justify-center"
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

        {/* Team & Notes (Stacked) */}
        <div className="space-y-4">
          <div className="bg-white p-4 border-2 border-[#445f8b]">
            <label className="flex items-center gap-2 text-sm font-semibold mb-2">
              <Target size={16} weight="bold" className="text-[#445f8b]" />
              Team Number
            </label>
            <input
              type="number"
              value={teamNumber}
              onChange={(e) => recorder.setTeamNumber(e.target.value)}
              placeholder="Enter team #"
              className="w-full px-4 py-3 border-2 border-[#ddd] focus:border-[#445f8b] outline-none text-center font-mono text-xl rounded transition-colors"
              min="1"
              max="99999"
            />
          </div>

          <div className="bg-white p-4 border-2 border-[#445f8b]">
            <label className="flex items-center gap-2 text-sm font-semibold mb-2">
              Match Title (optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Driver practice, match 3, etc."
              className="w-full px-3 py-2 border-2 border-[#ddd] focus:border-[#445f8b] outline-none rounded text-sm"
            />
          </div>

          <div className="bg-white p-4 border-2 border-[#445f8b]">
            <label className="flex items-center gap-2 text-sm font-semibold mb-2">
              <Note size={16} weight="bold" className="text-[#445f8b]" />
              Match Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => recorder.setNotes(e.target.value)}
              placeholder="Defense, robot issues, strategy..."
              className="w-full px-3 py-2 border-2 border-[#ddd] focus:border-[#445f8b] outline-none resize-none h-24 rounded transition-colors text-sm"
            />
          </div>

          <div className="bg-white p-4 border-2 border-[#445f8b]">
            <label className="flex items-center gap-2 text-sm font-semibold mb-2">
              Tournament Tag (optional)
            </label>
            <input
              type="text"
              value={tournamentName}
              onChange={(e) => setTournamentName(e.target.value)}
              placeholder="e.g. Play Space Qualifier, Regionals, etc."
              className="w-full px-3 py-2 border-2 border-[#ddd] focus:border-[#445f8b] outline-none rounded text-sm"
            />
            {knownTournaments.length > 0 && (
              <div className="mt-2 flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                <span className="text-xs text-[#666] font-semibold">
                  Or pick from previous:
                </span>
                <select
                  value=""
                  onChange={(e) => {
                    if (!e.target.value) return;
                    setTournamentName(e.target.value);
                  }}
                  className="px-2 py-1 border-2 border-[#ddd] focus:border-[#445f8b] outline-none text-xs rounded min-w-[10rem]"
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
        </div>
      </div>

      {/* Statistics */}
      {events.length > 0 && (
        <Statistics events={events} teamNumber={teamNumber} notes={notes} />
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

export default MatchRecorderScreen;
