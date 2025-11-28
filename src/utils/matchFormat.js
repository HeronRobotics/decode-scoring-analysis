export const HMAD_VERSION = "hmadv1";

export const formatMatchText = ({
  events,
  notes,
  teamNumber,
  matchStartTime,
  timerDuration,
  elapsedTime,
}) => {
  if (!events || events.length === 0) return "No events recorded";

  let prefix = HMAD_VERSION;
  if (teamNumber) {
    prefix += `/${teamNumber}`;
  }

  let notesEncoded = "";
  if (notes && notes.trim()) {
    notesEncoded = `/${btoa(notes.trim())}`;
  }

  prefix += notesEncoded;

  const unixStartTime = matchStartTime
    ? Math.floor(matchStartTime / 1000)
    : 0;
  const durationSeconds =
    timerDuration || (elapsedTime ? Math.floor(elapsedTime / 1000) : 0);

  prefix += `/${unixStartTime}/${durationSeconds}`;
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

  let prefix = HMAD_VERSION;
  if (teamNumber) {
    prefix += `/${teamNumber}`;
  }

  let notesEncoded = "";
  if (notes && notes.trim()) {
    notesEncoded = `/${btoa(notes.trim())}`;
  }

  prefix += notesEncoded;

  const unixStartTime = matchStartTime
    ? Math.floor(matchStartTime / 1000)
    : 0;

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

  prefix += `/${unixStartTime}/${phaseDurationSeconds}`;
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
    return { events: [], notes: "", startTime: null, duration: null, teamNumber: "" };
  }

  const tprefix = rawPrefix.trim();
  let body = rest.trim();

  if (!tprefix.startsWith(HMAD_VERSION)) {
    const parts = tprefix.split("/");
    teamNumber = parts[1] || "";
    events.push({
      type: "info",
      version: "text_v1",
      teamNumber,
      timestamp: 0,
    });
  } else {
    const parts = tprefix.split("/");
    teamNumber = parts[1] || "";
    if (parts.length >= 4) {
      parsedStartTime = parseInt(parts[3], 10) * 1000;
    }
    if (parts.length >= 3) {
      try {
        extractedNotes = atob(parts[2]);
      } catch (e) {
        console.warn("Failed to decode notes from text format", e);
      }
    }
    if (parts.length >= 5) {
      parsedDuration = parseInt(parts[4], 10);
    }
  }

  const segments = body
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s);

  for (const part of segments) {
    if (part === "0:00") continue;

    if (part.includes("gate at")) {
      const timeMatch = part.match(/(\d+):(\d+)/);
      if (timeMatch) {
        const minutes = parseInt(timeMatch[1], 10);
        const seconds = parseInt(timeMatch[2], 10);
        events.push({
          type: "gate",
          timestamp: (minutes * 60 + seconds) * 1000,
        });
      }
    } else {
      const cycleMatch = part.match(/(\d+)\/(\d+)\s+at\s+(\d+):(\d+)/);
      if (cycleMatch) {
        const scored = parseInt(cycleMatch[1], 10);
        const total = parseInt(cycleMatch[2], 10);
        const minutes = parseInt(cycleMatch[3], 10);
        const seconds = parseInt(cycleMatch[4], 10);
        events.push({
          type: "cycle",
          timestamp: (minutes * 60 + seconds) * 1000,
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

const formatTime = (ms) => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};
