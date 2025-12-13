import { formatTime } from "./format";

export const HMAD_VERSION_V1 = "hmadv1"; // legacy: startTime is unix seconds
export const HMAD_VERSION_V2 = "hmadv2"; // startTime is unix milliseconds
export const HMAD_VERSION_LATEST = HMAD_VERSION_V2;

const parseTimeToMs = (timeStr) => {
  const s = (timeStr || "").toString().trim();
  const m = s.match(/^(\d+):(\d+(?:\.\d{1,3})?)$/);
  if (!m) return null;
  const minutes = parseInt(m[1], 10);
  const seconds = Number.parseFloat(m[2]);
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) return null;
  return Math.round((minutes * 60 + seconds) * 1000);
};

export const formatMatchText = ({
  events,
  notes,
  teamNumber,
  matchStartTime,
  timerDuration,
  elapsedTime,
}) => {
  if (!events || events.length === 0) return "No events recorded";

  let prefix = HMAD_VERSION_LATEST;
  if (teamNumber) {
    prefix += `/${teamNumber}`;
  } else {
    prefix += `/0`;
  }
  console.log(teamNumber);

  let notesEncoded = "";
  if (notes && notes.trim()) {
    notesEncoded = `/${btoa(notes.trim())}`;
  } else {
    notesEncoded = `/${btoa(" ")}`;
  }

  prefix += notesEncoded;

  const startTimeMs = matchStartTime ? Math.round(matchStartTime) : 0;
  const durationSeconds =
    timerDuration || (elapsedTime ? Math.floor(elapsedTime / 1000) : 0);

  prefix += `/${startTimeMs}/${durationSeconds}`;
  prefix += ";; ";

  let output = prefix + formatTime(0) + ";";
  events.forEach((event) => {
    if (event.type === "cycle") {
      output += ` ${event.scored}/${event.total} at ${formatTime(
        event.timestamp
      )};`;
    } else if (event.type === "gate") {
      output += ` gate at ${formatTime(event.timestamp)};`;
    }
  });
  return output;
};

export const formatPhaseMatchText = ({
  events,
  notes,
  teamNumber,
  matchStartTime,
  timerDuration,
  elapsedTime,
  mode,
  phaseFilter,
  autoDuration,
  bufferDuration,
  teleopDuration,
}) => {
  if (!events || events.length === 0) return "No events recorded";

  const phaseEvents = events.filter((event) => {
    if (!event.phase && mode !== "match") return true;
    if (!event.phase && mode === "match") return false;
    return event.phase === phaseFilter;
  });

  if (phaseEvents.length === 0) return "No events recorded";

  let prefix = HMAD_VERSION_LATEST;
  if (teamNumber) {
    prefix += `/${teamNumber}`;
  } else {
    prefix += `/0`;
  }
  console.log(teamNumber);

  let notesEncoded = "";
  if (notes && notes.trim()) {
    notesEncoded = `/${btoa(notes.trim())}`;
  } else {
    notesEncoded = `/${btoa(" ")}`;
  }

  prefix += notesEncoded;

  const startTimeMs = matchStartTime ? Math.round(matchStartTime) : 0;

  let phaseDurationSeconds = 0;
  if (mode === "match") {
    if (phaseFilter === "auto") {
      phaseDurationSeconds = autoDuration + bufferDuration;
    } else if (phaseFilter === "teleop") {
      phaseDurationSeconds = teleopDuration;
    }
  } else {
    phaseDurationSeconds =
      timerDuration || (elapsedTime ? Math.floor(elapsedTime / 1000) : 0);
  }

  prefix += `/${startTimeMs}/${phaseDurationSeconds}`;
  prefix += ";; ";

  let output = prefix + formatTime(0) + ";";
  phaseEvents.forEach((event) => {
    if (event.type === "cycle") {
      output += ` ${event.scored}/${event.total} at ${formatTime(
        event.timestamp
      )};`;
    } else if (event.type === "gate") {
      output += ` gate at ${formatTime(event.timestamp)};`;
    }
  });
  return output;
};

export const parseMatchText = (text) => {
  let events = [];
  let extractedNotes = "";
  let parsedStartTime = null;
  let parsedDuration = null;
  let teamNumber = "";

  const [rawPrefix, rest] = text.split(";;");
  if (!rawPrefix || !rest) {
    return {
      events: [],
      notes: "",
      startTime: null,
      duration: null,
      teamNumber: "",
    };
  }

  const tprefix = rawPrefix.trim();
  let body = rest.trim();

  const parts = tprefix.split("/");
  const version = parts[0] || "";
  teamNumber = parts[1] || "";

  if (version === HMAD_VERSION_V2 || version === HMAD_VERSION_V1) {
    if (parts.length >= 3) {
      try {
        extractedNotes = atob(parts[2]);
      } catch (e) {
        console.warn("Failed to decode notes from text format", e);
      }
    }

    if (parts.length >= 4) {
      if (version === HMAD_VERSION_V2) {
        parsedStartTime = parseInt(parts[3], 10);
      } else {
        // hmadv1 stored unix seconds
        parsedStartTime = parseInt(parts[3], 10) * 1000;
      }
    }

    if (parts.length >= 5) {
      parsedDuration = parseInt(parts[4], 10);
    }
  } else {
    // Legacy plain-text format (no structured prefix)
    events.push({
      type: "info",
      version: "text_v1",
      teamNumber,
      timestamp: 0,
    });
  }

  const segments = body
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s);

  for (const part of segments) {
    const bareTime = parseTimeToMs(part);
    if (bareTime !== null && bareTime === 0) continue;

    const gateMatch = part.match(/\bgate\s+at\s+(\d+:\d+(?:\.\d{1,3})?)/i);
    if (gateMatch) {
      const ts = parseTimeToMs(gateMatch[1]);
      if (ts !== null) {
        events.push({
          type: "gate",
          timestamp: ts,
        });
      }
      continue;
    }

    const cycleMatch = part.match(
      /(\d+)\/(\d+)\s+at\s+(\d+:\d+(?:\.\d{1,3})?)/i
    );
    if (cycleMatch) {
      const scored = parseInt(cycleMatch[1], 10);
      const total = parseInt(cycleMatch[2], 10);
      const ts = parseTimeToMs(cycleMatch[3]);
      if (ts !== null) {
        events.push({
          type: "cycle",
          timestamp: ts,
          total,
          scored,
        });
      }
    }
  }

  return {
    events,
    notes: extractedNotes,
    startTime: parsedStartTime,
    duration: parsedDuration,
    teamNumber,
  };
};
