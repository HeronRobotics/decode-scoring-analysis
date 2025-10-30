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