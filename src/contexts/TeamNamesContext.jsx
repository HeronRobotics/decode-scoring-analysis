import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { fetchTeamsBatch, isFtcApiConfigured } from '../api/ftcApi';

const TeamNamesContext = createContext(null);

// Local storage key for persisting team names
const STORAGE_KEY = 'heron_team_names_cache';

export function TeamNamesProvider({ children }) {
  const [teamNames, setTeamNames] = useState(() => {
    // Load from localStorage on init
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return new Map(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Failed to load team names from localStorage', e);
    }
    return new Map();
  });
  const [loading, setLoading] = useState(false);
  const [apiConfigured] = useState(isFtcApiConfigured);

  // Persist to localStorage when teamNames changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...teamNames]));
    } catch (e) {
      console.warn('Failed to save team names to localStorage', e);
    }
  }, [teamNames]);

  /**
   * Get team name, returns number if not loaded yet
   */
  const getTeamName = useCallback((teamNumber) => {
    if (!teamNumber) return '';
    const num = String(teamNumber).trim();
    const cached = teamNames.get(num);
    if (cached) return cached.nameShort;
    return num;
  }, [teamNames]);

  /**
   * Get full team info
   */
  const getTeamInfo = useCallback((teamNumber) => {
    if (!teamNumber) return null;
    const num = String(teamNumber).trim();
    return teamNames.get(num) || null;
  }, [teamNames]);

  /**
   * Load team names for a list of team numbers
   */
  const loadTeamNames = useCallback(async (teamNumbers) => {
    if (!apiConfigured) return;

    const uniqueNumbers = [...new Set(
      teamNumbers
        .map(n => String(n).trim())
        .filter(n => n && !teamNames.has(n))
    )];

    if (uniqueNumbers.length === 0) return;

    setLoading(true);
    try {
      const results = await fetchTeamsBatch(uniqueNumbers);
      if (results.size > 0) {
        setTeamNames(prev => {
          const next = new Map(prev);
          results.forEach((info, num) => {
            next.set(num, info);
          });
          return next;
        });
      }
    } catch (error) {
      console.error('Failed to load team names:', error);
    } finally {
      setLoading(false);
    }
  }, [apiConfigured, teamNames]);

  const value = {
    teamNames,
    loading,
    apiConfigured,
    getTeamName,
    getTeamInfo,
    loadTeamNames,
  };

  return (
    <TeamNamesContext.Provider value={value}>
      {children}
    </TeamNamesContext.Provider>
  );
}

export function useTeamNames() {
  const context = useContext(TeamNamesContext);
  if (!context) {
    throw new Error('useTeamNames must be used within a TeamNamesProvider');
  }
  return context;
}

/**
 * Hook to display a team name, loading it if necessary
 * @param {string|number} teamNumber
 * @returns {{ name: string, info: object|null, loading: boolean }}
 */
export function useTeamName(teamNumber) {
  const { getTeamName, getTeamInfo, loadTeamNames, loading } = useTeamNames();

  useEffect(() => {
    if (teamNumber) {
      loadTeamNames([teamNumber]);
    }
  }, [teamNumber, loadTeamNames]);

  return {
    name: getTeamName(teamNumber),
    info: getTeamInfo(teamNumber),
    loading,
  };
}
