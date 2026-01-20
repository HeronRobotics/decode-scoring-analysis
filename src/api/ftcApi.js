/**
 * FTC Events API integration for fetching team information
 * API docs: https://ftc-events.firstinspires.org/api-docs/
 */

const FTC_API_BASE = 'https://ftc-api.firstinspires.org/v2.0';

// CORS proxy for browser requests (FTC API doesn't support CORS)
const CORS_PROXY = 'https://corsproxy.io/?';

// Get current season (FTC seasons start in September)
const getCurrentSeason = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  // If before September, use previous year as season start
  return month < 8 ? year - 1 : year;
};

// Create Basic Auth header
const getAuthHeader = () => {
  const username = import.meta.env.VITE_FTC_API_USERNAME;
  const token = import.meta.env.VITE_FTC_API_TOKEN;

  if (!username || !token) {
    console.warn('FTC API credentials not configured');
    return null;
  }

  const credentials = btoa(`${username}:${token}`);
  return `Basic ${credentials}`;
};

// In-memory cache for team data
const teamCache = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetch team information from FTC API
 * @param {string|number} teamNumber - The team number to look up
 * @returns {Promise<{teamNumber: number, nameShort: string, nameFull: string, city: string, state: string, country: string} | null>}
 */
export async function fetchTeamInfo(teamNumber) {
  if (!teamNumber) return null;

  const teamNum = String(teamNumber).trim();
  if (!teamNum) return null;

  // Check cache first
  const cached = teamCache.get(teamNum);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  const authHeader = getAuthHeader();
  if (!authHeader) {
    return null;
  }

  const season = getCurrentSeason();
  const apiUrl = `${FTC_API_BASE}/${season}/teams?teamNumber=${teamNum}`;

  try {
    const response = await fetch(
      `${CORS_PROXY}${encodeURIComponent(apiUrl)}`,
      {
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        console.error('FTC API authentication failed');
      }
      return null;
    }

    const data = await response.json();

    if (data.teams && data.teams.length > 0) {
      const team = data.teams[0];
      const teamInfo = {
        teamNumber: team.teamNumber,
        nameShort: team.nameShort || team.nameFull || `Team ${teamNum}`,
        nameFull: team.nameFull || team.nameShort || `Team ${teamNum}`,
        city: team.city || '',
        state: team.stateProv || '',
        country: team.country || '',
      };

      // Cache the result
      teamCache.set(teamNum, {
        data: teamInfo,
        timestamp: Date.now(),
      });

      return teamInfo;
    }

    return null;
  } catch (error) {
    console.error('Error fetching team info:', error);
    return null;
  }
}

/**
 * Fetch multiple teams at once (batched)
 * @param {(string|number)[]} teamNumbers - Array of team numbers
 * @returns {Promise<Map<string, {teamNumber: number, nameShort: string, nameFull: string}>>}
 */
export async function fetchTeamsBatch(teamNumbers) {
  const results = new Map();
  const uncachedTeams = [];

  // Check cache first
  for (const num of teamNumbers) {
    const teamNum = String(num).trim();
    if (!teamNum) continue;

    const cached = teamCache.get(teamNum);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      results.set(teamNum, cached.data);
    } else {
      uncachedTeams.push(teamNum);
    }
  }

  // Fetch uncached teams (FTC API doesn't support batch, so we fetch individually)
  // Limit concurrent requests
  const BATCH_SIZE = 5;
  for (let i = 0; i < uncachedTeams.length; i += BATCH_SIZE) {
    const batch = uncachedTeams.slice(i, i + BATCH_SIZE);
    const promises = batch.map(num => fetchTeamInfo(num));
    const batchResults = await Promise.all(promises);

    batch.forEach((num, index) => {
      if (batchResults[index]) {
        results.set(num, batchResults[index]);
      }
    });
  }

  return results;
}

/**
 * Get team name from cache or return team number as fallback
 * @param {string|number} teamNumber
 * @returns {string}
 */
export function getTeamNameFromCache(teamNumber) {
  const teamNum = String(teamNumber).trim();
  const cached = teamCache.get(teamNum);
  if (cached && cached.data) {
    return cached.data.nameShort;
  }
  return teamNum;
}

/**
 * Check if FTC API is configured
 * @returns {boolean}
 */
export function isFtcApiConfigured() {
  return Boolean(import.meta.env.VITE_FTC_API_USERNAME && import.meta.env.VITE_FTC_API_TOKEN);
}
