import { useEffect, useMemo, useState } from "react";
import { TrendUp } from "@phosphor-icons/react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Statistics from "../components/Statistics";
import { useAuth } from "../contexts/AuthContext.jsx";
import { listMatchesForCurrentUser } from "../api/matchesApi.js";

const LIFETIME_STORAGE_KEY = "heron_lifetime_stats_v1";

function LifetimePage() {
  const { user, authLoading } = useAuth();
  const [matches, setMatches] = useState([]);
  const [teamNumber, setTeamNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  // Extract individual matches for graphing
  const matchStats = teamMatches
    .map((match, index) => {
      const cycleEvents = match.events.filter((e) => e.type === "cycle");
      const scored = cycleEvents.reduce((sum, e) => sum + e.scored, 0);
      const total = cycleEvents.reduce((sum, e) => sum + e.total, 0);

      // Calculate cycle times for this match
      const cycleTimes = [];
      let lastEventTime = 0;
      match.events.forEach((event) => {
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

      const matchDate = new Date(match.startTime);

      return {
        name: match.title || match.tournamentName || `Match ${index + 1}`,
        tournamentName: match.tournamentName || "Unlabeled",
        date: matchDate.toISOString(),
        scored,
        total,
        accuracy: total > 0 ? (scored / total) * 100 : 0,
        avgCycleTime,
      };
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <div className="min-h-screen p-3 sm:p-5 max-w-7xl mx-auto">
      <div className="my-6 sm:my-8 flex items-center justify-between">
        <h1 className="text-3xl sm:text-5xl font-bold">Lifetime Statistics</h1>
      </div>

      <div className="bg-white border-2 border-[#445f8b] p-4 sm:p-6 mb-8">
        <h2 className="text-2xl sm:text-3xl mb-4">Filters</h2>
        <div className="flex flex-col sm:flex-row gap-4 items-center mb-2">
          <label className="flex items-center gap-2 font-semibold">
            Your Team #:
            <input
              type="number"
              value={teamNumber}
              onChange={(e) => setTeamNumber(e.target.value)}
              placeholder="1234"
              className="px-3 py-2 border-2 border-[#ddd] focus:border-[#445f8b] outline-none w-32 text-center font-mono"
              min="1"
            />
          </label>
        </div>
        <p className="text-sm text-[#666] mt-1">
          Lifetime stats are computed from matches saved to your account on the
          <strong> My Matches</strong> tab.
        </p>
      </div>

      {authLoading && (
        <div className="bg-white border-2 border-[#445f8b] p-8 text-center">
          <p className="text-[#445f8b]">Loading account...</p>
        </div>
      )}

      {!authLoading && !user && (
        <div className="bg-white border-2 border-[#445f8b] p-8 text-center">
          <p className="mb-2">
            Sign in and save matches to see your lifetime statistics.
          </p>
          <p className="text-sm text-[#666]">
            Use the <strong>Sign in / Sign up</strong> button in the top right,
            then record matches or bulk import them on the My Matches tab.
          </p>
        </div>
      )}

      {!authLoading && user && !loading && !allMatches.length && !error && (
        <div className="bg-white border-2 border-[#445f8b] p-8 text-center">
          <p className="text-xl">
            No saved matches yet. Record a match or bulk import them on the My
            Matches tab.
          </p>
        </div>
      )}

      {!authLoading && user && error && (
        <div className="bg-white border-2 border-[#445f8b] p-8 text-center">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {!authLoading && user && !error && allMatches.length > 0 && (
        <>
          {/* Career Summary
          <div className="mb-8">
            <Statistics matches={allMatches} />
          </div> */}

          {/* Progression Chart */}
          <div className="bg-white border-2 border-[#445f8b] p-4 sm:p-6 mb-8">
            <h2 className="text-3xl mb-5 flex items-center gap-3">
              <TrendUp weight="bold" size={32} />
              Progression
            </h2>

            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-3">Accuracy Over Time</h3>
              <div className="h-80 border-2 border-[#ddd] bg-white">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={matchStats.map((stat, i) => ({
                      ...stat,
                      index: i,
                      dateLabel: new Date(stat.date).toLocaleString("en-US"),
                    }))}
                    margin={{ top: 20, right: 20, left: 10, bottom: 20 }}
                  >
                    <CartesianGrid stroke="#e5e7eb" strokeDasharray="0" />
                    <XAxis
                      dataKey="dateLabel"
                      stroke="#666"
                      style={{ fontSize: "12px", fontFamily: "League Spartan" }}
                      interval="preserveStartEnd"
                      minTickGap={20}
                      angle={-35}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis
                      domain={[0, 100]}
                      stroke="#666"
                      style={{ fontSize: "12px", fontFamily: "League Spartan" }}
                      tickFormatter={(val) => `${val}%`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "2px solid #445f8b",
                        fontFamily: "League Spartan",
                      }}
                      formatter={(value) => [
                        `${value.toFixed(1)}%`,
                        "Accuracy",
                      ]}
                      labelFormatter={(label, payload) =>
                        payload[0]?.payload.name
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="accuracy"
                      stroke="#445f8b"
                      strokeWidth={2}
                      dot={{ fill: "#445f8b", r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3">
                Average Cycle Time Over Time
              </h3>
              <div className="h-80 border-2 border-[#ddd] bg-white">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={matchStats.map((stat, i) => ({
                      ...stat,
                      index: i,
                      dateLabel: new Date(stat.date).toLocaleString(),
                    }))}
                    margin={{ top: 20, right: 20, left: 10, bottom: 20 }}
                  >
                    <CartesianGrid stroke="#e5e7eb" strokeDasharray="0" />
                    <XAxis
                      dataKey="dateLabel"
                      stroke="#666"
                      style={{ fontSize: "12px", fontFamily: "League Spartan" }}
                      interval="preserveStartEnd"
                      minTickGap={20}
                      angle={-35}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis
                      stroke="#666"
                      style={{ fontSize: "12px", fontFamily: "League Spartan" }}
                      tickFormatter={(val) => `${val}s`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "2px solid #445f8b",
                        fontFamily: "League Spartan",
                      }}
                      formatter={(value) => [
                        `${value.toFixed(1)}s`,
                        "Avg Cycle Time",
                      ]}
                      labelFormatter={(label, payload) =>
                        payload[0]?.payload.name
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="avgCycleTime"
                      stroke="#445f8b"
                      strokeWidth={2}
                      dot={{ fill: "#445f8b", r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default LifetimePage;
