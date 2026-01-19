import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Calendar, DownloadSimple, FloppyDisk } from "@phosphor-icons/react";
import { useTournament } from "../data/TournamentContext";
import TournamentLanding from "./TournamentLanding";
import TournamentCreator from "./TournamentCreator";
import TeamChart from "../components/tournament/TeamChart";
import TeamLegend from "../components/tournament/TeamLegend";
import TeamSummaryGrid from "../components/tournament/TeamSummaryGrid";
import TournamentGraphs from "../components/tournament/TournamentGraphs";
import Statistics from "../components/Statistics";
import Timeline from "../components/Timeline";
import {
  calculateCycleTimes,
  calculateStats,
  matchScoredOutOfTotal,
  teamStatsFromTournament,
} from "../utils/stats";
import { downloadCsv, toCsv } from "../utils/csv";
import { useAuth } from "../contexts/AuthContext.jsx";
import { listMatchesForCurrentUser } from "../api/matchesApi.js";

function TournamentPage({ onBack }) {
  const {
    tournament,
    setTournament,
    selectedMatch,
    setSelectedMatch,
    selectedTeam,
    setSelectedTeam,
  } = useTournament();

  const [isCreating, setIsCreating] = useState(false);
  const { user, authLoading } = useAuth();
  const [userMatches, setUserMatches] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [matchesError, setMatchesError] = useState("");
  const [selectedTournamentName, setSelectedTournamentName] = useState("");

  useEffect(() => {
    if (!user) {
      setUserMatches([]);
      return;
    }

    const load = async () => {
      setLoadingMatches(true);
      setMatchesError("");
      try {
        const data = await listMatchesForCurrentUser();
        setUserMatches(data);
      } catch (err) {
        setMatchesError(err.message || "Error loading matches");
      } finally {
        setLoadingMatches(false);
      }
    };

    load();
  }, [user]);

  const tournamentNames = useMemo(() => {
    const names = Array.from(
      new Set(
        userMatches
          .map((m) => (m.tournamentName || "").trim())
          .filter(Boolean),
      ),
    );
    names.sort((a, b) => a.localeCompare(b));
    return names;
  }, [userMatches]);

  const handleCreateNew = () => setIsCreating(true);
  const handleTournamentCreated = (newTournament) => {
    setTournament(newTournament);
    setIsCreating(false);
  };

  const handleLoadFromMyMatches = () => {
    if (!selectedTournamentName) return;
    const matchesForTournament = userMatches.filter(
      (m) => (m.tournamentName || "").trim() === selectedTournamentName,
    );
    if (!matchesForTournament.length) return;

    const firstWithDate = matchesForTournament.find((m) => m.startTime);
    const dateIso = firstWithDate
      ? new Date(firstWithDate.startTime).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];

    setTournament({
      name: selectedTournamentName,
      date: dateIso,
      matches: matchesForTournament,
    });
    setSelectedMatch(0);
    setSelectedTeam("");
  };

  const handleBackFromTournament = () => {
    setTournament(null);
    setSelectedMatch(0);
    setSelectedTeam("");
  };

  const saveTournament = () => {
    const blob = new Blob([JSON.stringify(tournament, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tournament-${tournament.name.replace(/\s+/g, "-")}-${
      tournament.date
    }.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportMatchesCsv = () => {
    if (!tournament || !tournament.matches) return;

    const round = (n, digits = 3) => {
      const num = Number(n);
      if (!Number.isFinite(num)) return 0;
      const m = Math.pow(10, digits);
      return Math.round(num * m) / m;
    };

    const rows = filteredMatches.map((match) => {
      const matchIndex = tournament.matches.indexOf(match);
      const events = match?.events || [];
      const cycleEvents = events.filter((e) => e.type === "cycle");
      const cycleTimes = calculateCycleTimes(events);
      const timeStats = calculateStats(cycleTimes);

      const scoredBalls = cycleEvents.map((e) => e.scored);
      const totalBalls = cycleEvents.map((e) => e.total);
      const accuracyPerCycle = cycleEvents.map((e) =>
        e.total > 0 ? (e.scored / e.total) * 100 : 0
      );

      const ballStats = calculateStats(scoredBalls);
      const accuracyStats = calculateStats(accuracyPerCycle);

      const totalScored = scoredBalls.reduce((a, b) => a + b, 0);
      const totalBallCount = totalBalls.reduce((a, b) => a + b, 0);
      const overallAccuracy =
        totalBallCount > 0 ? (totalScored / totalBallCount) * 100 : 0;

      return {
        tournament_name: tournament.name,
        tournament_date: tournament.date,
        match_number: matchIndex >= 0 ? matchIndex + 1 : null,
        team_number: match.teamNumber || "",
        start_time: match.startTime
          ? new Date(match.startTime).toISOString()
          : "",
        duration_ms: match.duration ?? "",
        notes: match.notes || "",

        total_cycles: cycleEvents.length,
        total_scored: totalScored,
        total_balls: totalBallCount,
        overall_accuracy_percent: round(overallAccuracy, 3),

        cycle_time_avg_s: round(timeStats.avg, 3),
        cycle_time_std_s: round(timeStats.std, 3),
        cycle_time_min_s: round(timeStats.min, 3),
        cycle_time_max_s: round(timeStats.max, 3),

        balls_scored_per_cycle_avg: round(ballStats.avg, 3),
        balls_scored_per_cycle_std: round(ballStats.std, 3),
        balls_scored_per_cycle_min: round(ballStats.min, 3),
        balls_scored_per_cycle_max: round(ballStats.max, 3),

        accuracy_per_cycle_avg_percent: round(accuracyStats.avg, 3),
        accuracy_per_cycle_std_percent: round(accuracyStats.std, 3),
        accuracy_per_cycle_min_percent: round(accuracyStats.min, 3),
        accuracy_per_cycle_max_percent: round(accuracyStats.max, 3),
      };
    });

    const safe = (s) =>
      (s || "")
        .toString()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-zA-Z0-9\-_.]/g, "");
    const suffix = selectedTeam ? `team-${safe(selectedTeam)}` : "all-teams";
    const filename = `tournament-${safe(tournament.name)}-${
      tournament.date
    }-${suffix}-matches.csv`;

    const csv = toCsv(rows);
    downloadCsv(filename, csv);
  };

  if (isCreating) {
    return (
      <TournamentCreator
        onCancel={() => setIsCreating(false)}
        onTournamentCreated={handleTournamentCreated}
      />
    );
  }

  const handleImportTournament = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        setTournament(data);
      } catch (err) {
        console.error("Error parsing tournament JSON:", err);
        alert(
          "Error loading tournament file. Please ensure it is a valid JSON file."
        );
      }
    };
    reader.onerror = (err) => {
      console.error("Error reading file:", err);
      alert("Error reading file.");
    };
    reader.readAsText(file);
  };

  if (!tournament) {
    if (!user) {
      return (
        <TournamentLanding
          onCreateNew={handleCreateNew}
          onImportTournament={handleImportTournament}
          onBack={onBack}
        />
      );
    }

    return (
      <div className="min-h-screen p-3 sm:p-5 max-w-7xl mx-auto flex flex-col gap-6">
        <div className="my-6 sm:my-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-3xl sm:text-5xl font-bold">Tournament Analysis</h1>
            <p className="text-sm text-[#666] mt-2">
              Build a tournament from matches you have saved in <strong>My Matches</strong>,
              grouped by their tournament tag.
            </p>
          </div>
          <button onClick={onBack} className="btn w-full sm:w-auto justify-center">
            <ArrowLeft size={20} weight="bold" />
            Back to Home
          </button>
        </div>

        <div className="bg-white border-2 border-[#445f8b] p-4 sm:p-6">
          {authLoading || loadingMatches ? (
            <p className="text-[#445f8b]">Loading your matches...</p>
          ) : matchesError ? (
            <p className="text-red-600 text-sm">{matchesError}</p>
          ) : !tournamentNames.length ? (
            <p className="text-sm text-[#666]">
              No tournaments found. Add a <strong>tournament tag</strong> to your matches
              on the My Matches page, then come back here to analyze them.
            </p>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                <label className="font-semibold text-sm">
                  Select tournament tag:
                </label>
                <select
                  value={selectedTournamentName}
                  onChange={(e) => setSelectedTournamentName(e.target.value)}
                  className="p-2 border-2 border-[#ddd] focus:border-[#445f8b] outline-none w-full sm:min-w-56"
                >
                  <option value="">Choose a tournament...</option>
                  {tournamentNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={handleLoadFromMyMatches}
                disabled={!selectedTournamentName}
                className="btn !py-3 !bg-[#445f8b] !text-white !px-6 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Calendar weight="bold" size={20} />
                Analyze Selected Tournament
              </button>
              <p className="text-xs text-[#666] mt-3">
                Tournament tags are set when recording matches or editing them on the My
                Matches page.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  const teams = Array.from(
    new Set(
      tournament.matches
        .map((m) => (m.teamNumber || "").toString().trim())
        .filter(Boolean)
    )
  );

  const filteredMatches = selectedTeam
    ? tournament.matches.filter(
        (m) => (m.teamNumber || "").toString().trim() === selectedTeam
      )
    : tournament.matches;

  const currentMatch = filteredMatches[selectedMatch];

  const teamStats = teamStatsFromTournament(tournament);
  const palette = [
    "#445f8b",
    "#2d3e5c",
    "#7a93c2",
    "#9fb0df",
    "#ff7f50",
    "#6aa84f",
    "#f1c232",
    "#8e7cc3",
    "#d9534f",
    "#5bc0de",
  ];
  const teamColors = teamStats.reduce((acc, ts, i) => {
    acc[ts.team] = palette[i % palette.length];
    return acc;
  }, {});

  return (
    <div className="min-h-screen p-3 sm:p-5 max-w-7xl mx-auto">
      <div className="my-6 sm:my-8 flex flex-row flex-wrap gap-3 items-center justify-between">
        <div>
          <h1 className="text-3xl sm:text-5xl font-bold">{tournament.name}</h1>
          <p className="text-lg text-[#666] mt-2">
            {new Date(tournament.date).toLocaleDateString()}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={saveTournament}
            className="btn w-full sm:w-auto justify-center"
          >
            <FloppyDisk size={20} weight="bold" />
            Save Tournament
          </button>
          <button
            onClick={exportMatchesCsv}
            className="btn w-full sm:w-auto justify-center"
          >
            <DownloadSimple size={20} weight="bold" />
            Export CSV
          </button>
          <button
            onClick={handleBackFromTournament}
            className="btn w-full sm:w-auto justify-center"
          >
            <ArrowLeft size={20} weight="bold" />
            Back
          </button>
        </div>
      </div>

      <div className="mb-16">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <h2 className="text-3xl">Tournament Summary</h2>
        </div>

        <div className="bg-white p-4 sm:p-6 border-2 border-[#445f8b] mt-5">
          <h3 className="text-xl font-semibold mb-3">
            Match Scores — All Teams
          </h3>
          <div className="mb-2 text-sm text-[#666]">
            Sorted by median scored (highest first). Hover teams for score
            distributions.
          </div>

          <TeamLegend teamStats={teamStats} teamColors={teamColors} />
          <TeamChart
            matchesOrdered={tournament.matches}
            teamStats={teamStats}
            teamColors={teamColors}
          />
          <TeamSummaryGrid teamStats={teamStats} />
          <p className="mt-4 italic text-sm text-[#666]">
            ^ Hover over a box above!
          </p>
        </div>

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mt-16">
          <h2 className="text-3xl">Team Statistics</h2>
          {teams.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mt-4 w-full md:w-auto">
              <label className="font-semibold">Selected Team:</label>
              <select
                value={selectedTeam}
                onChange={(e) => {
                  setSelectedTeam(e.target.value);
                  setSelectedMatch(0);
                }}
                className="p-2 border-2 border-[#ddd] focus:border-[#445f8b] outline-none w-full sm:min-w-40"
              >
                <option value="">All Teams</option>
                {teams.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="bg-white p-4 sm:p-6 border-2 border-[#445f8b] mt-8">
          <h3 className="text-xl font-semibold mb-3">Team Statistics</h3>
          <div className={`mt-5 ${selectedTeam && "mb-5"}`}>
            <p className="text-[#666]">
              Select a team to view detailed graphs for that team.
            </p>
          </div>

          {selectedTeam && <TournamentGraphs matches={filteredMatches} />}
        </div>
      </div>

      <div className="w-full flex flex-col items-start p-4 sm:p-8 bg-[#f0f5fd]">
        <h2 className="mb-8">
          <span className="text-3xl mb-5">
            {selectedTeam
              ? "Team " + selectedTeam + "'s Matches"
              : "All Tournament Matches"}
          </span>
        </h2>

        <div className="w-full bg-white border-2 border-[#445f8b] p-4 sm:p-6 mb-8">
          <h3 className="text-2xl mb-4">
            Select Match ({filteredMatches.length} total)
          </h3>
          <div className="flex gap-3 flex-wrap">
            {filteredMatches.map((_, index) => {
              const matchStats = matchScoredOutOfTotal(filteredMatches[index]);
              const match = filteredMatches[index];
              const title = (match.title || '').trim();
              return (
                <button
                  key={index}
                  onClick={() => setSelectedMatch(index)}
                  className={`px-3 py-2 sm:px-6 sm:py-3 text-sm sm:text-base border-2 font-semibold transition-colors ${
                    selectedMatch === index
                      ? "border-[#445f8b] bg-[#445f8b] text-white"
                      : "border-[#ddd] bg-white hover:border-[#445f8b]"
                  }`}
                >
                  {title || `Match ${index + 1}`} (
                  {match.teamNumber || "No Team"}){" "}
                  <span
                    className={`ml-3 text-xs text-[#666] ${
                      selectedMatch == index ? "text-[#ddd]" : ""
                    }`}
                  >
                    {matchStats.scored}/{matchStats.total}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="w-full mb-8">
          {currentMatch ? (
            <>
              <Statistics
                events={currentMatch.events}
                teamNumber={currentMatch.teamNumber}
                notes={currentMatch.notes}
              />
              <Timeline
                events={currentMatch.events}
                currentTime={
                  currentMatch.events[currentMatch.events.length - 1]
                    ?.timestamp || 0
                }
              />
            </>
          ) : (
            <div className="bg-white border-2 border-[#445f8b] p-6 text-center text-[#666]">
              No matches for selected team.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TournamentPage;
