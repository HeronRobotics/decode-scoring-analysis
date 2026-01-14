import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowClockwise,
  CricketIcon,
  Record,
  Stop,
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

function MatchRecorderScreen({ recorder }) {
  const [showCycleModal, setShowCycleModal] = useState(false);
  const [cycleData, setCycleData] = useState({ total: 1, scored: 0 });

  const [copiedFull, setCopiedFull] = useState(false);
  const [copiedAuto, setCopiedAuto] = useState(false);
  const [copiedTeleop, setCopiedTeleop] = useState(false);
  const [copiedFullUrl, setCopiedFullUrl] = useState(false);
  const [copiedAutoUrl, setCopiedAutoUrl] = useState(false);
  const [copiedTeleopUrl, setCopiedTeleopUrl] = useState(false);

  const posthog = usePostHog();
  const wasRecordingRef = useRef(false);
  const wasManualStopRef = useRef(false);
  const shareUrlCacheRef = useRef(new Map());

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
    [events, notes, teamNumber, matchStartTime, timerDuration, elapsedTime]
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
    ]
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
    ]
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
    const key = await createPaste(encoded);
    const url = `${window.location.origin}${
      window.location.pathname
    }?p=${encodeURIComponent(key)}`;

    shareUrlCacheRef.current.set(text, url);
    return url;
  };

  const copyUrlWithFeedback = async (text, setCopied) => {
    try {
      const url = await getShareUrl(text);
      copyWithFeedback(url, setCopied);
    } catch {
      alert("Unable to create share link. Please try again.");
    }
  };

  const shareUrl = async (text, label) => {
    let url;

    try {
      url = await getShareUrl(text);
    } catch {
      alert("Unable to create share link. Please try again.");
      return;
    }

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

  const exportMatchJson = () => {
    const data = {
      startTime: matchStartTime,
      duration: timerDuration,
      teamNumber,
      events,
      notes: notes || "",
    };

    downloadJson(`match-${new Date().toISOString()}.json`, data);

    logEvent(analytics, "export_match_json", {
      numEvents: events.length,
      totalScored,
      totalBalls,
    });
  };

  const confirmCycle = () => {
    recorder.addCycle({ total: cycleData.total, scored: cycleData.scored });
    setShowCycleModal(false);
    setCycleData({ total: 1, scored: 0 });
  };

  return (
    <>
      <div className="bg-white p-4 sm:p-8 text-center border-2 border-[#445f8b] flex flex-col items-center justify-center w-full gap-2">
        <h2 className="text-5xl sm:text-6xl font-mono">
          {formatTime(elapsedTime)}
        </h2>
        {mode === "match" && (
          <div className="mt-2 text-lg font-semibold">
            {phase === "auto" && "Auto Phase"}
            {phase === "buffer" && "Auto Wrap-up (8s buffer)"}
            {phase === "teleop" && "TeleOp Phase"}
            {phase === "finished" && "Match Complete"}
          </div>
        )}
        <div className="text-sm sm:text-base px-2">
          Scored&nbsp;
          <span className="font-bold">
            {totalScored}/{totalBalls}
          </span>
          . Scroll down for instructions.
        </div>
      </div>

      <div className="bg-white p-4 sm:p-6 border-2 border-[#445f8b] w-full">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between flex-wrap mb-4">
          <label className="flex flex-col sm:flex-row sm:items-center gap-2 text-lg font-semibold w-full sm:w-auto">
            <span>Team Number:</span>
            <input
              type="number"
              value={teamNumber}
              onChange={(e) => recorder.setTeamNumber(e.target.value)}
              placeholder="1234"
              className="px-3 py-2 border-2 border-[#ddd] focus:border-[#445f8b] outline-none w-full sm:w-48 text-center font-mono"
              min="1"
              max="99999"
            />
          </label>
          <div className="text-xs sm:text-sm text-[#666]">
            <strong>PRO TIP:</strong> Use your keyboard to record cycles! See
            instructions below.
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm font-semibold">
            Match Notes (optional):
          </label>
          <textarea
            value={notes}
            onChange={(e) => recorder.setNotes(e.target.value)}
            placeholder="Add any observations about this match..."
            className="w-full px-3 py-2 border-2 border-[#ddd] focus:border-[#445f8b] outline-none resize-vertical min-h-[60px]"
            rows="2"
          />
        </div>

        <p className="mt-4">
          Set the team number and add notes for this match. Put together all of
          your scouting on the Tournament Analysis page later to compare teams!
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center flex-wrap w-full">
        {isRecording ? (
          <>
            <button
              onClick={() => setShowCycleModal(true)}
              className="w-full sm:w-auto px-4 py-3 sm:px-8 sm:py-4 text-base sm:text-lg border-2 border-[#445f8b] bg-[#445f8b] text-white hover:bg-white hover:text-[#2d3e5c] transition-colors font-semibold flex items-center justify-center gap-2"
            >
              <Record size={24} weight="fill" />
              Record Cycle
            </button>
            <button
              onClick={() => recorder.addGate()}
              className="btn w-full sm:w-auto justify-center"
            >
              <CricketIcon size={24} weight="bold" />
              Gate Open
            </button>
            <button
              onClick={() => {
                wasManualStopRef.current = true;
                recorder.stopMatch();
              }}
              className="error-btn w-full sm:w-auto justify-center"
            >
              <Stop size={24} weight="fill" />
              Stop Match
            </button>
          </>
        ) : (
          <button
            onClick={() => recorder.resetMatch()}
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
          <strong>Instructions:</strong>
          <br />
          - To record a shooting cycle, press the "Record Cycle" button and
          select how many balls were shot and how many were successfully scored.
          <br />
          &nbsp;&nbsp;&nbsp;&nbsp;- <strong>Keyboard Users:</strong> Type the
          total number of balls (1-3) attempted, followed by the number scored
          (0-total), then press Enter. Esc to cancel.
          <br />
          - Record gate openings by pressing the "Gate Open" button.
          <br />
          - Events will appear on the timeline above as they are recorded.
          <br />
          - Export the Match and save it somewhere! The "Lifetime Stats" and
          "Tournament Analysis" pages can import your saved Matches and give you
          a lot more insight into your performance over time.
          <br />
          &nbsp;&nbsp;&nbsp;&nbsp;- <strong>Text export:</strong> You can export
          matches in a readable text format if you just want to share a match
          with your friends. Use JSON for advanced Heron Scout analysis!
        </p>
      </div>

      {events.length > 0 && (
        <Statistics events={events} teamNumber={teamNumber} notes={notes} />
      )}

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
    </>
  );
}

export default MatchRecorderScreen;
