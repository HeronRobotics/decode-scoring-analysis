import { useMemo } from "react";
import { TrendUp, TrendDown, Trophy } from "@phosphor-icons/react";
import { calculateCycleTimes, calculateStats } from "../../utils/stats";
import { calculateTotalPoints } from "../../utils/scoring";

function computeMatchStats(match) {
  const events = match.events || [];
  const cycles = events.filter((e) => e.type === "cycle");
  const scored = cycles.reduce((sum, e) => sum + (e.scored || 0), 0);
  const total = cycles.reduce((sum, e) => sum + (e.total || 0), 0);
  const accuracy = total > 0 ? (scored / total) * 100 : 0;
  const cycleTimes = calculateCycleTimes(events);
  const timeStats = calculateStats(cycleTimes);
  const points = calculateTotalPoints(match);

  return {
    accuracy,
    avgCycleTime: timeStats.avg,
    scored,
    totalPoints: points.total,
    cycleCount: cycles.length,
  };
}

function StatCard({ label, current, historical, best, unit, lowerIsBetter }) {
  if (historical === null || historical === undefined) return null;

  const delta = current - historical;
  const improved = lowerIsBetter ? delta < 0 : delta > 0;
  const isNewBest = lowerIsBetter
    ? best !== null && current <= best
    : best !== null && current >= best;
  const absDelta = Math.abs(delta);
  const showDelta = absDelta >= 0.1;

  return (
    <div className="bg-brand-surface border border-brand-border rounded-lg p-3 text-center">
      <div className="text-2xl font-bold text-brand-main-text font-mono">
        {typeof current === "number" && !Number.isNaN(current)
          ? current % 1 === 0
            ? current
            : current.toFixed(1)
          : "\u2014"}
        {unit && <span className="text-sm font-normal text-brand-text ml-0.5">{unit}</span>}
      </div>
      <div className="text-xs text-brand-text mt-1">{label}</div>
      {showDelta && (
        <div
          className={`flex items-center justify-center gap-1 mt-1.5 text-xs font-medium ${
            improved ? "text-green-500" : "text-red-400"
          }`}
        >
          {improved ? <TrendUp size={14} weight="bold" /> : <TrendDown size={14} weight="bold" />}
          {absDelta % 1 === 0 ? absDelta : absDelta.toFixed(1)}
          {unit} vs avg
        </div>
      )}
      {isNewBest && (
        <div className="flex items-center justify-center gap-1 mt-1 text-xs font-medium text-amber-500">
          <Trophy size={14} weight="fill" />
          Personal best
        </div>
      )}
    </div>
  );
}

function PostMatchComparison({ currentMatch, previousMatches }) {
  const comparison = useMemo(() => {
    if (!previousMatches || previousMatches.length === 0) return null;

    const current = computeMatchStats(currentMatch);
    const prevStats = previousMatches.map(computeMatchStats);

    const avgAccuracy =
      prevStats.reduce((sum, s) => sum + s.accuracy, 0) / prevStats.length;
    const avgCycleTime =
      prevStats.filter((s) => s.avgCycleTime > 0).length > 0
        ? prevStats
            .filter((s) => s.avgCycleTime > 0)
            .reduce((sum, s) => sum + s.avgCycleTime, 0) /
          prevStats.filter((s) => s.avgCycleTime > 0).length
        : null;
    const avgScored =
      prevStats.reduce((sum, s) => sum + s.scored, 0) / prevStats.length;
    const avgPoints =
      prevStats.reduce((sum, s) => sum + s.totalPoints, 0) / prevStats.length;

    const bestAccuracy = Math.max(...prevStats.map((s) => s.accuracy));
    const bestCycleTime =
      prevStats.filter((s) => s.avgCycleTime > 0).length > 0
        ? Math.min(...prevStats.filter((s) => s.avgCycleTime > 0).map((s) => s.avgCycleTime))
        : null;
    const bestScored = Math.max(...prevStats.map((s) => s.scored));
    const bestPoints = Math.max(...prevStats.map((s) => s.totalPoints));

    return {
      current,
      avgAccuracy,
      avgCycleTime,
      avgScored,
      avgPoints,
      bestAccuracy,
      bestCycleTime,
      bestScored,
      bestPoints,
      matchCount: previousMatches.length,
    };
  }, [currentMatch, previousMatches]);

  if (!comparison) return null;

  return (
    <div className="border border-brand-border rounded-xl p-4 bg-brand-bg">
      <h3 className="text-sm font-semibold text-brand-text uppercase tracking-wide mb-3">
        vs. your last {comparison.matchCount} match
        {comparison.matchCount !== 1 ? "es" : ""}
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatCard
          label="Accuracy"
          current={comparison.current.accuracy}
          historical={comparison.avgAccuracy}
          best={comparison.bestAccuracy}
          unit="%"
          lowerIsBetter={false}
        />
        <StatCard
          label="Cycle Time"
          current={comparison.current.avgCycleTime}
          historical={comparison.avgCycleTime}
          best={comparison.bestCycleTime}
          unit="s"
          lowerIsBetter={true}
        />
        <StatCard
          label="Balls Scored"
          current={comparison.current.scored}
          historical={comparison.avgScored}
          best={comparison.bestScored}
          unit=""
          lowerIsBetter={false}
        />
        <StatCard
          label="Total Points"
          current={comparison.current.totalPoints}
          historical={comparison.avgPoints}
          best={comparison.bestPoints}
          unit=""
          lowerIsBetter={false}
        />
      </div>
    </div>
  );
}

export default PostMatchComparison;
