const DRAFT_KEY = "heron_match_draft";
const LOCAL_MATCHES_KEY = "heron_local_matches";

// --- Draft operations (in-progress match auto-save) ---

export function saveDraft(state) {
  try {
    const payload = {
      events: state.events,
      teamNumber: state.teamNumber,
      notes: state.notes,
      mode: state.mode,
      phase: state.phase,
      timerDuration: state.timerDuration,
      elapsedTime: state.elapsedTime,
      motif: state.motif,
      autoPattern: state.autoPattern,
      teleopPattern: state.teleopPattern,
      autoLeave: state.autoLeave,
      teleopPark: state.teleopPark,
      savedAt: Date.now(),
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  } catch {
    // quota exceeded or other storage error — never crash
  }
}

export function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

// --- Completed local match operations ---

function readLocalMatches() {
  try {
    const raw = localStorage.getItem(LOCAL_MATCHES_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeLocalMatches(matches) {
  try {
    localStorage.setItem(LOCAL_MATCHES_KEY, JSON.stringify(matches));
  } catch {
    // quota exceeded — never crash
  }
}

export function saveLocalMatch(payload) {
  const matches = readLocalMatches();
  const localMatch = {
    ...payload,
    id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    synced: false,
  };
  matches.unshift(localMatch);
  writeLocalMatches(matches);
  return localMatch;
}

export function getLocalMatches() {
  return readLocalMatches();
}

export function removeLocalMatch(id) {
  const matches = readLocalMatches().filter((m) => m.id !== id);
  writeLocalMatches(matches);
}

export function markLocalMatchSynced(id) {
  const matches = readLocalMatches().map((m) =>
    m.id === id ? { ...m, synced: true } : m,
  );
  writeLocalMatches(matches);
}

export function getUnsyncedLocalMatches() {
  return readLocalMatches().filter((m) => !m.synced);
}
