import {
  ChartLine,
  Target,
  Clock,
  ListNumbers,
  Crosshair,
  Star,
} from "@phosphor-icons/react";
import { formatStat } from "../utils/format";
import { calculateCycleTimes, calculateStats } from "../utils/stats.js";
import { calculateTotalPoints } from "../utils/scoring.js";
import TeamName from "./TeamName";

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

function Statistics({
  events,
  matches,
  teamNumber,
  notes,
  motif,
  autoPattern,
  teleopPattern,
  autoLeave,
  teleopPark,
}) {
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

  // Calculate points if scoring data is available
  const hasPointsData = motif || autoLeave || teleopPark !== "none";
  const pointsBreakdown = calculateTotalPoints({
    events: allEvents,
    motif,
    autoPattern,
    teleopPattern,
    autoLeave,
    teleopPark,
  });

  return (
    <div className="mb-8 w-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-brand-accentBg flex items-center justify-center">
          <ChartLine size={24} weight="bold" className="text-brand-accent" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-brand-main-text">
            {teamNumber ? (
              <>Statistics for <TeamName teamNumber={teamNumber} showNumber /></>
            ) : (
              "Match Statistics"
            )}
          </h3>
          <p className="text-sm text-brand-text">Performance breakdown and averages</p>
        </div>
      </div>

      {notes && notes.trim() && (
        <div className="section-card bg-brand-bg/50 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-brand-accentBg flex items-center justify-center">
              <ChartLine size={16} weight="bold" className="text-brand-accent" />
            </div>
            <h4 className="text-sm font-bold text-brand-accent">Match Notes</h4>
          </div>
          <p className="text-brand-text whitespace-pre-wrap leading-relaxed">{notes.trim()}</p>
        </div>
      )}

      <div className="bg-brand-invert-bg border-2 border-brand-invert-border p-6 sm:p-8 mb-5 rounded-2xl shadow-lg">
        <div className="flex items-center gap-3 mb-6 -ml-4 -mt-4">
          <ChartLine size={32} className="text-brand-invert-text" />
          <h4 className="text-2xl text-brand-invert-text!">Summary</h4>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 items-center">
          <div className="text-center col-span-2 md:col-span-1 bg-brand-invert-surface rounded-lg p-3 border border-brand-invert-border">
            <div className="text-3xl sm:text-4xl font-bold text-brand-invert-text">
              {pointsBreakdown.total}
            </div>
            <div className="text-brand-invert-text text-sm flex items-center justify-center gap-1">
              <Star size={16} weight="fill" />
              Total Pts
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl sm:text-4xl font-bold text-brand-invert-text">
              {totalBallsScored}
            </div>
            <div className="text-brand-invert-text text-sm flex items-center justify-center gap-1">
              <Crosshair size={16} />
              Scored
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl sm:text-4xl font-bold text-brand-invert-text">
              {totalBallsAttempted}
            </div>
            <div className="text-brand-invert-text text-sm flex items-center justify-center gap-1">
              <Target size={16} />
              Balls
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl sm:text-4xl font-bold text-brand-invert-text">
              {formatStat(overallAccuracy)}%
            </div>
            <div className="text-brand-invert-text text-sm flex items-center justify-center gap-1">
              <Target size={16} weight="fill" />
              Accuracy
            </div>
          </div>
        </div>

        {(hasPointsData || pointsBreakdown.artifact > 0) && (
          <div className="flex flex-wrap items-center justify-center gap-3 mt-4 pt-4 border-t border-brand-border text-xs text-brand-invert-text">
            <span className="flex items-center gap-1">
              <span className="font-semibold text-brand-invert-text">{pointsBreakdown.artifact}</span> artifact
            </span>
            <span className="text-brand-invert-text">+</span>
            <span className="flex items-center gap-1">
              <span className="font-semibold text-brand-invert-text">{pointsBreakdown.motif.total}</span> motif
            </span>
            <span className="text-brand-invert-text">+</span>
            <span className="flex items-center gap-1">
              <span className="font-semibold text-brand-invert-text">{pointsBreakdown.leave}</span> leave
            </span>
            <span className="text-brand-invert-text">+</span>
            <span className="flex items-center gap-1">
              <span className="font-semibold text-brand-invert-text">{pointsBreakdown.park}</span> park
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div className="bg-brand-invert-surface border border-brand-invert-border rounded-lg p-3 text-center">
            <div className="text-brand-invert-text text-xs tracking-wide uppercase mb-1">
              Seconds per 3 Balls
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-brand-invert-text">
              {secondsPerThreeBalls != null
                ? `${formatStat(secondsPerThreeBalls, 1)}s`
                : "—"}
            </div>
          </div>
          <div className="bg-brand-invert-surface border border-brand-invert-border rounded-lg p-3 text-center">
            <div className="text-brand-invert-text text-xs tracking-wide uppercase mb-1">
              Balls Scored per 2 Min
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-brand-invert-text">
              {ballsScoredPerTwoMinutes != null
                ? formatStat(ballsScoredPerTwoMinutes, 1)
                : "—"}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="section-card bg-gradient-to-br from-brand-surface to-brand-bg">
          <div className="flex items-center gap-3 mb-4 pb-4 border-b-2 border-brand-border">
            <div className="w-10 h-10 rounded-xl bg-brand-accentBg flex items-center justify-center">
              <Clock size={20} weight="bold" className="text-brand-accent" />
            </div>
            <h4 className="text-lg font-bold">Cycle Times</h4>
          </div>

          <div className="mb-4 pb-4 border-b border-brand-border">
            <div className="text-xs font-bold text-brand-accent mb-2 tracking-wider uppercase">Average</div>
            <div className="flex items-baseline gap-2">
              <div className="text-4xl font-bold text-brand-accent">
                {formatStat(timeStats.avg)}
              </div>
              <div className="text-lg text-brand-text">seconds</div>
            </div>
            <div className="text-xs text-brand-text mt-2">
              ± {formatStat(timeStats.std)}s std. dev
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-brand-bg/60 rounded-lg p-3 text-center border border-brand-border">
              <div className="text-xs font-bold text-brand-accent mb-1 uppercase">Min</div>
              <div className="text-2xl font-bold text-brand-main-text">
                {formatStat(timeStats.min)}s
              </div>
            </div>
            <div className="bg-brand-bg/60 rounded-lg p-3 text-center border border-brand-border">
              <div className="text-xs font-bold text-brand-accent mb-1 uppercase">Max</div>
              <div className="text-2xl font-bold text-brand-main-text">
                {formatStat(timeStats.max)}s
              </div>
            </div>
          </div>
        </div>

        <div className="section-card bg-gradient-to-br from-brand-surface to-brand-bg">
          <div className="flex items-center gap-3 mb-4 pb-4 border-b-2 border-brand-border">
            <div className="w-10 h-10 rounded-xl bg-brand-accentBg flex items-center justify-center">
              <Target size={20} weight="bold" className="text-brand-accent" />
            </div>
            <h4 className="text-lg font-bold">Balls Scored</h4>
          </div>

          <div className="mb-4 pb-4 border-b border-brand-border">
            <div className="text-xs font-bold text-brand-accent mb-2 tracking-wider uppercase">Average per Cycle</div>
            <div className="flex items-baseline gap-2">
              <div className="text-4xl font-bold text-brand-accent">
                {formatStat(ballStats.avg, 1)}
              </div>
              <div className="text-lg text-brand-text">balls</div>
            </div>
            <div className="text-xs text-brand-text mt-2">
              ± {formatStat(ballStats.std, 1)} std. dev
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-brand-bg/60 rounded-lg p-3 text-center border border-brand-border">
              <div className="text-xs font-bold text-brand-accent mb-1 uppercase">Min</div>
              <div className="text-2xl font-bold text-brand-main-text">
                {formatStat(ballStats.min, 0)}
              </div>
            </div>
            <div className="bg-brand-bg/60 rounded-lg p-3 text-center border border-brand-border">
              <div className="text-xs font-bold text-brand-accent mb-1 uppercase">Max</div>
              <div className="text-2xl font-bold text-brand-main-text">
                {formatStat(ballStats.max, 0)}
              </div>
            </div>
          </div>
        </div>

        <div className="section-card bg-gradient-to-br from-brand-surface to-brand-bg border-brand-accent">
          <div className="flex items-center gap-3 mb-4 pb-4 border-b-2 border-brand-border">
            <div className="w-10 h-10 rounded-xl bg-brand-accentBg flex items-center justify-center">
              <Crosshair size={20} weight="bold" className="text-brand-accent" />
            </div>
            <h4 className="text-lg font-bold">Accuracy</h4>
          </div>

          <div className="mb-4 pb-4 border-b border-brand-border">
            <div className="text-xs font-bold text-brand-accent mb-2 tracking-wider uppercase">Average</div>
            <div className="flex items-baseline gap-2">
              <div className="text-4xl font-bold text-brand-accent">
                {formatStat(accuracyStats.avg, 0)}
              </div>
              <div className="text-2xl text-brand-text">%</div>
            </div>
            <div className="text-xs text-brand-text mt-2">
              ± {formatStat(accuracyStats.std, 0)}% std. dev
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-brand-bg/60 rounded-lg p-3 text-center border border-brand-border">
              <div className="text-xs font-bold text-brand-accent mb-1 uppercase">Min</div>
              <div className="text-2xl font-bold text-brand-main-text">
                {formatStat(accuracyStats.min, 0)}%
              </div>
            </div>
            <div className="bg-brand-bg/60 rounded-lg p-3 text-center border border-brand-border">
              <div className="text-xs font-bold text-brand-accent mb-1 uppercase">Max</div>
              <div className="text-2xl font-bold text-brand-main-text">
                {formatStat(accuracyStats.max, 0)}%
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Statistics;
