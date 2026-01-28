import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Target } from "@phosphor-icons/react";

import MatchRecorderScreen from "./home/MatchRecorderScreen";
import { matchRecorderConstants } from "../hooks/useMatchRecorder";
import { useMatchRecorderContext } from "../data/MatchRecorderContext";
import { useAuth } from "../contexts/AuthContext.jsx";
import { getMatchForCurrentUser } from "../api/matchesApi.js";

function MatchPage() {
  const recorder = useMatchRecorderContext();
  const { user } = useAuth();
  // const userId = user?.id;
  const [initialMeta, setInitialMeta] = useState(null);
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [loadError, setLoadError] = useState("");

  const loadedKeyRef = useRef(null);

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
      <div className="min-h-screen p-3 sm:p-5 max-w-5xl mx-auto flex flex-col items-center gap-6">
        <div className="w-full bg-white border-2 border-[#445f8b] p-6 sm:p-8">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">Match Recording</h2>
          <p className="text-sm text-[#555] mb-5">
            Start a match to begin recording cycles and gates.
          </p>

          <div className="bg-[#f7f9ff] border-2 border-[#445f8b]/30 p-4 sm:p-5 rounded-lg mb-5">
            <label className="flex flex-col sm:flex-row sm:items-center gap-3 w-32">
              <span className="font-medium flex items-center gap-2 text-[#2d3e5c]">
                <Target size={18} weight="bold" />
                Team Number:
              </span>
              <input
                type="number"
                value={recorder.teamNumber}
                onChange={(e) => recorder.setTeamNumber(e.target.value)}
                placeholder="Enter team #"
                className="px-4 py-3 border-2 border-[#ddd] focus:border-[#445f8b] outline-none w-full sm:w-44 text-center font-mono text-lg rounded transition-colors"
                min="1"
                max="99999"
              />
            </label>
          </div>

          <button
            onClick={() =>
              recorder.startMatch(matchRecorderConstants.MATCH_TOTAL_DURATION, "match")
            }
            className="w-full py-4 px-6 bg-[#445f8b] text-white font-bold text-lg hover:bg-[#2d3e5c] transition-all flex items-center justify-center gap-3 shadow-md"
          >
            <Play size={26} weight="fill" />
            Start Full Match
          </button>

          <div className="mt-3 text-xs text-[#666] text-center">
            30s Auto + 8s buffer + 2:00 TeleOp
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3 sm:p-5 max-w-7xl mx-auto flex flex-col items-center gap-6 sm:gap-12">
      {loadingMatch && (
        <p className="text-sm text-[#445f8b] mb-2 self-start">
          Loading saved match...
        </p>
      )}
      {loadError && (
        <p className="text-sm text-red-600 mb-2 self-start">{loadError}</p>
      )}
      <MatchRecorderScreen
        recorder={recorder}
        loadedMatchId={initialMeta?.id}
        initialTitle={initialMeta?.title}
        initialTournamentName={initialMeta?.tournamentName}
      />
    </div>
  );
}

export default MatchPage;
