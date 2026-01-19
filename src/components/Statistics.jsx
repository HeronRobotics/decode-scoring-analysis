import {
  ChartLine,
  Target,
  Clock,
  ListNumbers,
  Crosshair,
} from "@phosphor-icons/react";
import { formatStat } from "../utils/format";
import { calculateCycleTimes, calculateStats } from "../utils/stats.js";

const TWO_MIN_WINDOW_MS = 120_000;

const normalizeCycleEvents = (matches, events = []) => {
  if (matches && matches.length > 0) {
    let offset = 0;
    const normalized = [];

    matches.forEach((match) => {
      const ordered = (match.events || [])
        .slice()
        .sort(
          (a, b) => (Number(a.timestamp) || 0) - (Number(b.timestamp) || 0)
        );

      ordered.forEach((event) => {
        if (event.type === "cycle") {
          normalized.push({
            ...event,
            timestamp: (Number(event.timestamp) || 0) + offset,
          });
        }
      });

      const lastTs = ordered.length
        ? Number(ordered[ordered.length - 1].timestamp) || 0
        : 0;
      offset += lastTs + 60_000;
    });

    return normalized;
  }

  return (events || [])
    .filter((event) => event.type === "cycle")
    .map((event) => ({
      ...event,
      timestamp: Number(event.timestamp) || 0,
    }));
};

const computeSecondsPerThreeBalls = (cycleTimes, attemptedBalls) => {
  if (!cycleTimes.length || !attemptedBalls) return null;
  const secondsElapsed = cycleTimes.reduce((sum, time) => sum + time, 0);
  if (secondsElapsed <= 0) return null;
  return (secondsElapsed * 3) / attemptedBalls;
};

const computeBallsPerTwoMinutes = (cycleEvents, valueKey = "total") => {
  if (!cycleEvents.length) return null;

  const window = [];
  let windowBalls = 0;
  let latest = null;

  cycleEvents.forEach((event) => {
    const timestamp = Number(event.timestamp) || 0;
    const value = Number(event[valueKey]) || 0;
    window.push({ timestamp, value });
    windowBalls += value;

    const cutoff = timestamp - TWO_MIN_WINDOW_MS;
    while (window.length && (Number(window[0].timestamp) || 0) < cutoff) {
      windowBalls -= window[0].value;
      window.shift();
    }

    const earliestTs = window.length
      ? Math.max(Number(window[0].timestamp) || 0, cutoff)
      : timestamp;
    const durationMs = Math.max(timestamp - earliestTs, 1_000);
    const perSecond = windowBalls / (durationMs / 1000);
    latest = perSecond * 120;
  });

  return latest;
};

function Statistics({ events, matches, teamNumber, notes }) {
  const allEvents =
    (matches ? matches.flatMap((m) => m.events || []) : events) || [];
  const cycleEvents = allEvents.filter((e) => e.type === "cycle");

  if (cycleEvents.length === 0) {
    return null;
  }

  const cycleTimes = calculateCycleTimes(allEvents, matches);
  const timeStats = calculateStats(cycleTimes);

  const totalBalls = cycleEvents.map((e) => e.total);
  const scoredBalls = cycleEvents.map((e) => e.scored);
  const totalBallsAttempted = totalBalls.reduce((a, b) => a + b, 0);
  const totalBallsScored = scoredBalls.reduce((a, b) => a + b, 0);
  const overallAccuracy =
    totalBallsAttempted > 0
      ? (totalBallsScored / totalBallsAttempted) * 100
      : 0;
  const accuracy = cycleEvents.map((e) =>
    e.total > 0 ? (e.scored / e.total) * 100 : 0
  );

  const ballStats = calculateStats(scoredBalls);
  const accuracyStats = calculateStats(accuracy);
  const timelineCycleEvents = normalizeCycleEvents(matches, allEvents);
  const secondsPerThreeBalls = computeSecondsPerThreeBalls(
    cycleTimes,
    totalBallsAttempted
  );
  const ballsScoredPerTwoMinutes = computeBallsPerTwoMinutes(
    timelineCycleEvents,
    "scored"
  );
  const ballsAttemptedPerTwoMinutes = computeBallsPerTwoMinutes(
    timelineCycleEvents,
    "total"
  );

  return (
    <div className="mb-8 w-full">
      <h3 className="text-2xl mb-5">
        Statistics{teamNumber ? ` for ${teamNumber}` : ""}
      </h3>

      {/* Notes Section */}
      {notes && notes.trim() && (
        <div className="bg-blue-50 border-2 border-blue-200 p-4 mb-5 rounded">
          <h4 className="text-lg font-semibold mb-2 text-blue-800">
            Match Notes
          </h4>
          <p className="text-blue-700 whitespace-pre-wrap">{notes.trim()}</p>
        </div>
      )}

      {/* Summary Section - Most Important */}
      <div className="bg-[#445f8b] border-2 border-[#445f8b] p-4 sm:p-8 mb-5">
        <div className="flex items-center gap-3 mb-6 -ml-4 -mt-4">
          <ChartLine size={32} className="text-white" />
          <h4 className="text-2xl text-white">Summary</h4>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl sm:text-4xl font-bold text-white">
              {cycleEvents.length}
            </div>
            <div className="text-white/70 text-sm mb-1 flex items-center justify-center gap-1">
              <ListNumbers size={16} />
              Total Cycles
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl sm:text-4xl font-bold text-white">
              {totalBallsScored}
            </div>
            <div className="text-white/70 text-sm mb-1 flex items-center justify-center gap-1">
              <Crosshair size={16} />
              Total Scored
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl sm:text-4xl font-bold text-white">
              {totalBallsAttempted}
            </div>
            <div className="text-white/70 text-sm mb-1 flex items-center justify-center gap-1">
              <Target size={16} />
              Total Balls
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl sm:text-4xl font-bold text-white">
              {formatStat(overallAccuracy)}%
            </div>
            <div className="text-white/70 text-sm mb-1 flex items-center justify-center gap-1">
              <Target size={16} weight="fill" />
              Overall Accuracy
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          <div className="bg-white/10 border border-white/20 rounded-lg p-4 text-center">
            <div className="text-white/70 text-xs tracking-wide uppercase mb-2">
              Seconds per 3 Balls
            </div>
            <div className="text-3xl sm:text-4xl font-bold text-white">
              {secondsPerThreeBalls != null
                ? `${formatStat(secondsPerThreeBalls, 1)}s`
                : "—"}
            </div>
          </div>
          <div className="bg-white/10 border border-white/20 rounded-lg p-4 text-center">
            <div className="text-white/70 text-xs tracking-wide uppercase mb-2">
              Balls Scored per 2 Minutes (scaled)
            </div>
            <div className="text-3xl sm:text-4xl font-bold text-white">
              {ballsScoredPerTwoMinutes != null
                ? formatStat(ballsScoredPerTwoMinutes, 1)
                : "—"}
            </div>
            {ballsAttemptedPerTwoMinutes != null && (
              <div className="text-white/70 text-xs mt-1">
                {formatStat(ballsAttemptedPerTwoMinutes, 1)} attempted
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Cycle Times */}
        <div className="bg-white border-2 border-[#445f8b] p-5">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-[#445f8b]">
            <Clock size={20} weight="bold" className="text-[#445f8b]" />
            <h4 className="text-lg font-bold">Cycle Times</h4>
          </div>

          <div className="mb-4 pb-3 border-b-2 border-[#f0f0f0]">
            <div className="text-xs text-[#666] mb-1">AVERAGE</div>
            <div className="text-3xl font-bold text-[#445f8b]">
              {formatStat(timeStats.avg)}s
              <span className="ml-2 inline-flex items-center justify-between text-sm font-semibold">
                ± {formatStat(timeStats.std)}s (std. dev)
              </span>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <div className="flex-1 text-center">
              <div className="text-xs text-[#666] mb-1">MIN</div>
              <div className="text-lg font-bold text-[#2d3e5c]">
                {formatStat(timeStats.min)}s
              </div>
            </div>
            <div className="w-px bg-[#ddd]"></div>
            <div className="flex-1 text-center">
              <div className="text-xs text-[#666] mb-1">MAX</div>
              <div className="text-lg font-bold text-[#2d3e5c]">
                {formatStat(timeStats.max)}s
              </div>
            </div>
          </div>
        </div>

        {/* Balls Scored */}
        <div className="bg-white border-2 border-[#445f8b] p-5">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-[#445f8b]">
            <Target size={20} weight="bold" className="text-[#445f8b]" />
            <h4 className="text-lg font-bold">Balls Scored per Cycle</h4>
          </div>

          <div className="mb-4 pb-3 border-b-2 border-[#f0f0f0]">
            <div className="text-xs text-[#666] mb-1">AVERAGE</div>
            <div className="text-3xl font-bold text-[#445f8b]">
              {formatStat(ballStats.avg)}
              <span className="ml-2 inline-flex items-center justify-between text-sm font-semibold">
                ± {formatStat(ballStats.std)} (std. dev)
              </span>
            </div>
          </div>

          <div className="flex gap-3 pt-2 ">
            <div className="flex-1 text-center">
              <div className="text-xs text-[#666] mb-1">MIN</div>
              <div className="text-lg font-bold text-[#2d3e5c]">
                {formatStat(ballStats.min, 0)}
              </div>
            </div>
            <div className="w-px bg-[#ddd]"></div>
            <div className="flex-1 text-center">
              <div className="text-xs text-[#666] mb-1">MAX</div>
              <div className="text-lg font-bold text-[#2d3e5c]">
                {formatStat(ballStats.max, 0)}
              </div>
            </div>
          </div>
        </div>

        {/* Accuracy */}
        <div className="bg-white border-2 border-[#445f8b] p-5">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-[#445f8b]">
            <Crosshair size={20} weight="bold" className="text-[#445f8b]" />
            <h4 className="text-lg font-bold">Accuracy per Cycle</h4>
          </div>

          <div className="mb-4 pb-3 border-b-2 border-[#f0f0f0]">
            <div className="text-xs text-[#666] mb-1">AVERAGE</div>
            <div className="text-3xl font-bold text-[#445f8b]">
              {formatStat(accuracyStats.avg)}%
              <span className="ml-2 inline-flex items-center justify-between text-sm font-semibold">
                ± {formatStat(accuracyStats.std)}% (std. dev)
              </span>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <div className="flex-1 text-center">
              <div className="text-xs text-[#666] mb-1">MIN</div>
              <div className="text-lg font-bold text-[#2d3e5c]">
                {formatStat(accuracyStats.min)}%
              </div>
            </div>
            <div className="w-px bg-[#ddd]"></div>
            <div className="flex-1 text-center">
              <div className="text-xs text-[#666] mb-1">MAX</div>
              <div className="text-lg font-bold text-[#2d3e5c]">
                {formatStat(accuracyStats.max)}%
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Statistics;
