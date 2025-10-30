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
    const date = new Date(match.startTime)
    date.setSeconds(0, 0)
    return date.getTime()
  }
  if (match.events && match.events.length > 0) {
    const date = new Date(match.events[0].timestamp)
    date.setSeconds(0, 0)
    return date.getTime()
  }
  return Date.now()
}

export const formatTime = (ms) => {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}