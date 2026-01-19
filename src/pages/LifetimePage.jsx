import { useEffect, useMemo, useState } from 'react'
import { TrendUp, Trophy, Medal, Calendar, ChartBar, ArrowUp, ArrowDown, Minus } from '@phosphor-icons/react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts'
import Statistics from '../components/Statistics'
import { useAuth } from '../contexts/AuthContext.jsx'
import { listMatchesForCurrentUser } from '../api/matchesApi.js'
import { formatStat } from '../utils/format.js'

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

  const allMatches = teamMatches

  // Extract individual matches for analysis
  const matchStats = useMemo(() => {
    return teamMatches.map((match, index) => {
      const cycleEvents = (match.events || []).filter(e => e.type === 'cycle')
      const scored = cycleEvents.reduce((sum, e) => sum + (e.scored || 0), 0)
      const total = cycleEvents.reduce((sum, e) => sum + (e.total || 0), 0)

      // Calculate cycle times for this match
      const cycleTimes = []
      let lastEventTime = 0
      ;(match.events || []).forEach(event => {
        if (event.type === 'cycle') {
          const timeDiff = event.timestamp - lastEventTime
          if (timeDiff > 0) {
            cycleTimes.push(timeDiff / 1000);
          }
        }
        lastEventTime = event.timestamp
      })

      const avgCycleTime = cycleTimes.length > 0
        ? cycleTimes.reduce((sum, t) => sum + t, 0) / cycleTimes.length
        : 0

      const matchDate = match.startTime ? new Date(match.startTime) : match.createdAt ? new Date(match.createdAt) : new Date()

      return {
        id: match.id,
        name: match.title || match.tournamentName || `Match ${index + 1}`,
        tournamentName: match.tournamentName || "Unlabeled",
        date: matchDate.toISOString(),
        scored,
        total,
        cycles: cycleEvents.length,
        accuracy: total > 0 ? (scored / total * 100) : 0,
        avgCycleTime
      }
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date))
  }, [teamMatches])

  // Best and worst matches
  const bestMatch = useMemo(() => {
    if (matchStats.length === 0) return null
    return matchStats.reduce((best, match) =>
      match.accuracy > best.accuracy ? match : best
    , matchStats[0])
  }, [matchStats])

  const worstMatch = useMemo(() => {
    if (matchStats.length === 0) return null
    return matchStats.reduce((worst, match) =>
      match.accuracy < worst.accuracy ? match : worst
    , matchStats[0])
  }, [matchStats])

  // Tournament breakdown
  const tournamentStats = useMemo(() => {
    const byTournament = {}
    matchStats.forEach(match => {
      const name = match.tournamentName
      if (!byTournament[name]) {
        byTournament[name] = { name, matches: [], scored: 0, total: 0, cycles: 0 }
      }
      byTournament[name].matches.push(match)
      byTournament[name].scored += match.scored
      byTournament[name].total += match.total
      byTournament[name].cycles += match.cycles
    })

    return Object.values(byTournament)
      .map(t => ({
        ...t,
        accuracy: t.total > 0 ? (t.scored / t.total * 100) : 0,
        matchCount: t.matches.length
      }))
      .sort((a, b) => b.accuracy - a.accuracy)
  }, [matchStats])

  // Recent vs Overall performance (last 5 matches vs all)
  const recentPerformance = useMemo(() => {
    if (matchStats.length < 3) return null

    const recent = matchStats.slice(-5)
    const recentScored = recent.reduce((sum, m) => sum + m.scored, 0)
    const recentTotal = recent.reduce((sum, m) => sum + m.total, 0)
    const recentAccuracy = recentTotal > 0 ? (recentScored / recentTotal * 100) : 0

    const allScored = matchStats.reduce((sum, m) => sum + m.scored, 0)
    const allTotal = matchStats.reduce((sum, m) => sum + m.total, 0)
    const overallAccuracy = allTotal > 0 ? (allScored / allTotal * 100) : 0

    const diff = recentAccuracy - overallAccuracy

    return {
      recentAccuracy,
      overallAccuracy,
      diff,
      trend: diff > 2 ? 'improving' : diff < -2 ? 'declining' : 'stable',
      recentMatches: recent.length
    }
  }, [matchStats])

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
          </div>

          {/* Performance Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Best & Worst Matches */}
            {bestMatch && worstMatch && matchStats.length > 1 && (
              <div className="bg-white border-2 border-[#445f8b] p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Trophy size={24} weight="bold" className="text-[#445f8b]" />
                  <h3 className="text-xl font-bold">Best & Worst Matches</h3>
                </div>

                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Medal size={20} className="text-green-600" weight="fill" />
                      <span className="text-sm font-semibold text-green-700">Best Performance</span>
                    </div>
                    <div className="text-2xl font-bold text-green-800">{formatStat(bestMatch.accuracy)}%</div>
                    <div className="text-sm text-green-700">
                      {bestMatch.name} • {bestMatch.scored}/{bestMatch.total} scored
                    </div>
                  </div>

                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Medal size={20} className="text-red-400" />
                      <span className="text-sm font-semibold text-red-700">Needs Improvement</span>
                    </div>
                    <div className="text-2xl font-bold text-red-800">{formatStat(worstMatch.accuracy)}%</div>
                    <div className="text-sm text-red-700">
                      {worstMatch.name} • {worstMatch.scored}/{worstMatch.total} scored
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Performance Trend */}
            {recentPerformance && (
              <div className="bg-white border-2 border-[#445f8b] p-5">
                <div className="flex items-center gap-2 mb-4">
                  <TrendUp size={24} weight="bold" className="text-[#445f8b]" />
                  <h3 className="text-xl font-bold">Recent Performance</h3>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-sm text-[#666]">Last {recentPerformance.recentMatches} matches</div>
                    <div className="text-3xl font-bold text-[#445f8b]">
                      {formatStat(recentPerformance.recentAccuracy)}%
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-[#666]">Career average</div>
                    <div className="text-3xl font-bold text-[#666]">
                      {formatStat(recentPerformance.overallAccuracy)}%
                    </div>
                  </div>
                </div>

                <div className={`flex items-center gap-2 p-3 rounded-lg ${
                  recentPerformance.trend === 'improving'
                    ? 'bg-green-50 text-green-700'
                    : recentPerformance.trend === 'declining'
                      ? 'bg-red-50 text-red-700'
                      : 'bg-gray-50 text-gray-700'
                }`}>
                  {recentPerformance.trend === 'improving' && <ArrowUp size={20} weight="bold" />}
                  {recentPerformance.trend === 'declining' && <ArrowDown size={20} weight="bold" />}
                  {recentPerformance.trend === 'stable' && <Minus size={20} weight="bold" />}
                  <span className="font-semibold">
                    {recentPerformance.trend === 'improving' && `Improving! +${formatStat(recentPerformance.diff)}% above average`}
                    {recentPerformance.trend === 'declining' && `Declining: ${formatStat(recentPerformance.diff)}% below average`}
                    {recentPerformance.trend === 'stable' && 'Performing consistently with career average'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Tournament Breakdown */}
          {tournamentStats.length > 1 && (
            <div className="bg-white border-2 border-[#445f8b] p-4 sm:p-6 mb-8">
              <div className="flex items-center gap-2 mb-5">
                <ChartBar size={28} weight="bold" className="text-[#445f8b]" />
                <h2 className="text-2xl font-bold">Performance by Tournament</h2>
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
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                      <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={100}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip
                        formatter={(value) => [`${formatStat(value)}%`, 'Accuracy']}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '2px solid #445f8b',
                          fontFamily: 'League Spartan'
                        }}
                      />
                      <Bar dataKey="accuracy" radius={[0, 4, 4, 0]}>
                        {tournamentStats.slice(0, 8).map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={index === 0 ? '#22c55e' : '#445f8b'}
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
                      <tr className="border-b-2 border-[#445f8b]">
                        <th className="text-left py-2 px-2">Tournament</th>
                        <th className="text-center py-2 px-2">Matches</th>
                        <th className="text-center py-2 px-2">Scored</th>
                        <th className="text-center py-2 px-2">Accuracy</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tournamentStats.map((t, i) => (
                        <tr key={t.name} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
                          <td className="py-2 px-2 font-medium">{t.name}</td>
                          <td className="text-center py-2 px-2">{t.matchCount}</td>
                          <td className="text-center py-2 px-2">{t.scored}/{t.total}</td>
                          <td className="text-center py-2 px-2 font-semibold text-[#445f8b]">
                            {formatStat(t.accuracy)}%
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
          <div className="bg-white border-2 border-[#445f8b] p-4 sm:p-6 mb-8">
            <h2 className="text-3xl mb-5 flex items-center gap-3">
              <Calendar weight="bold" size={32} />
              Match History
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xl font-semibold mb-3">Accuracy Over Time</h3>
                <div className="h-72 border-2 border-[#ddd] bg-white">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={matchStats.map((stat, i) => ({
                        ...stat,
                        index: i,
                        dateLabel: new Date(stat.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      }))}
                      margin={{ top: 20, right: 20, left: 10, bottom: 20 }}
                    >
                      <CartesianGrid stroke="#e5e7eb" strokeDasharray="0" />
                      <XAxis
                        dataKey="dateLabel"
                        stroke="#666"
                        style={{ fontSize: '11px', fontFamily: 'League Spartan' }}
                        interval="preserveStartEnd"
                        minTickGap={30}
                      />
                      <YAxis
                        domain={[0, 100]}
                        stroke="#666"
                        style={{ fontSize: '11px', fontFamily: 'League Spartan' }}
                        tickFormatter={(val) => `${val}%`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '2px solid #445f8b',
                          fontFamily: 'League Spartan'
                        }}
                        formatter={(value) => [`${formatStat(value)}%`, 'Accuracy']}
                        labelFormatter={(label, payload) => payload[0]?.payload.name}
                      />
                      <Line
                        type="monotone"
                        dataKey="accuracy"
                        stroke="#445f8b"
                        strokeWidth={2}
                        dot={{ fill: '#445f8b', r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3">Cycle Time Over Time</h3>
                <div className="h-72 border-2 border-[#ddd] bg-white">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={matchStats.filter(s => s.avgCycleTime > 0).map((stat, i) => ({
                        ...stat,
                        index: i,
                        dateLabel: new Date(stat.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      }))}
                      margin={{ top: 20, right: 20, left: 10, bottom: 20 }}
                    >
                      <CartesianGrid stroke="#e5e7eb" strokeDasharray="0" />
                      <XAxis
                        dataKey="dateLabel"
                        stroke="#666"
                        style={{ fontSize: '11px', fontFamily: 'League Spartan' }}
                        interval="preserveStartEnd"
                        minTickGap={30}
                      />
                      <YAxis
                        stroke="#666"
                        style={{ fontSize: '11px', fontFamily: 'League Spartan' }}
                        tickFormatter={(val) => `${formatStat(val, 1)}s`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '2px solid #445f8b',
                          fontFamily: 'League Spartan'
                        }}
                        formatter={(value) => [`${formatStat(value, 1)}s`, 'Avg Cycle Time']}
                        labelFormatter={(label, payload) => payload[0]?.payload.name}
                      />
                      <Line
                        type="monotone"
                        dataKey="avgCycleTime"
                        stroke="#445f8b"
                        strokeWidth={2}
                        dot={{ fill: '#445f8b', r: 3 }}
                        activeDot={{ r: 5 }}
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
