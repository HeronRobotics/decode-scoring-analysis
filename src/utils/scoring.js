/**
 * Scoring utility functions for FTC DECODE season points calculation
 */

/**
 * Get the 9-character target pattern from a 3-character motif
 * @param {string|null} motif - The motif pattern (e.g., "PGP", "GPP", "PPG")
 * @returns {string} The repeated 9-character target pattern (e.g., "PGPPGPPGP")
 */
export const getTargetPattern = (motif) => {
  if (!motif || motif.length !== 3) return '';
  return motif.repeat(3);
};

/**
 * Count matching positions between a pattern and the target derived from motif
 * @param {string} pattern - The actual pattern entered (up to 9 chars of P/G)
 * @param {string|null} motif - The 3-character motif
 * @returns {number} Number of matching positions
 */
export const calculateMotifMatches = (pattern, motif) => {
  if (!pattern || !motif) return 0;

  const target = getTargetPattern(motif);
  if (!target) return 0;

  let matches = 0;
  const len = Math.min(pattern.length, target.length);

  for (let i = 0; i < len; i++) {
    if (pattern[i] === target[i]) {
      matches++;
    }
  }

  return matches;
};

/**
 * Calculate artifact points (balls scored × 3)
 * @param {Object} match - Match object with events array
 * @returns {number} Artifact points
 */
export const calculateArtifactPoints = (match) => {
  if (!match || !match.events) return 0;

  const totalScored = match.events
    .filter(e => e.type === 'cycle')
    .reduce((sum, e) => sum + (e.scored || 0), 0);

  return totalScored * 3;
};

/**
 * Calculate motif points from auto and teleop patterns
 * Each matching position = 2 points
 * @param {Object} match - Match object with autoPattern, teleopPattern, and motif
 * @returns {{ auto: number, teleop: number, total: number }} Motif points breakdown
 */
export const calculateMotifPoints = (match) => {
  if (!match || !match.motif) {
    return { auto: 0, teleop: 0, total: 0 };
  }

  const autoMatches = calculateMotifMatches(match.autoPattern || '', match.motif);
  const teleopMatches = calculateMotifMatches(match.teleopPattern || '', match.motif);

  const autoPoints = autoMatches * 2;
  const teleopPoints = teleopMatches * 2;

  return {
    auto: autoPoints,
    teleop: teleopPoints,
    total: autoPoints + teleopPoints,
  };
};

/**
 * Calculate leave points (3 points if robot left in autonomous)
 * @param {Object} match - Match object with autoLeave boolean
 * @returns {number} Leave points (0 or 3)
 */
export const calculateLeavePoints = (match) => {
  if (!match) return 0;
  return match.autoLeave ? 3 : 0;
};

/**
 * Calculate park points based on teleop parking status
 * @param {Object} match - Match object with teleopPark string
 * @returns {number} Park points (0, 5, or 10)
 */
export const calculateParkPoints = (match) => {
  if (!match || !match.teleopPark) return 0;

  switch (match.teleopPark) {
    case 'partial':
      return 5;
    case 'full':
      return 10;
    default:
      return 0;
  }
};

/**
 * Calculate total points for a match
 * @param {Object} match - Complete match object
 * @returns {{ artifact: number, motif: { auto: number, teleop: number, total: number }, leave: number, park: number, total: number }}
 */
export const calculateTotalPoints = (match) => {
  const artifact = calculateArtifactPoints(match);
  const motif = calculateMotifPoints(match);
  const leave = calculateLeavePoints(match);
  const park = calculateParkPoints(match);

  return {
    artifact,
    motif,
    leave,
    park,
    total: artifact + motif.total + leave + park,
  };
};

/**
 * Validate a pattern string (should only contain P and G)
 * @param {string} pattern - Pattern to validate
 * @returns {boolean} True if valid
 */
export const isValidPattern = (pattern) => {
  if (!pattern) return true;
  return /^[PG]*$/i.test(pattern);
};

/**
 * Normalize pattern to uppercase
 * @param {string} pattern - Pattern to normalize
 * @returns {string} Uppercase pattern with only P and G characters
 */
export const normalizePattern = (pattern) => {
  if (!pattern) return '';
  return pattern.toUpperCase().replace(/[^PG]/g, '');
};
