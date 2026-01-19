import {
  ChartLine,
  Target,
  Clock,
  ListNumbers,
  Crosshair,
} from "@phosphor-icons/react";
import { formatStat, formatTime } from "../utils/format";
import { calculateCycleTimes, calculateStats } from "../utils/stats.js";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const ROLLING_WINDOW_BALLS = 10;
const BPM_WINDOW_MS = 60_000;
const TWO_MIN_WINDOW_MS = 120_000;

const formatRoundedTimeLabel = (value) => {
  const rounded = Math.round((Number(value) || 0) / 1000) * 1000;
  return formatTime(Math.max(0, rounded));
};

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
      offset += lastTs + 60_000; // add a gap between matches for clarity
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

const buildBallStream = (cycleEvents) => {
  const stream = [];

  cycleEvents.forEach((event) => {
    const ts = Number(event.timestamp) || 0;
    for (let i = 0; i < event.total; i += 1) {
      stream.push({
        timestamp: ts + i * 10, // slight offset so windows have width
        scored: i < event.scored,
      });
    }
  });

  return stream;
};

const buildRollingAccuracyPoints = (ballStream) => {
  const points = [];
  const window = [];
  let scoredCount = 0;

  ballStream.forEach((ball) => {
    window.push(ball);
    if (ball.scored) {
      scoredCount += 1;
    }

    if (window.length > ROLLING_WINDOW_BALLS) {
      const removed = window.shift();
      if (removed.scored) {
        scoredCount -= 1;
      }
    }

    if (window.length >= Math.min(ROLLING_WINDOW_BALLS, 3)) {
      points.push({
        timestamp: ball.timestamp,
        accuracy: Number(((scoredCount / window.length) * 100).toFixed(1)),
      });
    }
  });

  return points;
};

const buildBallsPerMinutePoints = (cycleEvents) => {
  const window = [];
  let windowBalls = 0;
  const points = [];

  cycleEvents.forEach((event) => {
    const timestamp = Number(event.timestamp) || 0;
    window.push(event);
    windowBalls += event.total;

    const cutoff = timestamp - BPM_WINDOW_MS;
    while (window.length && (Number(window[0].timestamp) || 0) < cutoff) {
      windowBalls -= window[0].total;
      window.shift();
    }

    const earliestTs = window.length
      ? Math.max(Number(window[0].timestamp) || 0, cutoff)
      : timestamp;
    const durationMs = Math.max(timestamp - earliestTs, 1_000); // prevent div/0
    const ratePerSecond = windowBalls / (durationMs / 1000);
    if (timestamp >= BPM_WINDOW_MS) {
      points.push({
        timestamp,
        bpm: Number((ratePerSecond * 60).toFixed(2)),
      });
    }
  });

  return points;
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
  const ballStream = buildBallStream(timelineCycleEvents);
  const rollingAccuracyData = buildRollingAccuracyPoints(ballStream);
  const ballsPerMinuteData = buildBallsPerMinutePoints(timelineCycleEvents);
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
  const averageBpm =
    ballsPerMinuteData.length > 0
      ? ballsPerMinuteData.reduce((sum, point) => sum + point.bpm, 0) /
        ballsPerMinuteData.length
      : null;

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
      <div className="bg-white mt-8 border-2 border-[#445f8b] p-4 sm:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Crosshair size={20} className="text-[#445f8b]" />
              <h4 className="text-lg font-semibold text-[#2d3e5c]">
                Rolling Accuracy (Last 10 Balls)
              </h4>
            </div>
            {rollingAccuracyData.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart
                  data={rollingAccuracyData}
                  margin={{ top: 10, left: 0, right: 10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="accuracyGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#445f8b"
                        stopOpacity={0.35}
                      />
                      <stop
                        offset="95%"
                        stopColor="#445f8b"
                        stopOpacity={0.05}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#f0f4ff" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={formatRoundedTimeLabel}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip
                    labelFormatter={(value) =>
                      `Time ${formatRoundedTimeLabel(value)}`
                    }
                    formatter={(value) => [
                      `${formatStat(value, 1)}%`,
                      "Accuracy",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="accuracy"
                    stroke="#445f8b"
                    fillOpacity={1}
                    fill="url(#accuracyGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-56 flex items-center justify-center text-[#666] text-sm">
                Record at least a few balls to see rolling accuracy.
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock size={20} className="text-[#445f8b]" />
              <h4 className="text-lg font-semibold text-[#2d3e5c]">
                Balls per Minute (Rolling 60s)
              </h4>
            </div>
            {ballsPerMinuteData.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart
                  data={ballsPerMinuteData}
                  margin={{ top: 10, left: 0, right: 10, bottom: 0 }}
                >
                  <CartesianGrid stroke="#f0f4ff" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={formatRoundedTimeLabel}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    tickFormatter={(value) => `${formatStat(value, 0)}`}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    labelFormatter={(value) =>
                      `Time ${formatRoundedTimeLabel(value)}`
                    }
                    formatter={(value) => [
                      `${formatStat(value, 1)} bpm`,
                      "Balls / min",
                    ]}
                  />
                  {averageBpm !== null && (
                    <ReferenceLine
                      y={averageBpm}
                      stroke="#eab308"
                      strokeDasharray="6 6"
                      label={{
                        value: `Avg ${formatStat(averageBpm, 1)}`,
                        fill: "#aa8504",
                        position: "right",
                      }}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="bpm"
                    stroke="#445f8b"
                    strokeWidth={2.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-56 flex items-center justify-center text-[#666] text-sm">
                Record for at least one minute to chart pace.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Statistics;
