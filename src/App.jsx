import { useState, useEffect, useRef } from "react";
import {
  Play,
  Record,
  DoorOpen,
  Stop,
  ArrowClockwise,
  DownloadSimple,
  UploadSimple,
  CricketIcon,
  ClipboardTextIcon,
  Calendar,
  ChartLine,
  Copy,
  Check,
} from "@phosphor-icons/react";
import Timeline from "./components/Timeline";
import Statistics from "./components/Statistics";
import TournamentPage from "./pages/TournamentPage";
import LifetimePage from "./pages/LifetimePage";
import {
  formatMatchText,
  formatPhaseMatchText,
  parseMatchText,
} from "./utils/matchFormat";
import { logEvent } from "firebase/analytics";
import { analytics } from "./firebase";
import { TournamentProvider } from "./data/TournamentContext";

const AUTO_DURATION = 30; // seconds
const BUFFER_DURATION = 8; // seconds
const TELEOP_DURATION = 120; // seconds
const MATCH_TOTAL_DURATION = AUTO_DURATION + BUFFER_DURATION + TELEOP_DURATION;

function App() {
  const [matchStartTime, setMatchStartTime] = useState(null);
  const [timerDuration, setTimerDuration] = useState(null); // in seconds
  const [elapsedTime, setElapsedTime] = useState(0);
  const [events, setEvents] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [showCycleModal, setShowCycleModal] = useState(false);
  const [cycleData, setCycleData] = useState({ total: 1, scored: 0 });
  const [showTextImport, setShowTextImport] = useState(false);
  const [textInput, setTextInput] = useState("");
  const intervalRef = useRef(null);

  const [keyEntry, setKeyEntry] = useState({ total: null, scored: null });
  const [keyEntryVisible, setKeyEntryVisible] = useState(false);
  const [keyEntryExpiresAt, setKeyEntryExpiresAt] = useState(null);
  const [cooldownUntil, setCooldownUntil] = useState(null);
  const [notes, setNotes] = useState("");
  const expireTimeoutRef = useRef(null);
  const [copiedFull, setCopiedFull] = useState(false);
  const [copiedAuto, setCopiedAuto] = useState(false);
  const [copiedTeleop, setCopiedTeleop] = useState(false);
  const [mode, setMode] = useState("free"); // "free" | "match"
  const [phase, setPhase] = useState("idle"); // "idle" | "auto" | "buffer" | "teleop" | "finished"
  const [teamNumber, setTeamNumber] = useState("");

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
          } else if (
            elapsedSeconds <
            AUTO_DURATION + BUFFER_DURATION + TELEOP_DURATION
          ) {
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
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRecording, matchStartTime, timerDuration, mode]);

  // Auto-cancel pending key entry on timeout
  useEffect(() => {
    if (expireTimeoutRef.current) {
      clearTimeout(expireTimeoutRef.current);
      expireTimeoutRef.current = null;
    }
    if (keyEntryVisible && keyEntryExpiresAt) {
      const ms = Math.max(0, keyEntryExpiresAt - Date.now());
      expireTimeoutRef.current = setTimeout(() => {
        setKeyEntry({ total: null, scored: null });
        setKeyEntryVisible(false);
        setKeyEntryExpiresAt(null);
        setCooldownUntil(Date.now() + 5000);
      }, ms);
    }
    return () => {
      if (expireTimeoutRef.current) {
        clearTimeout(expireTimeoutRef.current);
        expireTimeoutRef.current = null;
      }
    };
  }, [keyEntryVisible, keyEntryExpiresAt]);

  // Keyboard controls: type total (1-3), type made (0-total), press Enter to confirm. Esc to cancel.
  useEffect(() => {
    const onKeyDown = (e) => {
      if (!isRecording) return;
      if (showCycleModal || showTextImport) return;
      const ae = document.activeElement;
      if (
        ae &&
        (ae.tagName === "INPUT" ||
          ae.tagName === "TEXTAREA" ||
          ae.getAttribute("contenteditable") === "true")
      )
        return;

      const now = Date.now();
      if (!keyEntryVisible) {
        if (e.key && e.key.toLowerCase() === "g") {
          const event = {
            type: "gate",
            timestamp: elapsedTime,
            phase: mode === "match" ? phase : undefined,
          };
          setEvents((prev) => [...prev, event]);
          e.preventDefault();
          return;
        }
        if (cooldownUntil && now < cooldownUntil) return;
        if (e.key >= "1" && e.key <= "3") {
          setKeyEntry({ total: parseInt(e.key, 10), scored: null });
          setKeyEntryVisible(true);
          setKeyEntryExpiresAt(now + 5000);
          e.preventDefault();
        }
        return;
      }

      // When visible
      if (e.key === "Escape") {
        setKeyEntry({ total: null, scored: null });
        setKeyEntryVisible(false);
        setKeyEntryExpiresAt(null);
        setCooldownUntil(Date.now() + 5000);
        e.preventDefault();
        return;
      }

      if (e.key === "Enter") {
        if (keyEntry.total != null && keyEntry.scored != null) {
          const event = {
            type: "cycle",
            timestamp: elapsedTime,
            total: keyEntry.total,
            scored: keyEntry.scored,
            phase: mode === "match" ? phase : undefined,
          };
          setEvents((prev) => [...prev, event]);
          setKeyEntry({ total: null, scored: null });
          setKeyEntryVisible(false);
          setKeyEntryExpiresAt(null);
        }
        e.preventDefault();
        return;
      }

      if (e.key >= "0" && e.key <= "9") {
        if (keyEntry.total != null) {
          const val = parseInt(e.key, 10);
          if (val <= keyEntry.total) {
            setKeyEntry((prev) => ({ ...prev, scored: val }));
            setKeyEntryExpiresAt(Date.now() + 5000);
          }
          e.preventDefault();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    isRecording,
    showCycleModal,
    showTextImport,
    keyEntryVisible,
    keyEntry,
    elapsedTime,
    cooldownUntil,
    mode,
    phase,
  ]);

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const startMatch = (duration, newMode = "free") => {
    const now = Date.now();
    setMatchStartTime(now);
    setTimerDuration(duration);
    setElapsedTime(0);
    setEvents([]);
    setNotes("");
    setIsRecording(true);
    setMode(newMode);
    setPhase(newMode === "match" ? "auto" : "idle");
  };

  const stopMatch = () => {
    setIsRecording(false);
    if (mode === "match") {
      setPhase("finished");
    }
  };

  const recordCycle = () => {
    if (!isRecording) return;
    setShowCycleModal(true);
  };

  const confirmCycle = () => {
    const event = {
      type: "cycle",
      timestamp: elapsedTime,
      total: cycleData.total,
      scored: cycleData.scored,
      phase: mode === "match" ? phase : undefined,
    };
    setEvents([...events, event]);
    setShowCycleModal(false);
    setCycleData({ total: 1, scored: 0 });
  };

  const recordGate = () => {
    if (!isRecording) return;
    const event = {
      type: "gate",
      timestamp: elapsedTime,
      phase: mode === "match" ? phase : undefined,
    };
    setEvents([...events, event]);
  };

  const exportMatch = () => {
    const data = {
      startTime: matchStartTime,
      duration: timerDuration,
      teamNumber: teamNumber,
      events: events,
      notes: notes || "",
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `match-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    logEvent(analytics, "export_match_json", {
      numEvents: events.length,
      totalScored: events
        .filter((e) => e.type === "cycle")
        .reduce((sum, e) => sum + e.scored, 0),
      totalBalls: events
        .filter((e) => e.type === "cycle")
        .reduce((sum, e) => sum + e.total, 0),
    });
  };

  const importMatch = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        setMatchStartTime(data.startTime);
        setTimerDuration(data.duration);
        setEvents(data.events);
        setElapsedTime(
          data.events.length > 0
            ? data.events[data.events.length - 1].timestamp
            : 0
        );
        setIsRecording(false);
        setNotes(data.notes || "");

        setTeamNumber(data.teamNumber || "");

        logEvent(analytics, "import_match_json", {
          numEvents: data.events.length,
          totalScored: data.events
            .filter((e) => e.type === "cycle")
            .reduce((sum, e) => sum + e.scored, 0),
          totalBalls: data.events
            .filter((e) => e.type === "cycle")
            .reduce((sum, e) => sum + e.total, 0),
        });
      } catch {
        alert(
          "Error loading match file. Please ensure it is a valid JSON file."
        );
      }
    };

    logEvent(analytics, "import_match_json");
    reader.readAsText(file);
  };

  const importFromText = () => {
    try {
      const parsedData = parseMatchText(textInput);
      const success = applyParsedMatchData(parsedData);
      if (!success) {
        alert("No valid match data found. Please check the format.");
        return;
      }

      setShowTextImport(false);
      setTextInput("");

      logEvent(analytics, "import_match_text");
    } catch (e) {
      alert("Error parsing match data. Please check the format." + e.message);
    }
  };

  const formatMatchData = () =>
    formatMatchText({
      events,
      notes,
      teamNumber,
      matchStartTime,
      timerDuration,
      elapsedTime,
    });

  const formatPhaseMatchData = (phaseFilter) =>
    formatPhaseMatchText({
      events,
      notes,
      teamNumber,
      matchStartTime,
      timerDuration,
      elapsedTime,
      mode,
      phaseFilter,
      autoDuration: AUTO_DURATION,
      bufferDuration: BUFFER_DURATION,
      teleopDuration: TELEOP_DURATION,
    });

  const totalScored = events
    .filter((e) => e.type === "cycle")
    .reduce((sum, e) => sum + e.scored, 0);

  const totalBalls = events
    .filter((e) => e.type === "cycle")
    .reduce((sum, e) => sum + e.total, 0);

  const applyParsedMatchData = (parsedData) => {
    if (!parsedData || !Array.isArray(parsedData.events)) return false;

    const otherEvents = parsedData.events.filter((e) => e.type !== "info");
    if (otherEvents.length === 0) {
      return false;
    }

    setMatchStartTime(parsedData.startTime || Date.now());
    setTimerDuration(parsedData.duration || null);
    setEvents(otherEvents);
    setElapsedTime(
      otherEvents.length > 0 ? otherEvents[otherEvents.length - 1].timestamp : 0
    );
    setIsRecording(false);
    setNotes(parsedData.notes || "");
    setTeamNumber(parsedData.teamNumber || "");

    return true;
  };

  const copyToClipboard = () => {
    const matchText = formatMatchData();
    navigator.clipboard.writeText(matchText).then(() => {
      setCopiedFull(true);
      setTimeout(() => setCopiedFull(false), 2000);
    });
  };

  const copyAutoToClipboard = () => {
    const matchText = formatPhaseMatchData("auto");
    navigator.clipboard.writeText(matchText).then(() => {
      setCopiedAuto(true);
      setTimeout(() => setCopiedAuto(false), 2000);
    });
  };

  const copyTeleopToClipboard = () => {
    const matchText = formatPhaseMatchData("teleop");
    navigator.clipboard.writeText(matchText).then(() => {
      setCopiedTeleop(true);
      setTimeout(() => setCopiedTeleop(false), 2000);
    });
  };

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const encoded = params.get("mt");
      if (!encoded) return;

      const decoded = atob(decodeURIComponent(encoded));
      const parsedData = parseMatchText(decoded);
      const success = applyParsedMatchData(parsedData);
      if (success) {
        logEvent(analytics, "import_match_text_url");
      }
    } catch (e) {
      console.warn("Failed to import match from URL", e);
    }
  }, []);

  return (
    <div className="min-h-screen p-5 max-w-7xl mx-auto flex flex-col justify-center items-center gap-12">
      <header className="text-center mt-8">
        <h1 className="text-5xl font-bold">Heron Scout</h1>
        <p className="text-lg ">Heron's Match Analysis for DECODE</p>
      </header>

      {!isRecording && matchStartTime === null && (
        <div className="bg-white border-2 border-[#445f8b] flex flex-col items-center md:py-8 md:px-8 pb-4">
          <h2 className="text-3xl mt-2 mb-6 px-2">Start recording!</h2>

          <div className="bg-[#f7f9ff] border-2 border-[#445f8b] w-full max-w-xl p-4 mb-6">
            <h3 className="text-xl font-semibold mb-3">
              Match Mode (Auto + TeleOp)
            </h3>
            <label className="flex items-center gap-2 mb-3">
              Team Number:
              <input
                type="number"
                value={teamNumber}
                onChange={(e) => setTeamNumber(e.target.value)}
                placeholder="1234"
                className="px-3 py-2 border-2 border-[#ddd] focus:border-[#445f8b] outline-none w-32 text-center font-mono"
                min="1"
                max="99999"
              />
            </label>
            <button
              onClick={() => {
                startMatch(MATCH_TOTAL_DURATION, "match");
                logEvent(analytics, "start_match_mode");
              }}
              className="btn mb-2 !py-3 !bg-[#445f8b] !text-white !px-6 w-full"
            >
              <Play size={24} weight="fill" />
              Start Match Mode (Auto + TeleOp)
            </button>
            <p className="text-sm text-[#555]">
              Runs 30s Auto, an 8s buffer to wrap up auto, then 2:00 TeleOp —
              all in one match and one save code.
            </p>
          </div>

          <div className="w-full max-w-xl mb-6">
            <h3 className="text-lg font-semibold mb-2">
              Manual Session (Legacy)
            </h3>
            <div className="flex flex-col sm:flex-row gap-3 justify-center flex-wrap">
              <button
                onClick={() => {
                  startMatch(null, "free");
                  logEvent(analytics, "start_no_timer");
                }}
                className="btn !py-3 !px-6"
              >
                <Play size={24} weight="fill" />
                No Timer
              </button>
              <button
                onClick={() => {
                  startMatch(30, "free");
                  logEvent(analytics, "start_30sec_timer");
                }}
                className="btn"
              >
                <Play size={24} weight="fill" />
                0:30 Timer (Auto)
              </button>
              <button
                onClick={() => {
                  startMatch(120, "free");
                  logEvent(analytics, "start_2min_timer");
                }}
                className="btn"
              >
                <Play size={24} weight="fill" />
                2:00 Timer (TeleOp)
              </button>
            </div>
          </div>

          <div className="flex gap-4">
            <label className="btn">
              <span className="flex items-center gap-2">
                <UploadSimple weight="bold" />
                Import Match from JSON
              </span>
              <input
                type="file"
                accept=".json"
                onChange={importMatch}
                className="hidden"
              />
            </label>
            <button onClick={() => setShowTextImport(true)} className="btn">
              <span className="flex items-center gap-2">
                <ClipboardTextIcon weight="bold" />
                From Text
              </span>
            </button>
          </div>
          <p className="mt-8 p-2">
            Heron Scout is a scouting app designed for intensive data analysis.
            Its usages are threefold: Track your own robot in the workshop to
            see how design iterations affect performance, track your robot
            during competition, or track other people's robots during
            competitions for scouting. First and foremost, it's easy to use —
            just press one of the buttons above to start recording a match. (Or
            import one.)
            <br />
            <br />
            Matches are stored as JSON and easily shareable! Scout matches with
            Heron Scout and you'll be able to compare teams at tournaments using
            the Tournament Analysis page. Matches and Tournaments can both be
            imported on the "Lifetime Stats" page to explore your performance
            over the course of the season and generate cool graphs!
            <br />
            <br />
            We love graphs at Heron Robotics, so we made this for you :)
          </p>
        </div>
      )}

      {(isRecording || matchStartTime !== null) && (
        <>
          <div className="bg-white p-8 text-center border-2 border-[#445f8b] flex flex-col items-center justify-center w-full gap-2">
            <h2 className="text-6xl font-mono">{formatTime(elapsedTime)}</h2>
            {mode === "match" && (
              <div className="mt-2 text-lg font-semibold">
                {phase === "auto" && "Auto Phase"}
                {phase === "buffer" && "Auto Wrap-up (8s buffer)"}
                {phase === "teleop" && "TeleOp Phase"}
                {phase === "finished" && "Match Complete"}
              </div>
            )}
            <div>
              Scored&nbsp;
              <span className="font-bold">
                {totalScored}/{totalBalls}
              </span>
              . Scroll down for instructions.
            </div>
          </div>

          <div className="bg-white p-6 border-2 border-[#445f8b] w-full">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between flex-wrap mb-4">
              <label className="flex items-center gap-2 text-lg font-semibold">
                Team Number:
                <input
                  type="number"
                  value={teamNumber}
                  onChange={(e) => setTeamNumber(e.target.value)}
                  placeholder="1234"
                  className="px-3 py-2 border-2 border-[#ddd] focus:border-[#445f8b] outline-none w-48 text-center font-mono"
                  min="1"
                  max="99999"
                />
              </label>
              <div className="text-sm text-[#666]">
                <strong>PRO TIP:</strong> Use your keyboard to record cycles!
                See instructions below.
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm font-semibold">
                Match Notes (optional):
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any observations about this match..."
                className="w-full px-3 py-2 border-2 border-[#ddd] focus:border-[#445f8b] outline-none resize-vertical min-h-[60px]"
                rows="2"
              />
            </div>

            <p className="mt-4">
              Set the team number and add notes for this match. Put together all
              of your scouting on the Tournament Analysis page later to compare
              teams!
            </p>
          </div>

          <div className="flex gap-4 justify-center flex-wrap">
            {isRecording ? (
              <>
                <button
                  onClick={recordCycle}
                  className="px-8 py-4 text-lg border-2 border-[#445f8b] bg-[#445f8b] text-white hover:bg-white hover:text-[#2d3e5c] transition-colors font-semibold flex items-center gap-2"
                >
                  <Record size={24} weight="fill" />
                  Record Cycle
                </button>
                <button onClick={recordGate} className="btn">
                  <CricketIcon size={24} weight="bold" />
                  Gate Open
                </button>
                <button onClick={stopMatch} className="error-btn">
                  <Stop size={24} weight="fill" />
                  Stop Match
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  setMatchStartTime(null);
                  setEvents([]);
                  setElapsedTime(0);
                  setNotes("");
                  setMode("free");
                  setPhase("idle");
                }}
                className="btn !px-6 !py-3"
              >
                <ArrowClockwise size={24} weight="bold" />
                New Match
              </button>
            )}
          </div>

          <Timeline events={events} currentTime={elapsedTime} />

          <div className="w-full">
            <p>
              {/* Instructions for using the app */}
              <strong>Instructions:</strong>
              <br />
              - To record a shooting cycle, press the "Record Cycle" button and
              select how many balls were shot and how many were successfully
              scored.
              <br />
              &nbsp;&nbsp;&nbsp;&nbsp;- <strong>Keyboard Users:</strong> Type
              the total number of balls (1-3) attempted, followed by the number
              scored (0-total), then press Enter. Esc to cancel.
              <br />
              - Record gate openings by pressing the "Gate Open" button.
              <br />
              - Events will appear on the timeline above as they are recorded.
              <br />
              - Export the Match and save it somewhere! The "Lifetime Stats" and
              "Tournament Analysis" pages can import your saved Matches and give
              you a lot more insight into your performance over time.
              <br />
              &nbsp;&nbsp;&nbsp;&nbsp;- <strong>Text export:</strong> You can
              export matches in a readable text format if you just want to share
              a match with your friends. Use JSON for advanced Heron Scout
              analysis!
            </p>
          </div>

          {events.length > 0 && (
            <Statistics events={events} teamNumber={teamNumber} notes={notes} />
          )}

          {!isRecording && events.length > 0 && (
            <div className="bg-white p-8 mt-8 border-2 border-[#445f8b] flex flex-col justif-center items-center gap-6">
              <div className="w-full">
                <h3 className="text-xl mb-2">Match Data:</h3>
                <p className="mb-2">
                  Export this Match as JSON so you can analyze it with Heron
                  Scout later!
                </p>
                <p className="bg-[#f5f5f5] p-4 max-w-full font-mono text-sm leading-relaxed border-2 border-[#ddd]">
                  {formatMatchData()}
                </p>
                <button
                  onClick={copyToClipboard}
                  className="btn mt-3 !py-2 !px-4"
                >
                  {copiedFull ? (
                    <>
                      <Check size={20} weight="bold" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={20} weight="bold" />
                      Copy Text
                    </>
                  )}
                </button>
                <div className="mt-3 text-sm break-all">
                  <span className="font-semibold">Share URL:</span>{" "}
                  <a
                    href={`${window.location.origin}${
                      window.location.pathname
                    }?mt=${encodeURIComponent(btoa(formatMatchData()))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
                    open in new tab
                  </a>
                </div>
                {mode === "match" && (
                  <div className="w-full mt-6 flex flex-col gap-4">
                    <div>
                      <h4 className="text-lg mb-1">Auto-only Text:</h4>
                      <p className="bg-[#f5f5f5] p-3 max-w-full font-mono text-xs leading-relaxed border-2 border-[#ddd]">
                        {formatPhaseMatchData("auto")}
                      </p>
                      <button
                        onClick={copyAutoToClipboard}
                        className="btn mt-2 !py-1 !px-3 text-sm"
                      >
                        {copiedAuto ? (
                          <>
                            <Check size={16} weight="bold" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy size={16} weight="bold" />
                            Copy Auto Text
                          </>
                        )}
                      </button>
                      <div className="mt-2 text-xs break-all">
                        <span className="font-semibold">Auto URL:</span>{" "}
                        <a
                          href={`${window.location.origin}${
                            window.location.pathname
                          }?mt=${encodeURIComponent(
                            btoa(formatPhaseMatchData("auto"))
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 underline"
                        >
                          open auto in new tab
                        </a>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-lg mb-1">TeleOp-only Text:</h4>
                      <p className="bg-[#f5f5f5] p-3 max-w-full font-mono text-xs leading-relaxed border-2 border-[#ddd]">
                        {formatPhaseMatchData("teleop")}
                      </p>
                      <button
                        onClick={copyTeleopToClipboard}
                        className="btn mt-2 !py-1 !px-3 text-sm"
                      >
                        {copiedTeleop ? (
                          <>
                            <Check size={16} weight="bold" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy size={16} weight="bold" />
                            Copy TeleOp Text
                          </>
                        )}
                      </button>
                      <div className="mt-2 text-xs break-all">
                        <span className="font-semibold">TeleOp URL:</span>{" "}
                        <a
                          href={`${window.location.origin}${
                            window.location.pathname
                          }?mt=${encodeURIComponent(
                            btoa(formatPhaseMatchData("teleop"))
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 underline"
                        >
                          open teleop in new tab
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="w-full flex flex-wrap justify-center items-center gap-6">
                <p>
                  Send the above text to your friends, or export as JSON to
                  analyze it with Heron Scout later!
                </p>
                <button onClick={exportMatch} className="btn">
                  <DownloadSimple size={20} weight="bold" />
                  Save JSON
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Keyboard entry popup */}
      {keyEntryVisible && (
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-white border-2 border-[#445f8b] shadow p-4 min-w-64">
            <div className="text-sm text-[#666] mb-1">Quick Entry</div>
            <div className="text-lg font-semibold mb-2">
              Shot {keyEntry.total} balls; how many scored?
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[#666] text-sm">Scored:</span>
              <span className="text-2xl font-mono">
                {keyEntry.scored ?? "_"}
              </span>
              <span className="text-sm text-[#999]">(0-{keyEntry.total})</span>
            </div>
            <div className="text-xs text-[#666]">
              Type a number, then press Enter. Esc to cancel.
            </div>
          </div>
        </div>
      )}

      {showCycleModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setShowCycleModal(false)}
        >
          <div
            className="bg-white p-8 max-w-lg w-11/12 border-2 border-[#445f8b]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl mb-5">Record Cycle</h3>
            <div className="flex flex-col gap-5 mb-6">
              <label className="flex flex-col gap-3 font-semibold">
                Total Balls:
                <div className="flex gap-3">
                  {[1, 2, 3].map((num) => (
                    <button
                      key={num}
                      className={`flex-1 p-4 text-lg border-2 font-semibold transition-colors ${
                        cycleData.total === num
                          ? "border-[#445f8b] bg-[#445f8b] text-white"
                          : "border-[#ddd] bg-white hover:border-[#445f8b]"
                      }`}
                      onClick={() =>
                        setCycleData({
                          ...cycleData,
                          total: num,
                          scored: Math.min(cycleData.scored, num),
                        })
                      }
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </label>
              <label className="flex flex-col gap-3 font-semibold">
                Balls Scored:
                <div className="flex gap-3">
                  {[0, 1, 2, 3].map((i) => {
                    const disabled = i > cycleData.total;
                    const selected = cycleData.scored === i;
                    const base =
                      "flex-1 p-4 text-lg border-2 font-semibold transition-colors";
                    const cls = selected
                      ? "border-[#445f8b] bg-[#445f8b] text-white"
                      : disabled
                      ? "border-[#eee] bg-[#f8f8f8] text-[#aaa] cursor-not-allowed opacity-60"
                      : "border-[#ddd] bg-white hover:border-[#445f8b]";
                    return (
                      <button
                        key={i}
                        disabled={disabled}
                        className={`${base} ${cls}`}
                        onClick={() => {
                          if (disabled) return;
                          setCycleData({ ...cycleData, scored: i });
                        }}
                      >
                        {i}
                      </button>
                    );
                  })}
                </div>
              </label>
            </div>
            <div className="flex gap-4 justify-end">
              <button onClick={confirmCycle} className="btn !px-6">
                Confirm
              </button>
              <button
                onClick={() => setShowCycleModal(false)}
                className="error-btn !px-4 !py-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showTextImport && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setShowTextImport(false)}
        >
          <div
            className="bg-white p-8 max-w-2xl w-11/12 border-2 border-[#445f8b]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl mb-5">Paste Match Text</h3>
            <p className="text-sm mb-4 text-[#666]">
              Paste match data below in the format: 0:00; 1/2 at 0:10; 1/2 at
              0:20; gate at 1:30; ...
            </p>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="0:00; 1/2 at 0:10; 1/2 at 0:20; gate at 1:30; ..."
              className="w-full h-32 p-3 border-2 border-[#ddd] focus:border-[#445f8b] outline-none font-mono text-sm resize-none"
            />
            <div className="flex gap-4 justify-end mt-6">
              <button onClick={importFromText} className="btn">
                Import
              </button>
              <button
                onClick={() => {
                  setShowTextImport(false);
                  setTextInput("");
                }}
                className="btn"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NavigationBar({ currentPage, setCurrentPage }) {
  return (
    <div className="bg-white border-b-2 border-[#445f8b] z-20 flex flex-row items-between px-4">
      <div className="max-w-7xl px-5 py-4 flex gap-4">
        <button
          onClick={() => {
            setCurrentPage("home");
            logEvent(analytics, "navigate_home");
          }}
          className={`btn ${
            currentPage === "home"
              ? "!bg-[#445f8b] !text-white"
              : "bg-transparent text-[#445f8b] hover:bg-[#f0f5ff]"
          }`}
        >
          Home
        </button>
        <button
          onClick={() => {
            setCurrentPage("tournament");
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
            setCurrentPage("lifetime");
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
      </div>
      <div className="hidden md:flex ml-auto items-center">
        <h2 className="text-lg font-bold">Heron Scout</h2>
      </div>
    </div>
  );
}

function MainApp() {
  const [currentPage, setCurrentPage] = useState("home");

  return (
    <>
      <NavigationBar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
      />
      {currentPage === "home" && <App />}
      {currentPage === "tournament" && (
        <TournamentProvider>
          <TournamentPage />
        </TournamentProvider>
      )}
      {currentPage === "lifetime" && <LifetimePage />}
    </>
  );
}

export default MainApp;
