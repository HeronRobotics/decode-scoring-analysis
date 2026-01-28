export const formatStat = (val, decimals = 2) => {
  return isNaN(val) ? "0.00" : val.toFixed(decimals);
};

export const quantile = (arr, q) => {
  if (arr.length === 0) return 0;
  const idx = (arr.length - 1) * q;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return arr[lo];
  const frac = idx - lo;
  return arr[lo] * (1 - frac) + arr[hi] * frac;
};

export const formatMatchTime = (match) => {
  if (match.startTime) {
    return new Date(match.startTime).getTime();
  }
  if (match.events && match.events.length > 0) {
    // If startTime is missing, fall back to the first event timestamp.
    // Note: depending on the data source, event timestamps may be either epoch-ms or match-elapsed-ms.
    return Number(match.events[0].timestamp) || 0;
  }
  return Date.now();
};

export const formatTime = (ms) => {
  const safeMs = Math.max(0, Math.round(Number(ms) || 0));
  const totalSeconds = Math.floor(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};
