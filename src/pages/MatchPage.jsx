import { useEffect, useMemo, useRef, useState } from "react";
import { HashIcon, PaletteIcon, Play, Target, ArrowClockwise, Trash } from "@phosphor-icons/react";

import MatchRecorderScreen from "./home/MatchRecorderScreen";
import { matchRecorderConstants } from "../hooks/useMatchRecorder";
import { useMatchRecorderContext } from "../data/MatchRecorderContext";
import { useAuth } from "../contexts/AuthContext.jsx";
import { getMatchForCurrentUser } from "../api/matchesApi.js";
import { loadDraft, clearDraft } from "../utils/localMatchStorage.js";

function MatchPage() {
  const recorder = useMatchRecorderContext();
  const { user } = useAuth();
  const [selectedMotif, setSelectedMotif] = useState("");
  const [initialMeta, setInitialMeta] = useState(null);
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [pendingDraft, setPendingDraft] = useState(null);

  const loadedKeyRef = useRef(null);

  // Check for unfinished draft on mount
  useEffect(() => {
    const draft = loadDraft();
    if (draft && draft.events && draft.events.length > 0) {
      setPendingDraft(draft);
    }
  }, []);

  const matchId = new URLSearchParams(window.location.search).get("match");

  useEffect(() => {
    if (!matchId || !user?.id) return;

    const loadedKey = `${user.id}:${matchId}`;
    if (loadedKeyRef.current === loadedKey) return;
    loadedKeyRef.current = loadedKey;

    const applyParsedMatchData = recorder.applyParsedMatchData;

    let cancelled = false;
    const load = async () => {
      setLoadingMatch(true);
      setLoadError("");
      try {
        const match = await getMatchForCurrentUser(matchId);
        if (cancelled) return;
        applyParsedMatchData(match);
        setInitialMeta({
          id: match.id,
          title: match.title || "",
          tournamentName: match.tournamentName || "",
        });
        // setLoadedMatchIdFromUrl(match.id);
      } catch (err) {
        if (!cancelled) {
          setLoadError(err.message || "Error loading match");
        }
      } finally {
        if (!cancelled) setLoadingMatch(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id, matchId, recorder.applyParsedMatchData]);

  const hasSession = useMemo(
    () => recorder.isRecording || recorder.matchStartTime !== null || recorder.isReady,
    [recorder.isRecording, recorder.matchStartTime, recorder.isReady]
  );

  if (!hasSession && !loadingMatch) {
    return (
      <div className="page">
        <div className="bg" aria-hidden="true" />
        <div className="content min-h-screen p-4 sm:p-8 max-w-5xl mx-auto flex flex-col items-center gap-6">
          {pendingDraft && (
            <div className="w-full bg-brand-surface border-2 border-brand-accent rounded-xl p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-brand-main-text mb-1">
                    Unfinished match found
                  </h3>
                  <p className="text-sm text-brand-text">
                    {pendingDraft.teamNumber ? `Team ${pendingDraft.teamNumber}` : "Unknown team"}
                    {" \u2014 "}
                    {pendingDraft.events.filter((e) => e.type === "cycle").length} cycle
                    {pendingDraft.events.filter((e) => e.type === "cycle").length !== 1 ? "s" : ""} recorded
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      recorder.restoreFromDraft(pendingDraft);
                      setPendingDraft(null);
                    }}
                    className="button flex items-center gap-2"
                  >
                    <ArrowClockwise size={18} weight="bold" />
                    Resume
                  </button>
                  <button
                    onClick={() => {
                      clearDraft();
                      setPendingDraft(null);
                    }}
                    className="error-btn flex items-center gap-2"
                  >
                    <Trash size={18} weight="bold" />
                    Discard
                  </button>
                </div>
              </div>
            </div>
          )}
          <div className="w-full card p-6 sm:p-8">
            <div className="pill mb-4 w-36 text-center">Match Recording</div>
            <h1 className="text-2xl sm:text-3xl font-semibold mb-2">Start a new match session</h1>
            <p className="text-sm text-brand-accent mb-5">
              Will start a new match with full timing (30s Auto + 8s Transition + 2:00 TeleOp).
            </p>

            <div className="bg-brand-surface flex flex-row flex-wrap justify-around rounded-lg p-4 mb-6 space-y-3">
              <label className="flex flex-col sm:flex-row sm:items-center gap-3 m-0">
                <span className="text-brand-text font-medium flex items-center gap-2">
                  <HashIcon size={20} weight="bold" />
                  Team Number:
                </span>
                <input
                  type="number"
                  value={recorder.teamNumber}
                  onChange={(e) => recorder.setTeamNumber(e.target.value)}
                  placeholder="Enter team #"
                  className="input min-w-48 sm:w-40 text-center font-mono text-brand-text placeholder-brand-muted"
                  min="1"
                  max="99999"
                />
              </label>
              <label className="flex flex-col sm:flex-row sm:items-center gap-3">
                <span className="text-brand-text font-medium flex items-center gap-2">
                  <PaletteIcon size={20} weight="bold" />
                  Motif Pattern:
                </span>
                <select
                  value={selectedMotif}
                  onChange={(e) => setSelectedMotif(e.target.value)}
                  className="input min-w-48 sm:w-40 text-center font-mono text-brand-text appearance-none cursor-pointer"
                >
                  <option value="" className="text-brand-text">Not set</option>
                  <option value="GPP" className="text-brand-text">GPP</option>
                  <option value="PGP" className="text-brand-text">PGP</option>
                  <option value="PPG" className="text-brand-text">PPG</option>
                </select>
              </label>
            </div>

            <button
              onClick={() =>
                recorder.startMatch(matchRecorderConstants.MATCH_TOTAL_DURATION, "match", selectedMotif || null)
              }
              className="button w-full flex items-center justify-center gap-3"
            >
              <Play size={26} weight="fill" />
              Start Full Match
            </button>

            <div className="mt-3 text-xs text-brand-muted text-center">
              30s Auto + 8s buffer + 2:00 TeleOp
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="bg" aria-hidden="true" />
      <div className="content min-h-screen p-4 sm:p-8 max-w-7xl mx-auto flex flex-col items-center gap-6 sm:gap-12">
        {loadingMatch && (
          <p className="text-sm muted mb-2 self-start">
            Loading saved match...
          </p>
        )}
        {loadError && (
          <p className="text-sm text-red-400 mb-2 self-start">{loadError}</p>
        )}
        <div className="w-full p-4 sm:p-6 flex flex-col items-center">
          <MatchRecorderScreen
            recorder={recorder}
            loadedMatchId={initialMeta?.id}
            initialTitle={initialMeta?.title}
            initialTournamentName={initialMeta?.tournamentName}
          />
        </div>
      </div>
    </div>
  );
}

export default MatchPage;
