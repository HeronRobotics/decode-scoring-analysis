import { useEffect, useMemo, useState } from "react";
import {
  TrendUp,
  Trophy,
  Medal,
  Calendar,
  ChartBar,
  ArrowUp,
  ArrowDown,
  Minus, Star,
  LightbulbIcon,
} from "@phosphor-icons/react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  ReferenceArea,
} from "recharts";
import Statistics from "../components/Statistics";
import { useAuth } from "../contexts/AuthContext.jsx";
import { listMatchesForCurrentUser } from "../api/matchesApi.js";
import { formatStat } from "../utils/format.js";
import ProgressionCharts from "../components/lifetime/ProgressionCharts.jsx";
import { calculateTotalPoints } from '../utils/scoring.js'
import { useTeamNames } from '../contexts/TeamNamesContext.jsx'
import TeamName from '../components/TeamName.jsx'

// Full match duration in seconds (30s auto + 8s buffer + 120s teleop)
const FULL_MATCH_DURATION = 158
// Tolerance in seconds for considering a match "full"
const FULL_MATCH_TOLERANCE = 10

const LIFETIME_STORAGE_KEY = "heron_lifetime_stats_v1";

// Helper to check if a match is a full match
const isFullMatch = (match) => {
  if (!match.duration) return false
  return Math.abs(match.duration - FULL_MATCH_DURATION) <= FULL_MATCH_TOLERANCE
}

function LifetimePage() {
  const { user, authLoading } = useAuth();
  const [matches, setMatches] = useState([]);
  const [teamNumber, setTeamNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showTournaments, setShowTournaments] = useState(false);
  const { loadTeamNames } = useTeamNames();

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LIFETIME_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.teamNumber) {
        setTeamNumber(parsed.teamNumber.toString());
      }
    } catch (e) {
      console.warn("Failed to load lifetime stats from localStorage", e);
    }
  }, []);

  useEffect(() => {
    try {
      if (!teamNumber) {
        window.localStorage.removeItem(LIFETIME_STORAGE_KEY);
        return;
      }
      const payload = {
        teamNumber,
      };
      window.localStorage.setItem(
        LIFETIME_STORAGE_KEY,
        JSON.stringify(payload),
      );
    } catch (e) {
      console.warn("Failed to save lifetime stats to localStorage", e);
    }
  }, [teamNumber]);

  useEffect(() => {
    if (!user) {
      setMatches([]);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await listMatchesForCurrentUser();
        setMatches(data);
      } catch (err) {
        setError(err.message || "Error loading matches");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  const teamMatches = useMemo(() => {
    const tn = (teamNumber || "").toString().trim();
    if (!tn) return matches;
    return matches.filter((m) => (m.teamNumber || "").toString().trim() === tn);
  }, [matches, teamNumber]);

  const allMatches = teamMatches;

  // Load team names for all unique teams
  useEffect(() => {
    const teamNumbers = [...new Set(
      matches.map(m => m.teamNumber).filter(Boolean)
    )];
    if (teamNumbers.length > 0) {
      loadTeamNames(teamNumbers);
    }
  }, [matches, loadTeamNames]);

  // Extract individual matches for analysis
  const matchStats = useMemo(() => {
    return teamMatches
      .map((match, index) => {
        const cycleEvents = (match.events || [])
          .filter((e) => e.type === "cycle")
          .slice()
          .sort(
            (a, b) => (Number(a.timestamp) || 0) - (Number(b.timestamp) || 0),
          );
        const scored = cycleEvents.reduce((sum, e) => sum + (e.scored || 0), 0);
        const total = cycleEvents.reduce((sum, e) => sum + (e.total || 0), 0);

        // Calculate cycle times for this match
        const cycleTimes = [];
        let lastEventTime = 0;
        (match.events || []).forEach((event) => {
          if (event.type === "cycle") {
            const timeDiff = event.timestamp - lastEventTime;
            if (timeDiff > 0) {
              cycleTimes.push(timeDiff / 1000);
            }
          }
          lastEventTime = event.timestamp;
        });

        const avgCycleTime =
          cycleTimes.length > 0
            ? cycleTimes.reduce((sum, t) => sum + t, 0) / cycleTimes.length
            : 0;

        let ballsPerTwoMinutes = null;
        if (cycleEvents.length > 1) {
          const firstTs = Number(cycleEvents[0].timestamp) || 0;
          const lastTs =
            Number(cycleEvents[cycleEvents.length - 1].timestamp) || 0;
          const durationMs = lastTs - firstTs;
          if (durationMs > 0) {
            const durationSeconds = durationMs / 1000;
            const perSecond = scored / durationSeconds;
            ballsPerTwoMinutes = perSecond * 120;
          }
        }

        const matchDate = match.startTime
          ? new Date(match.startTime)
          : match.createdAt
            ? new Date(match.createdAt)
            : new Date();

      // Calculate points
      const pointsBreakdown = calculateTotalPoints({
        events: match.events,
        motif: match.motif,
        autoPattern: match.autoPattern,
        teleopPattern: match.teleopPattern,
        autoLeave: match.autoLeave,
        teleopPark: match.teleopPark,
      })

      // Check if this is a full match (for points validity)
      const fullMatch = isFullMatch(match)

        return {
          id: match.id,
          name: match.title || match.tournamentName || `Match ${index + 1}`,
          tournamentName: match.tournamentName || "Unlabeled",
          teamNumber: match.teamNumber,
          date: matchDate.toISOString(),
          scored,
          total,
          cycles: cycleEvents.length,
          accuracy: total > 0 ? (scored / total) * 100 : 0,
          avgCycleTime,
          ballsPerTwoMinutes,
          points: pointsBreakdown.total,
          pointsBreakdown,
          isFullMatch: fullMatch,
          duration: match.duration,
        };
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [teamMatches]);

  const fullMatchStats = useMemo(() => {
    return matchStats.filter(m => m.isFullMatch)
  }, [matchStats])

  // Group matches by date for boxplot visualization
  const fullMatchStatsByDate = useMemo(() => {
    if (fullMatchStats.length === 0) return []

    // Group by date (ignoring time)
    const byDate = {}
    fullMatchStats.forEach(stat => {
      const dateKey = new Date(stat.date).toDateString()
      if (!byDate[dateKey]) {
        byDate[dateKey] = {
          date: new Date(stat.date).setHours(12, 0, 0, 0), // Use noon for consistent positioning
          matches: []
        }
      }
      byDate[dateKey].matches.push(stat)
    })

    // Convert to array and calculate stats
    const result = []
    Object.values(byDate).forEach(group => {
      const points = group.matches.map(m => m.points).sort((a, b) => a - b)

      if (points.length === 1) {
        // Single match - show as regular point
        result.push({
          date: group.date,
          dateTimestamp: group.date,
          value: points[0],
          type: 'single',
          matchName: group.matches[0].name
        })
      } else if (points.length === 2) {
        // Two matches - show both as individual dots
        group.matches.forEach((match, idx) => {
          result.push({
            date: group.date,
            dateTimestamp: group.date + idx * 60000, // Offset by 1 minute to separate them slightly
            value: match.points,
            type: 'single',
            matchName: match.name
          })
        })
      } else {
        // 3+ matches - calculate boxplot stats
        const min = points[0]
        const max = points[points.length - 1]
        const median = points.length % 2 === 0
          ? (points[points.length / 2 - 1] + points[points.length / 2]) / 2
          : points[Math.floor(points.length / 2)]
        const q1 = points[Math.floor(points.length * 0.25)]
        const q3 = points[Math.floor(points.length * 0.75)]

        result.push({
          date: group.date,
          dateTimestamp: group.date,
          value: median,
          min,
          max,
          q1,
          q3,
          type: 'boxplot',
          count: points.length
        })
      }
    })

    return result.sort((a, b) => a.dateTimestamp - b.dateTimestamp)
  }, [fullMatchStats])

  // Group all matches by date for boxplot visualization (accuracy)
  const matchStatsByDate = useMemo(() => {
    if (matchStats.length === 0) return []

    // Group by date (ignoring time)
    const byDate = {}
    matchStats.forEach(stat => {
      const dateKey = new Date(stat.date).toDateString()
      if (!byDate[dateKey]) {
        byDate[dateKey] = {
          date: new Date(stat.date).setHours(12, 0, 0, 0),
          matches: []
        }
      }
      byDate[dateKey].matches.push(stat)
    })

    // Convert to array and calculate stats
    const result = []
    Object.values(byDate).forEach(group => {
      const accuracies = group.matches.map(m => m.accuracy).sort((a, b) => a - b)

      if (accuracies.length === 1) {
        // Single match - show as regular point
        result.push({
          date: group.date,
          dateTimestamp: group.date,
          value: accuracies[0],
          type: 'single',
          matchName: group.matches[0].name
        })
      } else if (accuracies.length === 2) {
        // Two matches - show both as individual dots
        group.matches.forEach((match, idx) => {
          result.push({
            date: group.date,
            dateTimestamp: group.date + idx * 60000,
            value: match.accuracy,
            type: 'single',
            matchName: match.name
          })
        })
      } else {
        // 3+ matches - calculate boxplot stats
        const min = accuracies[0]
        const max = accuracies[accuracies.length - 1]
        const median = accuracies.length % 2 === 0
          ? (accuracies[accuracies.length / 2 - 1] + accuracies[accuracies.length / 2]) / 2
          : accuracies[Math.floor(accuracies.length / 2)]
        const q1 = accuracies[Math.floor(accuracies.length * 0.25)]
        const q3 = accuracies[Math.floor(accuracies.length * 0.75)]

        result.push({
          date: group.date,
          dateTimestamp: group.date,
          value: median,
          min,
          max,
          q1,
          q3,
          type: 'boxplot',
          count: accuracies.length
        })
      }
    })

    return result.sort((a, b) => a.dateTimestamp - b.dateTimestamp)
  }, [matchStats])

  // Calculate tournament date ranges for visualization (using all matches, not just full)
  const tournamentRanges = useMemo(() => {
    if (matchStats.length === 0) return []

    // Group matches by tournament
    const byTournament = {}
    matchStats.forEach(match => {
      const tournament = match.tournamentName || "Unlabeled"
      if (!byTournament[tournament]) {
        byTournament[tournament] = []
      }
      byTournament[tournament].push(new Date(match.date).getTime())
    })

    // Calculate date ranges for each tournament
    return Object.entries(byTournament)
      .filter(([name]) => name !== "Unlabeled")
      .map(([name, dates]) => {
        const sortedDates = dates.sort((a, b) => a - b)
        return {
          name,
          start: sortedDates[0],
          end: sortedDates[sortedDates.length - 1]
        }
      })
      .sort((a, b) => a.start - b.start)
  }, [matchStats])

  // Best and worst matches
  const bestMatch = useMemo(() => {
    if (matchStats.length === 0) return null;
    return matchStats.reduce(
      (best, match) => (match.accuracy > best.accuracy ? match : best),
      matchStats[0],
    );
  }, [matchStats]);

  const worstMatch = useMemo(() => {
    if (matchStats.length === 0) return null
    return matchStats.reduce((worst, match) =>
      match.accuracy < worst.accuracy ? match : worst
    , matchStats[0])
  }, [matchStats])

  // Best match by points (full matches only)
  const bestMatchByPoints = useMemo(() => {
    if (fullMatchStats.length === 0) return null
    return fullMatchStats.reduce((best, match) =>
      match.points > best.points ? match : best
    , fullMatchStats[0])
  }, [fullMatchStats])

  // Total points across all full matches
  const totalPoints = useMemo(() => {
    return fullMatchStats.reduce((sum, m) => sum + m.points, 0)
  }, [fullMatchStats])

  // Average points per full match
  const avgPoints = useMemo(() => {
    if (fullMatchStats.length === 0) return 0
    return totalPoints / fullMatchStats.length
  }, [totalPoints, fullMatchStats.length])

  // Tournament breakdown
  const tournamentStats = useMemo(() => {
    const byTournament = {};
    matchStats.forEach((match) => {
      const name = match.tournamentName;
      if (!byTournament[name]) {
        byTournament[name] = { name, matches: [], scored: 0, total: 0, cycles: 0, points: 0, fullMatchCount: 0 }
      }
      byTournament[name].matches.push(match)
      byTournament[name].scored += match.scored;
      byTournament[name].total += match.total;
      byTournament[name].cycles += match.cycles;
      // Only count points from full matches
      if (match.isFullMatch) {
        byTournament[name].points += match.points;
        byTournament[name].fullMatchCount += 1;
      }
    })

    return Object.values(byTournament)
      .map((t) => ({
        ...t,
        accuracy: t.total > 0 ? (t.scored / t.total * 100) : 0,
        matchCount: t.matches.length,
        avgPoints: t.fullMatchCount > 0 ? t.points / t.fullMatchCount : 0,
      }))
      .sort((a, b) => b.accuracy - a.accuracy);
  }, [matchStats]);

  // Recent vs Overall performance (last 5 matches vs all)
  const recentPerformance = useMemo(() => {
    if (matchStats.length < 3) return null;

    const recent = matchStats.slice(-5);
    const recentScored = recent.reduce((sum, m) => sum + m.scored, 0);
    const recentTotal = recent.reduce((sum, m) => sum + m.total, 0);
    const recentAccuracy =
      recentTotal > 0 ? (recentScored / recentTotal) * 100 : 0;

    const allScored = matchStats.reduce((sum, m) => sum + m.scored, 0);
    const allTotal = matchStats.reduce((sum, m) => sum + m.total, 0);
    const overallAccuracy = allTotal > 0 ? (allScored / allTotal) * 100 : 0;

    const diff = recentAccuracy - overallAccuracy;

    return {
      recentAccuracy,
      overallAccuracy,
      diff,
      trend: diff > 2 ? "improving" : diff < -2 ? "declining" : "stable",
      recentMatches: recent.length,
    };
  }, [matchStats]);

  return (
    <div className="min-h-screen p-3 sm:p-5 max-w-7xl mx-auto">
      <div className="my-6 sm:my-8 flex items-center justify-between">
        <h1 className="text-3xl sm:text-5xl font-bold">Lifetime Statistics</h1>
      </div>

      <div className="bg-brand-surface border border-brand-border rounded-2xl p-4 sm:p-6 mb-8">
        <h2 className="text-2xl sm:text-3xl mb-4">Filters</h2>
        <div className="flex flex-col sm:flex-row gap-4 items-center mb-2">
          <label className="flex items-center gap-2 font-semibold">
            Your Team #:
            <input
              type="number"
              value={teamNumber}
              onChange={(e) => setTeamNumber(e.target.value)}
              placeholder="1234"
              className="px-3 py-2 border-2 border-brand-border focus:border-brand-accent outline-none w-32 text-center font-mono"
              min="1"
            />
          </label>
        </div>
        <p className="text-sm text-brand-text mt-1">
          Lifetime stats are computed from matches saved to your account on the
          <strong> My Matches</strong> tab.
        </p>
      </div>

      {authLoading && (
        <div className="bg-brand-surface border border-brand-border rounded-2xl p-8 text-center">
          <p className="text-brand-accent">Loading account...</p>
        </div>
      )}

      {!authLoading && !user && (
        <div className="bg-brand-surface border border-brand-border rounded-2xl p-8 text-center">
          <p className="mb-2">
            Sign in and save matches to see your lifetime statistics.
          </p>
          <p className="text-sm text-brand-text">
            Use the <strong>Sign in / Sign up</strong> button in the top right,
            then record matches or bulk import them on the My Matches tab.
          </p>
        </div>
      )}

      {!authLoading && user && !loading && !allMatches.length && !error && (
        <div className="bg-brand-surface border border-brand-border rounded-2xl p-8 text-center">
          <p className="text-xl">
            No saved matches yet. Record a match or bulk import them on the My
            Matches tab.
          </p>
        </div>
      )}

      {!authLoading && user && error && (
        <div className="bg-brand-surface border border-brand-border rounded-2xl p-8 text-center">
          <p className="text-brand-accent text-sm">{error}</p>
        </div>
      )}

      {!authLoading && user && !error && allMatches.length > 0 && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-brand-surface border border-brand-border rounded-2xl p-5 text-center">
              <div className="text-4xl font-bold text-brand-accent mb-1">{matchStats.length}</div>
              <div className="text-sm text-brand-text">Total Matches Recorded</div>
            </div>
            <div className="bg-brand-surface border border-brand-border rounded-2xl p-5 text-center">
              <div className="text-4xl font-bold text-brand-accent mb-1">
                {matchStats.length > 0 ? formatStat(matchStats.reduce((sum, m) => sum + m.accuracy, 0) / matchStats.length) : 0}%
              </div>
              <div className="text-sm text-brand-text">Overall Accuracy</div>
            </div>
            <div className="bg-brand-surface border border-brand-border rounded-2xl p-5 text-center">
              <div className="text-4xl font-bold text-brand-accent mb-1">
                {matchStats.reduce((sum, m) => sum + m.scored, 0)}
              </div>
              <div className="text-sm text-brand-text">Total Balls Scored</div>
            </div>
          </div>

          {/* Points Overview - Full matches only */}
          {fullMatchStats.length > 0 && (
            <div className="bg-brand-accent border border-brand-accent rounded-2xl p-4 sm:p-6 mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <Star size={28} weight="fill" className="text-over-accent" />
                  <h2 className="text-2xl font-bold text-over-accent">Match Points</h2>
                </div>
                <span className="text-xs bg-brand-accentBg px-3 py-1.5 rounded text-over-accent w-fit">Full matches only (158s duration)</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-brand-accentBg rounded-lg p-4 text-center border border-brand-border">
                  <div className="text-3xl sm:text-4xl font-bold text-over-accent">{totalPoints}</div>
                  <div className="text-over-accent text-sm">Total Points</div>
                </div>
                <div className="bg-brand-accentBg rounded-lg p-4 text-center border border-brand-border">
                  <div className="text-3xl sm:text-4xl font-bold text-over-accent">{formatStat(avgPoints, 1)}</div>
                  <div className="text-over-accent text-sm">Avg per Match</div>
                </div>
                <div className="bg-brand-accentBg rounded-lg p-4 text-center border border-brand-border">
                  <div className="text-3xl sm:text-4xl font-bold text-over-accent">{bestMatchByPoints?.points || 0}</div>
                  <div className="text-over-accent text-sm">Best Match</div>
                </div>
                <div className="bg-brand-accentBg rounded-lg p-4 text-center border border-brand-border">
                  <div className="text-3xl sm:text-4xl font-bold text-over-accent">{fullMatchStats.length}</div>
                  <div className="text-over-accent text-sm">Full Matches</div>
                </div>
              </div>
            </div>
          )}

          {/* Key Insights Section */}
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-5 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Trophy size={24} weight="bold" className="text-brand-accent" />
              <h2 className="text-2xl font-bold">Performance Insights</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Best Performance */}
              {bestMatch && bestMatchByPoints && matchStats.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-brand-accent">Your Best</h3>
                  <div className="space-y-3">
                    <div className="bg-brand-accentBg border border-brand-border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-brand-text">Highest Points</span>
                        <Star size={18} className="text-brand-accent" weight="fill" />
                      </div>
                      <div className="text-3xl font-bold text-brand-accent mb-1">{bestMatchByPoints?.points || 0}</div>
                      <div className="text-xs text-brand-text">
                        {bestMatchByPoints?.name}
                      </div>
                    </div>

                    <div className="bg-brand-accentBg border border-brand-border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-brand-text">Best Accuracy</span>
                        <Medal size={18} className="text-brand-accent" weight="fill" />
                      </div>
                      <div className="text-3xl font-bold text-brand-accent mb-1">{formatStat(bestMatch.accuracy)}%</div>
                      <div className="text-xs text-brand-text">
                        {bestMatch.scored} of {bestMatch.total} scored • {bestMatch.name}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Areas for Improvement */}
              {worstMatch && matchStats.length > 1 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-brand-text">Focus Areas</h3>
                  <div className="space-y-3">
                    <div className="bg-brand-bg border border-brand-border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-brand-text">Lowest Accuracy</span>
                        <Medal size={18} className="text-brand-text" />
                      </div>
                      <div className="text-3xl font-bold text-brand-text mb-1">{formatStat(worstMatch.accuracy)}%</div>
                      <div className="text-xs text-brand-text">
                        {worstMatch.scored} of {worstMatch.total} scored • {worstMatch.name}
                      </div>
                    </div>

                    {/* Actionable insight */}
                    <div className="bg-brand-bg border border-brand-border rounded-lg p-3">
                      <div className="text-sm font-semibold text-brand-text mb-2 flex items-center gap-1"><LightbulbIcon weight="duotone" /> To Improve</div>
                      <ul className="text-xs text-brand-text space-y-1.5">
                        <li>• Aim for 70%+ accuracy</li>
                        <li>• Focus on cycle efficiency during practice</li>
                        <li>• Review matches with low accuracy for patterns</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Recent Performance Trend */}
          {recentPerformance && (
            <div className="bg-brand-surface border border-brand-border rounded-2xl p-5 mb-8">
              <div className="flex items-center gap-2 mb-4">
                <TrendUp size={24} weight="bold" className="text-brand-accent" />
                <h2 className="text-2xl font-bold">Recent Trend</h2>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center p-4 bg-brand-accentBg rounded-lg">
                  <div className="text-sm text-brand-text mb-1">
                    Last {recentPerformance.recentMatches} matches
                  </div>
                  <div className="text-4xl font-bold text-brand-accent">
                    {formatStat(recentPerformance.recentAccuracy)}%
                  </div>
                </div>
                <div className="text-center p-4 bg-brand-bg rounded-lg">
                  <div className="text-sm text-brand-text mb-1">Career average</div>
                  <div className="text-4xl font-bold text-brand-text">
                    {formatStat(recentPerformance.overallAccuracy)}%
                  </div>
                </div>
              </div>

              <div
                className={`flex items-center gap-2 p-4 rounded-lg ${
                  recentPerformance.trend === "improving"
                    ? "bg-brand-accentBg text-brand-accent border border-brand-border"
                    : recentPerformance.trend === "declining"
                      ? "bg-brand-bg text-brand-text border border-brand-border"
                      : "bg-brand-bg text-brand-text border border-brand-border"
                }`}
              >
                {recentPerformance.trend === "improving" && (
                  <ArrowUp size={24} weight="bold" />
                )}
                {recentPerformance.trend === "declining" && (
                  <ArrowDown size={24} weight="bold" />
                )}
                {recentPerformance.trend === "stable" && (
                  <Minus size={24} weight="bold" />
                )}
                <div>
                  <div className="font-bold text-base">
                    {recentPerformance.trend === "improving" && "Improving Performance"}
                    {recentPerformance.trend === "declining" && "Performance Dip"}
                    {recentPerformance.trend === "stable" && "Consistent Performance"}
                  </div>
                  <div className="text-sm">
                    {recentPerformance.trend === "improving" &&
                      `You're ${formatStat(Math.abs(recentPerformance.diff))}% above your career average`}
                    {recentPerformance.trend === "declining" &&
                      `You're ${formatStat(Math.abs(recentPerformance.diff))}% below your career average`}
                    {recentPerformance.trend === "stable" &&
                      "Your performance is steady with your career stats"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tournament Breakdown */}
          {tournamentStats.length > 1 && (
            <div className="bg-brand-surface border border-brand-border rounded-2xl p-4 sm:p-6 mb-8">
              <div className="flex items-center gap-2 mb-5">
                <ChartBar size={28} weight="bold" className="text-brand-accent" />
                <h2 className="text-2xl font-bold">
                  Performance by Tournament
                </h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Tournament Bar Chart */}
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={tournamentStats.slice(0, 8)}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        horizontal={true}
                        vertical={false}
                      />
                      <XAxis
                        type="number"
                        domain={[0, 100]}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={100}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip
                        formatter={(value) => [
                          `${formatStat(value)}%`,
                          "Accuracy",
                        ]}
                        contentStyle={{
                          backgroundColor: "var(--color-brand-bg)",
                          border: "2px solid var(--color-brand-border)",
                          fontFamily: "League Spartan",
                        }}
                      />
                      <Bar dataKey="accuracy" radius={[0, 4, 4, 0]}>
                        {tournamentStats.slice(0, 8).map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={index === 0 ? "var(--color-brand-text)" : "var(--color-brand-accent)"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Tournament Stats Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-brand-border">
                        <th className="text-left py-2 px-2">Tournament</th>
                        <th className="text-center py-2 px-2">Matches</th>
                        <th className="text-center py-2 px-2">Scored</th>
                        <th className="text-center py-2 px-2">Accuracy</th>
                        <th className="text-center py-2 px-2">Avg Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tournamentStats.map((t, i) => (
                        <tr
                          key={t.name}
                          className={i % 2 === 0 ? "bg-brand-bg" : ""}
                        >
                          <td className="py-2 px-2 font-medium">{t.name}</td>
                          <td className="text-center py-2 px-2">
                            {t.matchCount}
                          </td>
                          <td className="text-center py-2 px-2">
                            {t.scored}/{t.total}
                          </td>
                          <td className="text-center py-2 px-2 font-semibold text-brand-accent">
                            {formatStat(t.accuracy)}%
                          </td>
                          <td className="text-center py-2 px-2 font-semibold text-brand-accent">
                            {formatStat(t.avgPoints, 1)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Progression Charts */}
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-4 sm:p-6 mb-8">
            <h2 className="text-3xl mb-5 flex items-center gap-3">
              <Calendar weight="bold" size={32} />
              Match History
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xl font-semibold">Points Over Time <span className="text-sm font-normal text-brand-text">(full matches only)</span></h3>
                  {tournamentRanges.length > 0 && (
                    <button
                      onClick={() => setShowTournaments(!showTournaments)}
                      className={`px-3 py-1.5 text-xs font-semibold border-2 transition-colors ${
                        showTournaments
                          ? "bg-brand-accent text-brand-mainText border-brand-accent"
                          : "border-brand-accent text-brand-accent hover:bg-brand-accentBg"
                      }`}
                    >
                      {showTournaments ? "Hide" : "Show"} Tournaments
                    </button>
                  )}
                </div>
                <div className="h-72 border border-brand-border rounded-xl bg-brand-bg">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={fullMatchStatsByDate.map((stat) => ({
                        ...stat,
                        dateLabel: new Date(stat.dateTimestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      }))}
                      margin={{ top: 20, right: 20, left: 10, bottom: 20 }}
                    >
                      <CartesianGrid stroke="var(--color-brand-border)" strokeDasharray="0" />
                      <XAxis
                        dataKey="dateTimestamp"
                        type="number"
                        domain={['dataMin', 'dataMax']}
                        scale="time"
                        stroke="var(--color-brand-muted)"
                        style={{ fontSize: '11px', fontFamily: 'League Spartan' }}
                        tickFormatter={(timestamp) => new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      />
                      <YAxis
                        stroke="var(--color-brand-muted)"
                        style={{ fontSize: '11px', fontFamily: 'League Spartan' }}
                        tickFormatter={(val) => `${val}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--color-brand-bg)',
                          border: '2px solid var(--color-brand-border)',
                          fontFamily: 'League Spartan'
                        }}
                        formatter={(value, name, props) => {
                          const point = props.payload
                          if (point.type === 'boxplot') {
                            return [
                              `Median: ${point.value} pts\nRange: ${point.min}-${point.max} pts\n${point.count} matches`,
                              'Points Distribution'
                            ]
                          }
                          return [`${value} pts`, point.matchName || 'Points']
                        }}
                        labelFormatter={(label) => new Date(label).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      />
                      {showTournaments && tournamentRanges.map((tournament) => (
                        <ReferenceArea
                          key={tournament.name}
                          x1={tournament.start}
                          x2={tournament.end}
                          fill="var(--color-brand-accent)"
                          fillOpacity={0.08}
                          stroke="var(--color-brand-accent)"
                          strokeOpacity={0.3}
                          strokeWidth={1}
                          label={{
                            value: tournament.name,
                            position: 'top',
                            fill: 'var(--color-brand-accent)',
                            fontSize: 10,
                            fontFamily: 'League Spartan',
                            fontWeight: 600
                          }}
                        />
                      ))}
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="var(--color-brand-accent)"
                        strokeWidth={2}
                        dot={(props) => {
                          const { cx, cy, payload, height } = props
                          if (!payload) return null

                          if (payload.type === 'boxplot') {
                            // Use cy (median position) to calculate scale factor
                            const { min, max, q1, q3, value } = payload

                            const medianY = cy

                            // Calculate the data range to determine scale
                            const dataMax = Math.max(...fullMatchStatsByDate.map(d => d.type === 'boxplot' ? d.max : d.value))
                            const dataMin = Math.min(...fullMatchStatsByDate.map(d => d.type === 'boxplot' ? d.min : d.value))
                            const range = dataMax - dataMin || 1

                            // Calculate scale factor relative to the median
                            const getY = (val) => {
                              const valueDiff = val - value // difference in points from median
                              // Estimate chart rendering height (accounting for margins)
                              const estimatedChartHeight = (height || 232) - 40
                              const pixelsPerUnit = estimatedChartHeight / range

                              // cy corresponds to the median; calculate other positions relative to it
                              // Higher values should have lower Y (since SVG Y increases downward)
                              return cy - (valueDiff * pixelsPerUnit)
                            }

                            const minY = getY(min)
                            const maxY = getY(max)
                            const q1Y = getY(q1)
                            const q3Y = getY(q3)
                            const boxWidth = 4

                            return (
                              <g>
                                {/* Whiskers */}
                                <line x1={cx} y1={minY} x2={cx} y2={maxY} stroke="var(--color-brand-accent)" strokeWidth={0.5} />
                                <line x1={cx - 3} y1={minY} x2={cx + 3} y2={minY} stroke="var(--color-brand-accent)" strokeWidth={0.5} />
                                <line x1={cx - 3} y1={maxY} x2={cx + 3} y2={maxY} stroke="var(--color-brand-accent)" strokeWidth={0.5} />

                                {/* Box */}
                                <rect
                                  x={cx - boxWidth / 2}
                                  y={q3Y}
                                  width={boxWidth}
                                  height={q1Y - q3Y}
                                  fill="var(--color-brand-accent)"
                                  fillOpacity={0.3}
                                  stroke="var(--color-brand-accent)"
                                  strokeWidth={0.5}
                                />

                                {/* Median line */}
                                <line
                                  x1={cx - boxWidth}
                                  y1={medianY}
                                  x2={cx + boxWidth}
                                  y2={medianY}
                                  stroke="var(--color-brand-accent)"
                                  strokeWidth={2}
                                />
                              </g>
                            )
                          } else {
                            // Regular dot
                            return <circle cx={cx} cy={cy} r={3} fill="var(--color-brand-accent)" stroke="none" />
                          }
                        }}
                        activeDot={{ r: 5 }}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xl font-semibold">Accuracy Over Time</h3>
                  {tournamentRanges.length > 0 && (
                    <button
                      onClick={() => setShowTournaments(!showTournaments)}
                      className={`px-3 py-1.5 text-xs font-semibold border-2 transition-colors ${
                        showTournaments
                          ? "bg-brand-accent text-brand-mainText border-brand-accent"
                          : "border-brand-accent text-brand-accent hover:bg-brand-accentBg"
                      }`}
                    >
                      {showTournaments ? "Hide" : "Show"} Tournaments
                    </button>
                  )}
                </div>
                <div className="h-72 border border-brand-border rounded-xl bg-brand-bg">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={matchStatsByDate.map((stat) => ({
                        ...stat,
                        dateLabel: new Date(stat.dateTimestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      }))}
                      margin={{ top: 20, right: 20, left: 10, bottom: 20 }}
                    >
                      <CartesianGrid stroke="var(--color-brand-border)" strokeDasharray="0" />
                      <XAxis
                        dataKey="dateTimestamp"
                        type="number"
                        domain={['dataMin', 'dataMax']}
                        scale="time"
                        stroke="var(--color-brand-muted)"
                        style={{ fontSize: '11px', fontFamily: 'League Spartan' }}
                        tickFormatter={(timestamp) => new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      />
                      <YAxis
                        domain={[0, 100]}
                        stroke="var(--color-brand-muted)"
                        style={{ fontSize: '11px', fontFamily: 'League Spartan' }}
                        tickFormatter={(val) => `${val}%`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--color-brand-bg)',
                          border: '2px solid var(--color-brand-border)',
                          fontFamily: 'League Spartan'
                        }}
                        formatter={(value, _name, props) => {
                          const point = props.payload
                          if (point.type === 'boxplot') {
                            return [
                              `Med(${formatStat(point.value)}%). ${point.count} matches`,
                              'Accuracy Distribution'
                            ]
                          }
                          return [`${formatStat(value)}%`, point.matchName || 'Accuracy']
                        }}
                        labelFormatter={(label) => new Date(label).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      />
                      {showTournaments && tournamentRanges.map((tournament) => (
                        <ReferenceArea
                          key={tournament.name}
                          x1={tournament.start}
                          x2={tournament.end}
                          fill="var(--color-brand-accent)"
                          fillOpacity={0.08}
                          stroke="var(--color-brand-accent)"
                          strokeOpacity={0.3}
                          strokeWidth={1}
                          label={{
                            value: tournament.name,
                            position: 'top',
                            fill: 'var(--color-brand-accent)',
                            fontSize: 10,
                            fontFamily: 'League Spartan',
                            fontWeight: 600
                          }}
                        />
                      ))}
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="var(--color-brand-accent)"
                        strokeWidth={2}
                        dot={(props) => {
                          const { cx, cy, payload, height } = props
                          if (!payload) return null

                          if (payload.type === 'boxplot') {
                            // Use cy (median position) to calculate scale factor
                            // Since YAxis domain is [0, 100], we can derive the pixels-per-unit ratio
                            const { min, max, q1, q3, value } = payload

                            // cy is the correct Y position for the median (value)
                            // Domain is [0, 100] where 100 is at top (low Y) and 0 is at bottom (high Y)
                            // Calculate scale: how many pixels per percentage point
                            // cy = chartTop + (100 - value) * scale
                            // We can use cy and value to find the scale factor

                            const medianY = cy

                            // Calculate scale factor using the median as reference
                            // If domain is [0, 100], then the full height represents 100 units
                            // scale = pixels_per_unit
                            // We derive it from: cy corresponds to value
                            // For a value of 100 (top), Y should be near 0 (plus margin)
                            // For a value of 0 (bottom), Y should be near height (minus margin)

                            // Use the median to calculate the scale
                            // Assuming the chart scales linearly from 0 at bottom to 100 at top
                            // chartTop is the Y coordinate for value=100
                            // chartBottom is the Y coordinate for value=0
                            // cy = chartTop + (100 - value) * (chartBottom - chartTop) / 100
                            // Rearranging: (cy - chartTop) = (100 - value) * scale where scale = (chartBottom - chartTop) / 100

                            // We can estimate chartTop and chartBottom from the median:
                            // scale = (chartBottom - chartTop) / 100
                            // Let's assume the relationship is linear and use cy to derive positions

                            // Better approach: calculate how many pixels correspond to the percentage difference from median
                            const getY = (val) => {
                              // Calculate pixel distance from median proportional to value distance
                              const valueDiff = val - value // difference in percentage points
                              // In SVG, Y increases downward, but values increase upward
                              // So higher values should have lower Y coordinates
                              // scale factor: we need to know pixels per percentage point
                              // From cy and value, we can estimate the full chart height
                              // For domain [0, 100]: chartHeight / 100 = pixels per unit
                              // cy should correspond to: chartBottom - (value / 100) * totalChartHeight
                              // where chartBottom is the Y position for value=0

                              // Simpler: use the fact that domain is [0,100]
                              // and estimate scale from the median position
                              // If value is at cy, then:
                              // - Moving up 1 percentage point should decrease Y
                              // - The scale is approximately: full_height / 100

                              // Estimate the full rendering height from cy and value
                              const estimatedChartHeight = (height || 232) - 40 // Account for margins
                              const pixelsPerUnit = estimatedChartHeight / 100

                              return cy - (valueDiff * pixelsPerUnit)
                            }

                            const minY = getY(min)
                            const maxY = getY(max)
                            const q1Y = getY(q1)
                            const q3Y = getY(q3)
                            const boxWidth = 4

                            return (
                              <g>
                                {/* Whiskers */}
                                <line x1={cx} y1={minY} x2={cx} y2={maxY} stroke="var(--color-brand-accent)" strokeWidth={0.5} />
                                <line x1={cx - 3} y1={minY} x2={cx + 3} y2={minY} stroke="var(--color-brand-accent)" strokeWidth={0.5} />
                                <line x1={cx - 3} y1={maxY} x2={cx + 3} y2={maxY} stroke="var(--color-brand-accent)" strokeWidth={0.5} />

                                {/* Box */}
                                <rect
                                  x={cx - boxWidth / 2}
                                  y={q3Y}
                                  width={boxWidth}
                                  height={q1Y - q3Y}
                                  fill="var(--color-brand-accent)"
                                  fillOpacity={0.3}
                                  stroke="var(--color-brand-accent)"
                                  strokeWidth={0.5}
                                />

                                {/* Median line */}
                                <line
                                  x1={cx - boxWidth}
                                  y1={medianY}
                                  x2={cx + boxWidth}
                                  y2={medianY}
                                  stroke="var(--color-brand-accent)"
                                  strokeWidth={2}
                                />
                              </g>
                            )
                          } else {
                            // Regular dot
                            return <circle cx={cx} cy={cy} r={3} fill="var(--color-brand-accent)" stroke="none" />
                          }
                        }}
                        activeDot={{ r: 5 }}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default LifetimePage;
