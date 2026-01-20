import { useMemo, useRef, useEffect, useState, useCallback } from "react";
import { Basketball, DoorOpen, Timer } from "@phosphor-icons/react";
import { formatTime } from "../utils/format";

import { matchRecorderConstants } from "../hooks/useMatchRecorder";

const SECONDS_PER_VIEWPORT = 45; // ~45s of match fits one visible timeline width (~50% more condensed)
const MIN_TIMELINE_WIDTH = 600;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const sumScoredInRange = (events, startMs, endMs) =>
  (events || [])
    .filter(
      (e) =>
        e?.type === "cycle" &&
        Number(e.timestamp) >= startMs &&
        Number(e.timestamp) < endMs
    )
    .reduce((sum, e) => sum + (Number(e.scored) || 0), 0);

function Timeline({ events = [], currentTime = 0, mode = null }) {
  const scrollRef = useRef(null);
  const pendingScrollToMsRef = useRef(null);
  const safeEvents = useMemo(() => events || [], [events]);
  const safeCurrent = Number(currentTime) || 0;

  const [isExpanded, setIsExpanded] = useState(mode !== "match");
  const [viewportWidth, setViewportWidth] = useState(0);

  useEffect(() => {
    setIsExpanded(mode !== "match");
  }, [mode]);

  const expandAndScrollTo = useCallback((targetMs) => {
    pendingScrollToMsRef.current = Number(targetMs);
    setIsExpanded(true);
  }, []);

  // Track the visible (scroll container) width so we can scale time to ~45s/viewport
  useEffect(() => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;

    const update = () => setViewportWidth(el.clientWidth || 0);
    update();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", update);
      return () => window.removeEventListener("resize", update);
    }

    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isExpanded]);

  // Calculate timeline duration (timestamps are in ms)
  const observedMaxTimeMs = Math.max(
    safeCurrent,
    ...safeEvents.map((e) => Number(e.timestamp) || 0),
    1
  );

  const matchTotalMs = matchRecorderConstants.MATCH_TOTAL_DURATION * 1000;
  const maxTimeMs = mode === "match" ? Math.max(observedMaxTimeMs, matchTotalMs) : observedMaxTimeMs;

  const maxTimeSeconds = maxTimeMs / 1000;
  const pixelsPerSecond =
    viewportWidth && viewportWidth > 0
      ? viewportWidth / SECONDS_PER_VIEWPORT
      : MIN_TIMELINE_WIDTH / SECONDS_PER_VIEWPORT;

  const timelineWidth = Math.max(
    MIN_TIMELINE_WIDTH,
    viewportWidth || 0,
    maxTimeSeconds * pixelsPerSecond
  );

  // Auto-scroll to keep playhead visible (match mode only to avoid flicker on loaded sessions)
  useEffect(() => {
    if (!scrollRef.current) return;
    if (mode !== "match") return;
    if (safeCurrent <= 0) return;

    const playheadPosition = (safeCurrent / maxTimeMs) * timelineWidth;
    const containerWidth = scrollRef.current.clientWidth;
    const scrollLeft = scrollRef.current.scrollLeft;

    // If playhead is near the right edge, scroll to follow
    if (playheadPosition > scrollLeft + containerWidth - 100) {
      scrollRef.current.scrollTo({
        left: playheadPosition - containerWidth + 150,
        behavior: "smooth",
      });
    }
  }, [safeCurrent, maxTimeMs, timelineWidth, mode]);

  // If the user expands from the phase overview, scroll to that phase start.
  useEffect(() => {
    if (!isExpanded) return;
    if (!scrollRef.current) return;

    const targetMs = pendingScrollToMsRef.current;
    if (!Number.isFinite(targetMs)) return;

    pendingScrollToMsRef.current = null;

    const clampedTarget = clamp(targetMs, 0, maxTimeMs);
    const targetX = (clampedTarget / maxTimeMs) * timelineWidth;
    scrollRef.current.scrollTo({
      left: Math.max(0, targetX - 20),
      behavior: "smooth",
    });
  }, [isExpanded, maxTimeMs, timelineWidth]);

  // Generate time markers
  const timeMarkers = useMemo(() => {
    const markers = [];
    const intervalSeconds =
      maxTimeSeconds > 180 ? 30 : maxTimeSeconds > 90 ? 15 : 10;
    for (let t = 0; t <= maxTimeMs; t += intervalSeconds * 1000) {
      markers.push(t);
    }
    // Always include the end
    if (markers[markers.length - 1] < maxTimeMs) {
      markers.push(maxTimeMs);
    }
    return markers;
  }, [maxTimeMs, maxTimeSeconds]);

  // Phase regions for match mode
  const phaseRegions = useMemo(() => {
    if (mode !== "match") return [];
    const autoEnd = matchRecorderConstants.AUTO_DURATION * 1000;
    const bufferEnd =
      (matchRecorderConstants.AUTO_DURATION + matchRecorderConstants.BUFFER_DURATION) *
      1000;
    const teleopEnd = matchRecorderConstants.MATCH_TOTAL_DURATION * 1000;

    return [
      { start: 0, end: autoEnd, label: "AUTO", color: "bg-[#6b8cae]/20" },
      { start: autoEnd, end: bufferEnd, label: "BUFFER", color: "bg-[#8899aa]/20" },
      { start: bufferEnd, end: teleopEnd, label: "TELEOP", color: "bg-[#445f8b]/10" },
    ];
  }, [mode]);

  const phaseScoreSummary = useMemo(() => {
    if (mode !== "match") return null;

    const autoStart = 0;
    const autoEnd = matchRecorderConstants.AUTO_DURATION * 1000;
    const bufferStart = autoEnd;
    const bufferEnd =
      (matchRecorderConstants.AUTO_DURATION + matchRecorderConstants.BUFFER_DURATION) *
      1000;
    const teleopStart = bufferEnd;
    const teleopEnd = matchRecorderConstants.MATCH_TOTAL_DURATION * 1000;

    const autoScored = sumScoredInRange(safeEvents, autoStart, autoEnd);
    const bufferScored = sumScoredInRange(safeEvents, bufferStart, bufferEnd);
    const teleopScored = sumScoredInRange(safeEvents, teleopStart, teleopEnd);

    return {
      auto: { start: autoStart, end: autoEnd, scored: autoScored },
      buffer: { start: bufferStart, end: bufferEnd, scored: bufferScored },
      teleop: { start: teleopStart, end: teleopEnd, scored: teleopScored },
      total: autoScored + bufferScored + teleopScored,
    };
  }, [mode, safeEvents]);

  const getEventColor = (event) => {
    if (event.type === "gate") return "gate";
    if (event.total > 0 && event.scored / event.total >= 0.5) return "success";
    return "miss";
  };

  return (
    <div className="timeline-container w-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#445f8b]/20 bg-[#f8fafc]">
        <div className="flex items-center gap-2">
          <Timer size={20} weight="duotone" className="text-[#445f8b]" />
          <h3 className="text-lg font-semibold text-[#445f8b]">Match Timeline</h3>
        </div>
        <div className="flex items-center gap-4 text-xs text-[#666]">
          {mode === "match" && phaseScoreSummary && (
            <span className="font-mono text-[#445f8b]">
              {phaseScoreSummary.total} scored
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#2D6C3E]" />
            Scored
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#94a3b8]" />
            Missed
          </span>
          <span className="flex items-center gap-1.5">
            <DoorOpen size={14} className="text-[#445f8b]" />
            Gate
          </span>

          {mode === "match" && (
            <button
              type="button"
              onClick={() => setIsExpanded((v) => !v)}
              className="ml-2 px-2 py-1 rounded border border-[#445f8b]/30 hover:bg-white transition-colors text-[#445f8b]"
              title={isExpanded ? "Show phase overview" : "Show full timeline"}
            >
              {isExpanded ? "Overview" : "Expand"}
            </button>
          )}
        </div>
      </div>

      {/* Match-mode collapsed overview */}
      {mode === "match" && !isExpanded && phaseScoreSummary && (
        <div className="px-4 py-4 bg-white">
          <div className="flex items-stretch gap-2">
            <button
              type="button"
              onClick={() => expandAndScrollTo(phaseScoreSummary.auto.start)}
              className="flex-1 rounded-lg border border-[#6b8cae]/30 bg-[#6b8cae]/10 hover:bg-[#6b8cae]/15 transition-colors px-3 py-3 text-left"
              title="Click to expand timeline"
            >
              <div className="text-xs font-bold tracking-wider text-[#445f8b]">
                AUTO
              </div>
              <div className="mt-1 font-mono text-sm text-[#2d3e5c]">
                {phaseScoreSummary.auto.scored} scored
              </div>
              <div className="mt-0.5 text-[11px] text-[#667]">
                0–{matchRecorderConstants.AUTO_DURATION}s
              </div>
            </button>

            <button
              type="button"
              onClick={() => expandAndScrollTo(phaseScoreSummary.buffer.start)}
              className="flex-[0.35] rounded-lg border border-[#8899aa]/30 bg-[#8899aa]/10 hover:bg-[#8899aa]/15 transition-colors px-3 py-3 text-left"
              title="Click to expand timeline"
            >
              <div className="text-xs font-bold tracking-wider text-[#445f8b]">
                BUFFER
              </div>
              <div className="mt-1 font-mono text-sm text-[#2d3e5c]">
                {phaseScoreSummary.buffer.scored} scored
              </div>
              <div className="mt-0.5 text-[11px] text-[#667]">
                {matchRecorderConstants.AUTO_DURATION}–
                {matchRecorderConstants.AUTO_DURATION +
                  matchRecorderConstants.BUFFER_DURATION}
                s
              </div>
            </button>

            <button
              type="button"
              onClick={() => expandAndScrollTo(phaseScoreSummary.teleop.start)}
              className="flex-[1.6] rounded-lg border border-[#445f8b]/25 bg-[#445f8b]/5 hover:bg-[#445f8b]/10 transition-colors px-3 py-3 text-left"
              title="Click to expand timeline"
            >
              <div className="text-xs font-bold tracking-wider text-[#445f8b]">
                TELEOP
              </div>
              <div className="mt-1 font-mono text-sm text-[#2d3e5c]">
                {phaseScoreSummary.teleop.scored} scored
              </div>
              <div className="mt-0.5 text-[11px] text-[#667]">
                {matchRecorderConstants.AUTO_DURATION +
                  matchRecorderConstants.BUFFER_DURATION}
                –{matchRecorderConstants.MATCH_TOTAL_DURATION}s
              </div>
            </button>
          </div>

          <div className="mt-3 text-xs text-[#666]">
            Click any section to expand into the full timeline.
          </div>
        </div>
      )}

      {/* Scrollable Timeline */}
      {isExpanded && (
        <div ref={scrollRef} className="timeline-scroll">
        <div
          className="relative h-32 sm:h-40"
          style={{ width: `${timelineWidth}px`, minWidth: '100%' }}
        >
          {/* Phase background regions */}
          {phaseRegions.map((region, i) => (
            (() => {
              const endMs = clamp(region.end, 0, maxTimeMs);
              const startMs = clamp(region.start, 0, maxTimeMs);
              const widthMs = Math.max(0, endMs - startMs);

              return (
            <div
              key={i}
              className={`absolute top-0 bottom-8 ${region.color} border-r border-[#445f8b]/10`}
              style={{
                left: `${(startMs / maxTimeMs) * 100}%`,
                width: `${(widthMs / maxTimeMs) * 100}%`,
              }}
            >
              <span className="absolute top-2 left-2 text-[10px] font-bold text-[#445f8b]/50 tracking-wider">
                {region.label}
              </span>
            </div>
              );
            })()
          ))}

          {/* Grid lines */}
          {timeMarkers.map((time) => (
            <div
              key={time}
              className="absolute top-0 bottom-0 w-px bg-[#e5e7eb]"
              style={{ left: `${(time / maxTimeMs) * 100}%` }}
            />
          ))}

          {/* Events */}
          <div className="absolute inset-0 bottom-8">
            {safeEvents.map((event, index) => {
              const timestamp = Number(event.timestamp) || 0;
              const position = (timestamp / maxTimeMs) * 100;
              const markerDelayMs = Math.min(index * 15, 180);

              if (event.type === "cycle") {
                const colorClass = getEventColor(event);
                const balls = [];
                for (let i = 0; i < event.total; i++) {
                  const isScored = i < event.scored;
                  balls.push(
                    <Basketball
                      key={i}
                      size={20}
                      weight="fill"
                      className={`timeline-ball-enter ${
                        isScored ? "text-[#2D6C3E]" : "text-[#94a3b8]"
                      }`}
                      style={{ animationDelay: `${markerDelayMs + i * 70}ms` }}
                    />
                  );
                }

                return (
                  <div
                    key={`${timestamp}-${index}`}
                    className="timeline-marker timeline-marker-cycle timeline-marker-enter absolute bottom-0 -translate-x-1/2 flex flex-col items-center cursor-pointer group"
                    style={{ left: `${position}%`, animationDelay: `${markerDelayMs}ms` }}
                    title={`${event.scored}/${event.total} scored at ${formatTime(timestamp)}`}
                  >
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-[#2d3e5c] text-white text-[10px] px-2 py-1 rounded whitespace-nowrap pointer-events-none">
                      {event.scored}/{event.total} @ {formatTime(timestamp)}
                    </div>
                    {/* Balls stack */}
                    <div className="flex flex-col-reverse items-center gap-0.5">
                      {balls}
                    </div>
                    {/* Stem */}
                    <div
                      className={`w-0.5 h-2 ${
                        colorClass === "success" ? "bg-[#2D6C3E]" : "bg-[#94a3b8]"
                      }`}
                    />
                  </div>
                );
              }

              if (event.type === "gate") {
                return (
                  <div
                    key={`${timestamp}-gate-${index}`}
                    className="timeline-marker timeline-marker-gate timeline-marker-enter absolute top-0 h-full -translate-x-1/2 cursor-pointer group"
                    style={{ left: `${position}%`, animationDelay: `${markerDelayMs}ms` }}
                    title={`Gate opened at ${formatTime(timestamp)}`}
                  >
                    {/* Tooltip */}
                    <div className="absolute top-full mt-1 opacity-0 group-hover:opacity-100 transition-opacity bg-[#2d3e5c] text-white text-[10px] px-2 py-1 rounded whitespace-nowrap pointer-events-none z-20">
                      Gate @ {formatTime(timestamp)}
                    </div>
                    {/* Gate marker */}
                    <div className="w-6 h-full bg-[#445f8b]/10 border-x border-[#445f8b]/30 flex items-start justify-center pt-2">
                      <DoorOpen size={16} weight="duotone" className="text-[#445f8b]" />
                    </div>
                  </div>
                );
              }
              return null;
            })}
          </div>

          {/* Playhead */}
          <div
            className="playhead absolute top-0 bottom-8 w-0.5 bg-[#2196f3] z-10 transition-all duration-100"
            style={{ left: `${(safeCurrent / maxTimeMs) * 100}%` }}
          >
            {/* Playhead triangle */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-8 border-l-transparent border-r-transparent border-t-[#2196f3]" />
            {/* Current time badge */}
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#2196f3] text-white text-[10px] font-mono px-1.5 py-0.5 rounded">
              {formatTime(safeCurrent)}
            </div>
          </div>

          {/* Time axis */}
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-[#f8fafc] border-t border-[#e5e7eb] flex items-center">
            {timeMarkers.map((time) => (
              <div
                key={time}
                className="absolute text-[10px] text-[#666] font-mono -translate-x-1/2"
                style={{ left: `${(time / maxTimeMs) * 100}%` }}
              >
                {formatTime(time)}
              </div>
            ))}
          </div>
        </div>
        </div>
      )}

      {/* Footer stats */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-[#445f8b]/20 bg-[#f8fafc] text-xs text-[#666]">
        <span>
          {safeEvents.filter(e => e.type === 'cycle').length} cycles recorded
        </span>
        <span>
          {isExpanded ? "Scroll to view full timeline" : "Phase overview"}
        </span>
      </div>
    </div>
  );
}

export default Timeline;
