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
} from "@phosphor-icons/react";
import Timeline from "./components/Timeline";
import Statistics from "./components/Statistics";
import TournamentPage from "./pages/TournamentPage";
import LifetimePage from "./pages/LifetimePage";
import { logEvent } from "firebase/analytics";
import { analytics } from "./firebase";

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
  const expireTimeoutRef = useRef(null);

  useEffect(() => {
    if (isRecording) {
      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - matchStartTime;
        setElapsedTime(elapsed);

        // Auto-stop when timer expires
        if (timerDuration && elapsed >= timerDuration * 1000) {
          setIsRecording(false);
          setElapsedTime(timerDuration * 1000);
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
  }, [isRecording, matchStartTime, timerDuration]);

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
        // Quick gate record with 'G'
        if (e.key && e.key.toLowerCase() === "g") {
          const event = { type: "gate", timestamp: elapsedTime };
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
  ]);

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const startMatch = (duration) => {
    const now = Date.now();
    setMatchStartTime(now);
    setTimerDuration(duration);
    setElapsedTime(0);
    setEvents([]);
    setIsRecording(true);
  };

  const stopMatch = () => {
    setIsRecording(false);
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
    };
    setEvents([...events, event]);
  };

  const exportMatch = () => {
    const data = {
      startTime: matchStartTime,
      duration: timerDuration,
      teamNumber: teamNumber,
      events: events,
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

  const parseTextFormat = (text) => {
    // Parse text format like: 0:00; 1/2 at 0:10; gate at 1:00; ...
    let events = [];

    const tprefix = text.split(";;")[0].trim();

    // the rest
    text = text.split(";;")[1].trim();
    if (!tprefix.startsWith("hmadv1")) {
      setTeamNumber(tprefix.split("/")[1] || "");
      events.push({
        type: "info",
        version: "text_v1",
        teamNumber: teamNumber,
        timestamp: 0,
      });
    }

    const parts = text
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s);

    for (const part of parts) {
      if (part === "0:00") continue; // Skip the initial timestamp

      if (part.includes("gate at")) {
        const timeMatch = part.match(/(\d+):(\d+)/);
        if (timeMatch) {
          const minutes = parseInt(timeMatch[1]);
          const seconds = parseInt(timeMatch[2]);
          events.push({
            type: "gate",
            timestamp: (minutes * 60 + seconds) * 1000,
          });
        }
      } else {
        const cycleMatch = part.match(/(\d+)\/(\d+)\s+at\s+(\d+):(\d+)/);
        if (cycleMatch) {
          const scored = parseInt(cycleMatch[1]);
          const total = parseInt(cycleMatch[2]);
          const minutes = parseInt(cycleMatch[3]);
          const seconds = parseInt(cycleMatch[4]);
          events.push({
            type: "cycle",
            timestamp: (minutes * 60 + seconds) * 1000,
            total: total,
            scored: scored,
          });
        }
      }
    }

    return events;
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
      let parsedEvents = parseTextFormat(textInput);
      if (parsedEvents.length === 0) {
        alert("No valid match data found. Please check the format.");
        return;
      }

      // Extract team number from the text input directly
      const tprefix = textInput.split(";;")[0].trim();
      let extractedTeamNumber = "";

      if (tprefix.startsWith("hmadv1")) {
        // Extract team number from hmadv1 format
        const parts = tprefix.split("/");
        if (parts.length > 1) {
          extractedTeamNumber = parts[1];
        }
      } else {
        // Extract team number from legacy format
        const parts = tprefix.split("/");
        if (parts.length > 1) {
          extractedTeamNumber = parts[1];
        }
      }

      let otherEvents = parsedEvents.filter((e) => e.type !== "info");
      parsedEvents = otherEvents;

      setMatchStartTime(Date.now());
      setTimerDuration(null);
      setEvents(parsedEvents);
      setElapsedTime(parsedEvents[parsedEvents.length - 1].timestamp);
      setIsRecording(false);
      setShowTextImport(false);
      setTextInput("");

      // Set the extracted team number
      setTeamNumber(extractedTeamNumber);

      logEvent(analytics, "import_match_text");
    } catch (e) {
      alert("Error parsing match data. Please check the format." + e.message);
    }
  };

  const formatMatchData = () => {
    if (events.length === 0) return "No events recorded";

    let prefix = "hmadv1";
    if (teamNumber) {
      prefix += `/${teamNumber}`;
    }
    prefix += ";; ";

    let output = prefix + formatTime(0) + ";";
    events.forEach((event) => {
      if (event.type === "cycle") {
        output += ` ${event.scored}/${event.total} at ${formatTime(
          event.timestamp
        )};`;
      } else if (event.type === "gate") {
        output += ` gate at ${formatTime(event.timestamp)};`;
      }
    });
    return output;
  };

  const totalScored = events
    .filter((e) => e.type === "cycle")
    .reduce((sum, e) => sum + e.scored, 0);

  const totalBalls = events
    .filter((e) => e.type === "cycle")
    .reduce((sum, e) => sum + e.total, 0);

  const [teamNumber, setTeamNumber] = useState("");

  return (
    <div className="min-h-screen p-5 max-w-7xl mx-auto flex flex-col justify-center items-center gap-12">
      <header className="text-center mt-8">
        <h1 className="text-5xl font-bold">Heron Scout</h1>
        <p className="text-lg ">Heron's Match Analysis for DECODE</p>
      </header>

      {!isRecording && matchStartTime === null && (
        <div className="bg-white border-2 border-[#445f8b] flex flex-col items-center md:py-8 md:px-8 pb-4">
          <h2 className="text-3xl mt-2 mb-6 px-2">Start recording!</h2>
          <button
            onClick={() => {
              startMatch(null);
              logEvent(analytics, "start_no_timer");
            }}
            className="btn mb-4 !py-3 !bg-[#445f8b] !text-white !px-6"
          >
            <Play size={24} weight="fill" />
            No Timer (Stop when you want)
          </button>
          <div className="flex flex-row gap-5 justify-center mb-8 flex-wrap">
            <button
              onClick={() => {
                startMatch(30);
                logEvent(analytics, "start_30sec_timer");
              }}
              className="btn "
            >
              <Play size={24} weight="fill" />
              0:30 Timer (Auto)
            </button>
            <button
              onClick={() => {
                startMatch(120);
                logEvent(analytics, "start_2min_timer");
              }}
              className="btn"
            >
              <Play size={24} weight="fill" />
              2:00 Timer (TeleOp)
            </button>
          </div>
          <div className="flex gap-4 items-center mb-12">
            <hr className="w-12 grow border-t border-gray-300" />
            <span className="mx-2 text-gray-500">or</span>
            <hr className="grow w-12 border-t border-gray-300" />
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
            Heron Scout is a scouting app designed for intensive data analysis. First
            and foremost, it's easy to use — just press one of the buttons above
            to start recording a match. (Or import one.)
            <br />
            <br />
            Matches are stored as JSON and easily shareable! Scout matches with Heron Scout and you'll be able to compare teams
            at tournaments using the Tournament Analysis page.
            Matches and Tournaments can both be imported on the "Lifetime Stats"
            page to explore your performance over the course of the season and
            generate cool graphs!<br /><br />We love graphs at Heron Robotics, so we made this for you :)
          </p>
        </div>
      )}

      {(isRecording || matchStartTime !== null) && (
        <>
          <div className="bg-white p-8 text-center border-2 border-[#445f8b] flex flex-col items-center justify-center w-full gap-2">
            <h2 className="text-6xl font-mono">{formatTime(elapsedTime)}</h2>
            <div>
              Scored&nbsp;
              <span className="font-bold">
                {totalScored}/{totalBalls}
              </span>
              . Scroll down for instructions.
            </div>
          </div>

          <div className="bg-white p-6 border-2 border-[#445f8b] w-full">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between flex-wrap">
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
                <strong>PRO TIP:</strong> Use your keyboard to record cycles! See instructions below.
              </div>
            </div>
            <p className="mt-4">
              Set the team number for this match. Put together all of your scouting on the Tournament Analysis page later to compare teams!
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
              a match with your friends. Use JSON for advanced Heron Scout analysis!
            </p>
          </div>

          {events.length > 0 && (
            <Statistics events={events} teamNumber={teamNumber} />
          )}

          {!isRecording && events.length > 0 && (
            <div className="bg-white p-8 mt-8 border-2 border-[#445f8b] flex flex-col justif-center items-center gap-6">
              <div>
                <h3 className="text-xl mb-2">Match Data:</h3>
                <p className="mb-2">
                  Export this Match as JSON so you can analyze it with Heron Scout
                  later!
                </p>
                <p className="bg-[#f5f5f5] p-4 max-w-full font-mono text-sm leading-relaxed border-2 border-[#ddd]">
                  {formatMatchData()}
                </p>
              </div>
              <div className="w-full flex flex-wrap justify-center items-center gap-6">
                <p>
                  Send the above text to your friends, or export as JSON to analyze it with Heron Scout later!
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
      {currentPage === "tournament" && <TournamentPage />}
      {currentPage === "lifetime" && <LifetimePage />}
    </>
  );
}

export default MainApp;
