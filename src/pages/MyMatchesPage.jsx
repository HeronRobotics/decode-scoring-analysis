import { useEffect, useMemo, useState } from "react";
import {
  Trash,
  UploadSimple,
  LinkSimple,
  ArrowSquareOut,
  Target,
  Clock,
  ListNumbers,
  CalendarBlank,
  Users,
  PencilSimple,
  CaretRight,
  CaretDown,
  MagnifyingGlass,
  Funnel,
  CloudArrowUp,
  HardDrive,
} from "@phosphor-icons/react";
import { useAuth } from "../contexts/AuthContext.jsx";
import {
  listMatchesForCurrentUser,
  deleteMatch,
  updateMatch,
  createMatchForUser,
} from "../api/matchesApi.js";
import TextImportModal from "../components/home/modals/TextImportModal.jsx";
import { parseLifetimeImportInput } from "../utils/importLifetime.js";
import { formatStat } from "../utils/format.js";
import { calculateCycleTimes, calculateStats } from "../utils/stats.js";
import { calculateTotalPoints } from "../utils/scoring.js";
import { useTeamNames } from "../contexts/TeamNamesContext.jsx";
import TeamName from "../components/TeamName.jsx";
import {
  getLocalMatches,
  removeLocalMatch,
  markLocalMatchSynced,
  getUnsyncedLocalMatches,
} from "../utils/localMatchStorage.js";

// Helper to compute condensed stats for a match
function getMatchStats(events) {
  const cycleEvents = (events || []).filter((e) => e.type === "cycle");
  if (cycleEvents.length === 0) {
    return { cycles: 0, scored: 0, total: 0, accuracy: 0, avgCycleTime: null };
  }
  const scored = cycleEvents.reduce((sum, e) => sum + (e.scored || 0), 0);
  const total = cycleEvents.reduce((sum, e) => sum + (e.total || 0), 0);
  const accuracy = total > 0 ? (scored / total) * 100 : 0;
  const cycleTimes = calculateCycleTimes(events);
  const timeStats = calculateStats(cycleTimes);
  return {
    cycles: cycleEvents.length,
    scored,
    total,
    accuracy,
    avgCycleTime: timeStats.avg,
  };
}

function MyMatchesPage() {
  const { user, authLoading } = useAuth();
  const { loadTeamNames, getTeamName } = useTeamNames();
  const [matches, setMatches] = useState([]);
  const [localMatches, setLocalMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [selectedMatchId, setSelectedMatchId] = useState(null);
  const [bulkTournamentName, setBulkTournamentName] = useState("");
  const [showTextImport, setShowTextImport] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [importing, setImporting] = useState(false);
  const [showImportSection, setShowImportSection] = useState(false);

  // Search, filter, and grouping state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTournament, setFilterTournament] = useState("");
  const [filterTeam, setFilterTeam] = useState("");
  const [groupBy, setGroupBy] = useState("none"); // "none" | "tournament" | "team" | "date"
  const [collapsedGroups, setCollapsedGroups] = useState({});

  // Editing state for detail panel
  const [editTitle, setEditTitle] = useState("");
  const [editTournament, setEditTournament] = useState("");
  const [editTeamNumber, setEditTeamNumber] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editDate, setEditDate] = useState("");
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState("");

  // Load local matches
  useEffect(() => {
    setLocalMatches(getLocalMatches());
  }, []);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await listMatchesForCurrentUser();
        setMatches(data);
        // Refresh local matches too (they may have been synced)
        setLocalMatches(getLocalMatches());
        if (data.length > 0) {
          const params = new URLSearchParams(window.location.search);
          const matchId = params.get("match");
          if (matchId && data.some((m) => m.id === matchId)) {
            setSelectedMatchId(matchId);
          } else {
            setSelectedMatchId(data[0].id);
          }
        }
      } catch (err) {
        setError(err.message || "Error loading matches");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  // Merge unsynced local matches into display list
  const allMatches = useMemo(() => {
    if (!user) return localMatches;
    const unsyncedLocal = localMatches.filter((m) => !m.synced);
    return [...unsyncedLocal, ...matches];
  }, [user, matches, localMatches]);

  const handleSyncMatch = async (localMatch) => {
    if (!user) return;
    try {
      setSyncing(true);
      const saved = await createMatchForUser(user.id, localMatch, "local_sync");
      markLocalMatchSynced(localMatch.id);
      setMatches((prev) => [saved, ...prev]);
      setLocalMatches(getLocalMatches());
    } catch (err) {
      alert(err.message || "Failed to sync match");
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncAll = async () => {
    if (!user) return;
    const unsynced = getUnsyncedLocalMatches();
    if (unsynced.length === 0) return;

    setSyncing(true);
    try {
      for (const localMatch of unsynced) {
        const saved = await createMatchForUser(user.id, localMatch, "local_sync");
        markLocalMatchSynced(localMatch.id);
        setMatches((prev) => [saved, ...prev]);
      }
      setLocalMatches(getLocalMatches());
    } catch (err) {
      alert(err.message || "Failed to sync matches");
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteLocal = (id) => {
    const confirmed = window.confirm("Delete this local match? This cannot be undone.");
    if (!confirmed) return;
    removeLocalMatch(id);
    setLocalMatches(getLocalMatches());
    if (selectedMatchId === id) {
      setSelectedMatchId(null);
    }
  };

  useEffect(() => {
    if (!matches.length) return;
    const params = new URLSearchParams(window.location.search);
    const matchId = params.get("match");
    if (matchId && matches.some((m) => m.id === matchId)) {
      setSelectedMatchId(matchId);
    }
  }, [matches]);

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this match? This cannot be undone.",
    );
    if (!confirmed) return;

    try {
      await deleteMatch(id);
      setMatches((prev) => prev.filter((m) => m.id !== id));
      if (selectedMatchId === id) {
        setSelectedMatchId(null);
      }
    } catch (err) {
      alert(err.message || "Failed to delete match");
    }
  };

  const tournamentTags = useMemo(() => {
    const names = Array.from(
      new Set(
        matches.map((m) => (m.tournamentName || "").trim()).filter(Boolean),
      ),
    );
    names.sort((a, b) => a.localeCompare(b));
    return names;
  }, [matches]);

  const teamNumbers = useMemo(() => {
    const teams = Array.from(
      new Set(
        matches
          .map((m) => (m.teamNumber || "").toString().trim())
          .filter(Boolean),
      ),
    );
    teams.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    return teams;
  }, [matches]);

  // Load team names for all teams in matches
  const teamNumbersKey = teamNumbers.join(",");
  useEffect(() => {
    if (teamNumbers.length > 0) {
      loadTeamNames(teamNumbers);
    }
  }, [teamNumbersKey, teamNumbers, loadTeamNames]);

  // Filter matches based on search and filters
  const filteredMatches = useMemo(() => {
    return allMatches.filter((m) => {
      // Search filter - check title, team number, tournament name, notes
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const title = (m.title || "").toLowerCase();
        const team = (m.teamNumber || "").toString().toLowerCase();
        const tournament = (m.tournamentName || "").toLowerCase();
        const notes = (m.notes || "").toLowerCase();
        if (
          !title.includes(query) &&
          !team.includes(query) &&
          !tournament.includes(query) &&
          !notes.includes(query)
        ) {
          return false;
        }
      }
      // Tournament filter
      if (filterTournament && (m.tournamentName || "") !== filterTournament) {
        return false;
      }
      // Team filter
      if (filterTeam && (m.teamNumber || "").toString() !== filterTeam) {
        return false;
      }
      return true;
    });
  }, [matches, searchQuery, filterTournament, filterTeam]);

  // Group matches based on groupBy setting
  const groupedMatches = useMemo(() => {
    if (groupBy === "none") {
      return [{ key: "all", label: null, matches: filteredMatches }];
    }

    const groups = {};
    for (const m of filteredMatches) {
      let key;
      let label;
      if (groupBy === "tournament") {
        key = m.tournamentName || "__none__";
        label = m.tournamentName || "No Tournament";
      } else if (groupBy === "team") {
        key = (m.teamNumber || "").toString() || "__none__";
        label = m.teamNumber
          ? `${getTeamName(m.teamNumber)} (${m.teamNumber})`
          : "No Team";
      } else if (groupBy === "date") {
        const date = m.startTime
          ? new Date(m.startTime)
          : m.createdAt
            ? new Date(m.createdAt)
            : null;
        if (date) {
          key = date.toLocaleDateString(undefined, {
            month: "short",
            year: "numeric",
          });
          label = key;
        } else {
          key = "__none__";
          label = "Unknown Date";
        }
      }
      if (!groups[key]) {
        groups[key] = { key, label, matches: [] };
      }
      groups[key].matches.push(m);
    }

    // Sort groups
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (a === "__none__") return 1;
      if (b === "__none__") return -1;
      if (groupBy === "team") {
        return parseInt(a, 10) - parseInt(b, 10);
      }
      if (groupBy === "date") {
        // Parse month-year strings and sort descending (newest first)
        const dateA = new Date(a);
        const dateB = new Date(b);
        return dateB - dateA;
      }
      return a.localeCompare(b);
    });

    return sortedKeys.map((k) => groups[k]);
  }, [filteredMatches, groupBy, getTeamName]);

  const toggleGroup = (key) => {
    setCollapsedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const selectedMatch = allMatches.find((m) => m.id === selectedMatchId) || null;

  useEffect(() => {
    if (!selectedMatch) {
      setEditTitle("");
      setEditTournament("");
      setEditTeamNumber("");
      setEditNotes("");
      setDetailsError("");
      return;
    }
    setEditTitle(selectedMatch.title || "");
    setEditTournament(selectedMatch.tournamentName || "");
    setEditTeamNumber(selectedMatch.teamNumber || "");
    setEditNotes(selectedMatch.notes || "");
    const baseDate = selectedMatch.startTime
      ? new Date(selectedMatch.startTime)
      : selectedMatch.createdAt
        ? new Date(selectedMatch.createdAt)
        : null;
    if (baseDate && !Number.isNaN(baseDate.getTime())) {
      const year = baseDate.getFullYear();
      const month = String(baseDate.getMonth() + 1).padStart(2, "0");
      const day = String(baseDate.getDate()).padStart(2, "0");
      setEditDate(`${year}-${month}-${day}`);
    } else {
      setEditDate("");
    }
    setDetailsError("");
  }, [selectedMatch]);

  const handleSaveDetails = async () => {
    if (!selectedMatch) return;
    try {
      setSavingDetails(true);
      setDetailsError("");
      let newStartTime = selectedMatch.startTime || null;
      if (editDate) {
        const dateOnly = new Date(editDate);
        if (!Number.isNaN(dateOnly.getTime())) {
          if (selectedMatch.startTime) {
            const existing = new Date(selectedMatch.startTime);
            const combined = new Date(
              dateOnly.getFullYear(),
              dateOnly.getMonth(),
              dateOnly.getDate(),
              existing.getHours(),
              existing.getMinutes(),
              existing.getSeconds(),
              existing.getMilliseconds(),
            );
            newStartTime = combined.getTime();
          } else {
            newStartTime = dateOnly.getTime();
          }
        }
      }
      const updated = await updateMatch(selectedMatch.id, {
        title: editTitle,
        tournamentName: editTournament,
        teamNumber: editTeamNumber,
        notes: editNotes,
        startTime: newStartTime,
      });
      setMatches((prev) =>
        prev.map((m) => (m.id === updated.id ? updated : m)),
      );
    } catch (err) {
      setDetailsError(err.message || "Failed to save changes");
    } finally {
      setSavingDetails(false);
    }
  };

  const handleImportFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !user) return;

    setImporting(true);
    setError("");
    try {
      const importedMatches = [];

      for (const file of files) {
        const text = await file.text();
        try {
          const data = JSON.parse(text);
          if (data.matches) {
            for (const m of data.matches || []) {
              const payload = {
                startTime: m.startTime,
                duration: m.duration,
                teamNumber: m.teamNumber,
                events: m.events || [],
                notes: m.notes || "",
                tournamentName: bulkTournamentName || data.name || "",
              };
              const saved = await createMatchForUser(
                user.id,
                payload,
                "import",
              );
              importedMatches.push(saved);
            }
          } else if (data.events) {
            const payload = {
              startTime: data.startTime,
              duration: data.duration,
              teamNumber: data.teamNumber,
              events: data.events || [],
              notes: data.notes || "",
              tournamentName: bulkTournamentName || "",
            };
            const saved = await createMatchForUser(user.id, payload, "import");
            importedMatches.push(saved);
          }
        } catch {
          // ignore invalid file
        }
      }

      if (importedMatches.length) {
        setMatches((prev) => [...importedMatches, ...prev]);
      }
    } catch (err) {
      setError(err.message || "Error importing files");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const handleImportFromText = async () => {
    if (!user) return;

    try {
      setImporting(true);
      setError("");
      const payloads = await parseLifetimeImportInput(textInput);
      if (!payloads.length) {
        alert(
          "No valid matches or tournaments found in the pasted text or links.",
        );
        return;
      }

      const imported = [];
      for (const data of payloads) {
        if (data.matches) {
          for (const m of data.matches || []) {
            const payload = {
              startTime: m.startTime,
              duration: m.duration,
              teamNumber: m.teamNumber,
              events: m.events || [],
              notes: m.notes || "",
              tournamentName: bulkTournamentName || data.name || "",
            };
            const saved = await createMatchForUser(user.id, payload, "import");
            imported.push(saved);
          }
        } else if (data.events) {
          const payload = {
            startTime: data.startTime,
            duration: data.duration,
            teamNumber: data.teamNumber,
            events: data.events || [],
            notes: data.notes || "",
            tournamentName: bulkTournamentName || "",
          };
          const saved = await createMatchForUser(user.id, payload, "import");
          imported.push(saved);
        }
      }

      if (imported.length) {
        setMatches((prev) => [...imported, ...prev]);
      }
      setShowTextImport(false);
      setTextInput("");
    } catch (err) {
      setError(err.message || "Error importing from text");
    } finally {
      setImporting(false);
    }
  };

  // Compute stats for selected match
  const selectedStats = selectedMatch
    ? getMatchStats(selectedMatch.events)
    : null;

  return (
    <div className="min-h-screen p-3 sm:p-5 max-w-7xl mx-auto">
      <div className="my-6 sm:my-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-3xl sm:text-5xl font-bold">My Matches</h1>
      </div>

      {authLoading && (
        <p className="text-center mt-8 text-brand-accent">Loading account...</p>
      )}

      {!authLoading && !user && (
        <>
          {localMatches.length > 0 ? (
            <div className="bg-brand-surface border border-brand-border rounded-2xl p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <HardDrive size={20} weight="bold" className="text-brand-accent" />
                  <h2 className="text-xl font-bold">Local Matches</h2>
                </div>
                <span className="text-sm text-brand-text">
                  {localMatches.length} match{localMatches.length !== 1 ? "es" : ""}
                </span>
              </div>
              <p className="text-sm text-brand-text mb-4">
                These matches are saved on this device. Sign in to sync them to your account.
              </p>
              <div className="space-y-2">
                {localMatches.map((m) => {
                  const date = m.startTime
                    ? new Date(m.startTime)
                    : m.createdAt
                      ? new Date(m.createdAt)
                      : null;
                  const dateStr = date
                    ? date.toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "Unknown date";
                  const stats = getMatchStats(m.events);

                  return (
                    <div
                      key={m.id}
                      className="w-full text-left border-2 border-brand-border p-4 rounded-lg bg-brand-bg"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-brand-mainText truncate">
                            {m.title || (m.teamNumber ? `Team ${m.teamNumber} Match` : "Match")}
                          </div>
                          <div className="text-xs text-brand-text mt-0.5">{dateStr}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteLocal(m.id)}
                          className="p-1.5 text-brand-text hover:text-brand-accent hover:bg-brand-accentBg rounded transition-colors"
                          title="Delete local match"
                        >
                          <Trash size={16} weight="bold" />
                        </button>
                      </div>
                      <div className="flex items-center flex-wrap gap-2 sm:gap-4 mt-2 pt-2 border-t border-brand-border">
                        <div className="flex items-center gap-1.5">
                          <Target size={16} className="text-brand-accent" />
                          <span className="font-semibold text-brand-mainText">
                            {stats.scored}/{stats.total}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <ListNumbers size={16} className="text-brand-accent" />
                          <span className="font-semibold text-brand-mainText">
                            {stats.cycles}
                          </span>
                          <span className="text-xs text-brand-text hidden sm:inline">cycles</span>
                        </div>
                        <div className="text-sm">
                          <span className="font-semibold text-brand-mainText">
                            {formatStat(stats.accuracy, 0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 text-center">
              <p className="mb-4">
                Sign in to view and manage matches saved to your account.
              </p>
              <p>
                Use the <strong>Sign in / Sign up</strong> button in the top right
                to get started.
              </p>
            </div>
          )}
        </>
      )}

      {!authLoading && user && (
        <>
          {/* Import Section - Full Width at Top */}
          <div className="section-card mb-6">
            <button
              type="button"
              onClick={() => setShowImportSection(!showImportSection)}
              className="w-full flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-accentBg flex items-center justify-center">
                  <UploadSimple
                    size={20}
                    weight="bold"
                    className="text-brand-accent"
                  />
                </div>
                <div>
                  <span className="font-bold text-brand-main-text block">Import Matches</span>
                  <span className="text-xs text-brand-text">Upload JSON or paste links</span>
                </div>
              </div>
              <CaretDown
                size={18}
                weight="bold"
                className={`text-brand-accent transition-transform ${
                  showImportSection ? "" : "-rotate-90"
                }`}
              />
            </button>

            {showImportSection && (
              <div className="mt-4 pt-4 border-t border-brand-border">
                <div className="flex flex-col lg:flex-row gap-4 lg:items-end">
                  {/* Tournament Tag */}
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-brand-mainText mb-2">
                      Tournament Tag (optional)
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={bulkTournamentName}
                        onChange={(e) => setBulkTournamentName(e.target.value)}
                        placeholder="e.g. Regionals, Worlds"
                        className="flex-1 px-3 py-2 border-2 border-brand-border focus:border-brand-accent outline-none text-sm rounded"
                      />
                      {tournamentTags.length > 0 && (
                        <select
                          value={bulkTournamentName}
                          onChange={(e) =>
                            setBulkTournamentName(e.target.value)
                          }
                          className="px-3 py-2 border-2 border-brand-border focus:border-brand-accent outline-none text-sm rounded bg-brand-bg"
                        >
                          <option value="">Use existing...</option>
                          {tournamentTags.map((name) => (
                            <option key={name} value={name}>
                              {name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>

                  {/* Import Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <label className="btn !py-2.5 justify-center cursor-pointer">
                      <UploadSimple size={18} weight="bold" />
                      Upload JSON
                      <input
                        type="file"
                        accept=".json"
                        multiple
                        onChange={handleImportFiles}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowTextImport(true)}
                      className="btn !py-2.5 justify-center"
                    >
                      <LinkSimple size={18} weight="bold" />
                      Paste Links
                    </button>
                  </div>
                </div>

                {importing && (
                  <div className="mt-3 text-sm text-brand-accent flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
                    Importing matches...
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(320px,1fr)_minmax(0,1.2fr)] lg:items-start">
            {/* Left Column - Match List */}
            <div className="section-card">
              {/* Saved Matches Header */}
              <div className="flex items-center justify-between mb-5 pb-4 border-b border-brand-border">
                <div>
                  <h2 className="text-xl font-bold text-brand-main-text">Saved Matches</h2>
                  <p className="text-xs text-brand-text mt-0.5">
                    {filteredMatches.length === allMatches.length
                      ? `${allMatches.length} total ${allMatches.length === 1 ? "match" : "matches"}`
                      : `${filteredMatches.length} of ${allMatches.length} matches`}
                  </p>
                </div>
              </div>

              {/* Sync unsynced local matches */}
              {user && localMatches.filter((m) => !m.synced).length > 0 && (
                <div className="mb-4 flex items-center justify-between bg-brand-accentBg border border-brand-border rounded-lg p-3">
                  <div className="flex items-center gap-2 text-sm text-brand-text">
                    <HardDrive size={16} className="text-brand-accent" />
                    {localMatches.filter((m) => !m.synced).length} local match
                    {localMatches.filter((m) => !m.synced).length !== 1 ? "es" : ""} to sync
                  </div>
                  <button
                    type="button"
                    onClick={handleSyncAll}
                    disabled={syncing}
                    className="btn !py-1.5 !px-3 !text-xs flex items-center gap-1.5"
                  >
                    <CloudArrowUp size={14} weight="bold" />
                    {syncing ? "Syncing..." : "Sync all"}
                  </button>
                </div>
              )}

              {/* Search and Filter Section */}
              {allMatches.length > 0 && (
                <div className="mb-4 space-y-3">
                  {/* Search Input */}
                  <div className="relative">
                    <MagnifyingGlass
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text"
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search matches..."
                      className="w-full pl-10 pr-3 py-2 border-2 border-brand-border focus:border-brand-accent outline-none text-sm rounded"
                    />
                  </div>

                  {/* Filter and Group Row */}
                  <div className="flex flex-wrap gap-2">
                    {/* Tournament Filter */}
                    {tournamentTags.length > 0 && (
                      <select
                        value={filterTournament}
                        onChange={(e) => setFilterTournament(e.target.value)}
                        className="px-3 py-1.5 border-2 border-brand-border focus:border-brand-accent outline-none text-sm rounded bg-brand-bg"
                      >
                        <option value="">All Tournaments</option>
                        {tournamentTags.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    )}

                    {/* Team Filter */}
                    {teamNumbers.length > 1 && (
                      <select
                        value={filterTeam}
                        onChange={(e) => setFilterTeam(e.target.value)}
                        className="px-3 py-1.5 border-2 border-brand-border focus:border-brand-accent outline-none text-sm rounded bg-brand-bg"
                      >
                        <option value="">All Teams</option>
                        {teamNumbers.map((num) => (
                          <option key={num} value={num}>
                            {getTeamName(num)} ({num})
                          </option>
                        ))}
                      </select>
                    )}

                    {/* Group By */}
                    <select
                      value={groupBy}
                      onChange={(e) => setGroupBy(e.target.value)}
                      className="px-3 py-1.5 border-2 border-brand-border focus:border-brand-accent outline-none text-sm rounded bg-brand-bg ml-auto"
                    >
                      <option value="none">No Grouping</option>
                      <option value="tournament">Group by Tournament</option>
                      <option value="team">Group by Team</option>
                      <option value="date">Group by Month</option>
                    </select>
                  </div>

                  {/* Clear Filters */}
                  {(searchQuery || filterTournament || filterTeam) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setFilterTournament("");
                        setFilterTeam("");
                      }}
                      className="text-sm text-brand-accent hover:underline flex items-center gap-1"
                    >
                      <Funnel size={14} />
                      Clear filters
                    </button>
                  )}
                </div>
              )}

              {loading && <p className="text-brand-text">Loading matches...</p>}
              {error && (
                <p className="text-brand-accent text-sm mb-2">{error}</p>
              )}

              {!loading && allMatches.length === 0 && !error && (
                <div className="text-center py-8 text-brand-text">
                  <Target size={48} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No saved matches yet.</p>
                  <p className="text-xs mt-1">
                    Record a match and use{" "}
                    <span className="font-semibold">Save to My Matches</span>
                  </p>
                </div>
              )}

              {/* Match List */}
              <div className="space-y-2 max-h-none lg:max-h-[calc(100vh-380px)] min-h-[220px] sm:min-h-[260px] lg:min-h-[300px] overflow-y-auto lg:pr-1">
                {/* No results message */}
                {!loading &&
                  filteredMatches.length === 0 &&
                  allMatches.length > 0 && (
                    <div className="text-center py-8 text-brand-text">
                      <MagnifyingGlass
                        size={48}
                        className="mx-auto mb-3 opacity-30"
                      />
                      <p className="text-sm">No matches found.</p>
                      <p className="text-xs mt-1">
                        Try adjusting your search or filters.
                      </p>
                    </div>
                  )}

                {groupedMatches.map((group) => (
                  <div key={group.key}>
                    {/* Group Header (only shown when grouping is enabled) */}
                    {group.label && (
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.key)}
                        className="w-full flex items-center justify-between py-2 px-3 mb-2 bg-brand-accentBg border border-brand-border rounded-lg hover:bg-brand-accentBg transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {collapsedGroups[group.key] ? (
                            <CaretRight
                              size={16}
                              weight="bold"
                              className="text-brand-accent"
                            />
                          ) : (
                            <CaretDown
                              size={16}
                              weight="bold"
                              className="text-brand-accent"
                            />
                          )}
                          <span className="font-semibold text-brand-accent">
                            {group.label}
                          </span>
                        </div>
                        <span className="text-sm text-brand-text">
                          {group.matches.length}{" "}
                          {group.matches.length === 1 ? "match" : "matches"}
                        </span>
                      </button>
                    )}

                    {/* Group Content */}
                    {!collapsedGroups[group.key] && (
                      <div className="space-y-2">
                        {group.matches.map((m) => {
                          const date = m.startTime
                            ? new Date(m.startTime)
                            : m.createdAt
                              ? new Date(m.createdAt)
                              : null;
                          const dateStr = date
                            ? date.toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "Unknown date";
                          const stats = getMatchStats(m.events);
                          const points = calculateTotalPoints(m);
                          const isSelected = selectedMatchId === m.id;

                          return (
                            <div
                              key={m.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => setSelectedMatchId(m.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  setSelectedMatchId(m.id);
                                }
                              }}
                              className={`w-full text-left border-2 p-4 rounded-xl transition-all cursor-pointer ${
                                isSelected
                                  ? "border-brand-accent bg-brand-accentBg shadow-lg scale-[1.02]"
                                  : "border-brand-border bg-brand-bg hover:border-brand-accent/50 hover:bg-brand-surface hover:shadow-md"
                              }`}
                            >
                              {/* Match Header */}
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-brand-mainText truncate">
                                      {m.title ||
                                        (m.teamNumber
                                          ? `${getTeamName(m.teamNumber)} Match`
                                          : "Match")}
                                    </span>
                                    {m.id?.startsWith("local_") && !m.synced && (
                                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-brand-accentBg text-brand-accent shrink-0">
                                        Local
                                      </span>
                                    )}
                                  </div>
                                  {m.tournamentName &&
                                    groupBy !== "tournament" && (
                                      <div className="text-xs text-brand-accent font-medium mt-0.5">
                                        {m.tournamentName}
                                      </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-1">
                                  {m.id?.startsWith("local_") && !m.synced && user && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSyncMatch(m);
                                      }}
                                      disabled={syncing}
                                      className="p-1.5 text-brand-text hover:text-brand-accent hover:bg-brand-accentBg rounded transition-colors"
                                      title="Sync to account"
                                    >
                                      <CloudArrowUp size={16} weight="bold" />
                                    </button>
                                  )}
                                  {!m.id?.startsWith("local_") && (
                                    <a
                                      href={`/match?match=${encodeURIComponent(m.id)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="p-1.5 text-brand-text hover:text-brand-accent hover:bg-brand-accentBg rounded transition-colors"
                                      title="Open in new tab"
                                    >
                                      <ArrowSquareOut size={16} weight="bold" />
                                    </a>
                                  )}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (m.id?.startsWith("local_")) {
                                        handleDeleteLocal(m.id);
                                      } else {
                                        handleDelete(m.id);
                                      }
                                    }}
                                    className="p-1.5 text-brand-text hover:text-brand-accent hover:bg-brand-accentBg rounded transition-colors"
                                    title="Delete match"
                                  >
                                    <Trash size={16} weight="bold" />
                                  </button>
                                </div>
                              </div>

                              {/* Match Stats Row */}
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-brand-text">
                                {groupBy !== "team" && (
                                  <span className="flex items-center gap-1.5">
                                    <Users
                                      size={14}
                                      className="text-brand-text"
                                    />
                                    {m.teamNumber
                                      ? `${getTeamName(m.teamNumber)} (${m.teamNumber})`
                                      : "No Team"}
                                  </span>
                                )}
                                {groupBy !== "date" && (
                                  <span className="flex items-center gap-1.5">
                                    <CalendarBlank
                                      size={14}
                                      className="text-brand-text"
                                    />
                                    {dateStr}
                                  </span>
                                )}
                                <span className="flex items-center gap-1.5">
                                  <Target
                                    size={14}
                                    className="text-brand-text"
                                  />
                                  <span className="font-semibold text-brand-mainText">
                                    {formatStat(points.total, 0)}
                                  </span>
                                  <span className="text-xs text-brand-text">
                                    pts
                                  </span>
                                </span>
                              </div>

                              {/* Score Summary */}
                              <div className="flex items-center flex-wrap gap-2 sm:gap-4 mt-3 pt-3 border-t border-brand-border">
                                <div className="flex items-center gap-1 sm:gap-1.5">
                                  <Target
                                    size={16}
                                    className="text-brand-accent"
                                  />
                                  <span className="font-semibold text-brand-mainText">
                                    {stats.scored}/{stats.total}
                                  </span>
                                  <span className="text-xs text-brand-text hidden sm:inline">
                                    scored
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 sm:gap-1.5">
                                  <ListNumbers
                                    size={16}
                                    className="text-brand-accent"
                                  />
                                  <span className="font-semibold text-brand-mainText">
                                    {stats.cycles}
                                  </span>
                                  <span className="text-xs text-brand-text hidden sm:inline">
                                    cycles
                                  </span>
                                </div>
                                <div className="text-sm">
                                  <span className="font-semibold text-brand-mainText">
                                    {formatStat(stats.accuracy, 0)}%
                                  </span>
                                  <span className="text-xs text-brand-text ml-1 hidden sm:inline">
                                    acc
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column - Match Preview */}
            <div className="section-card min-h-[260px] sm:min-h-[320px] lg:min-h-[400px]">
              {selectedMatch ? (
                <>
                  {/* Header with title and actions */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6 pb-5 border-b border-brand-border">
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-brand-main-text">
                        {selectedMatch.title ||
                          (selectedMatch.teamNumber ? (
                            <>
                              <TeamName teamNumber={selectedMatch.teamNumber} />{" "}
                              Match
                            </>
                          ) : (
                            "Match"
                          ))}
                      </h2>
                      {selectedMatch.tournamentName && (
                        <p className="text-brand-accent font-medium mt-1.5 flex items-center gap-2">
                          <Users size={14} />
                          {selectedMatch.tournamentName}
                        </p>
                      )}
                    </div>
                    <a
                      href={`/match?match=${encodeURIComponent(selectedMatch.id)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="button button-sm flex items-center gap-2 flex-shrink-0"
                    >
                      <ArrowSquareOut size={16} weight="bold" />
                      View Full Details
                    </a>
                  </div>

                  {selectedStats && selectedStats.cycles > 0 && (
                    <div className="bg-brand-invert-bg rounded-2xl p-6 mb-6 shadow-lg">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="text-center">
                          <div className="text-2xl sm:text-3xl font-bold text-brand-surface">
                            {selectedStats.cycles}
                          </div>
                          <div className="text-brand-surface text-xs flex items-center justify-center gap-1 mt-1">
                            <ListNumbers size={14} />
                            Cycles
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl sm:text-3xl font-bold text-brand-surface">
                            {selectedStats.scored}
                            <span className="text-lg text-brand-surface">
                              /{selectedStats.total}
                            </span>
                          </div>
                          <div className="text-brand-surface text-xs flex items-center justify-center gap-1 mt-1">
                            <Target size={14} />
                            Scored
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl sm:text-3xl font-bold text-brand-surface">
                            {formatStat(selectedStats.accuracy, 0)}%
                          </div>
                          <div className="text-brand-surface text-xs flex items-center justify-center gap-1 mt-1">
                            <Target size={14} weight="fill" />
                            Accuracy
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl sm:text-3xl font-bold text-brand-surface">
                            {selectedStats.avgCycleTime
                              ? `${formatStat(selectedStats.avgCycleTime, 1)}s`
                              : "—"}
                          </div>
                          <div className="text-brand-surface text-xs flex items-center justify-center gap-1 mt-1">
                            <Clock size={14} />
                            Avg Cycle
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Edit Section */}
                  <div className="border-t border-brand-border pt-5">
                    <div className="flex items-center gap-2 mb-4">
                      <PencilSimple size={18} className="text-brand-accent" />
                      <h3 className="font-semibold text-brand-mainText">
                        Edit Match Info
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-brand-text mb-1">
                          Title
                        </label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          placeholder="e.g. Quals 15, Finals 2"
                          className="w-full px-3 py-2 border-2 border-brand-border focus:border-brand-accent outline-none text-sm rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-brand-text mb-1">
                          Tournament
                        </label>
                        <input
                          type="text"
                          value={editTournament}
                          onChange={(e) => setEditTournament(e.target.value)}
                          placeholder="e.g. Regionals"
                          className="w-full px-3 py-2 border-2 border-brand-border focus:border-brand-accent outline-none text-sm rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-brand-text mb-1">
                          Team Number
                        </label>
                        <input
                          type="number"
                          value={editTeamNumber}
                          onChange={(e) => setEditTeamNumber(e.target.value)}
                          className="w-full px-3 py-2 border-2 border-brand-border focus:border-brand-accent outline-none text-sm rounded"
                          min="1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-brand-text mb-1 flex items-center gap-1.5">
                          <CalendarBlank
                            size={14}
                            className="text-brand-text"
                          />
                          Match Date
                        </label>
                        <input
                          type="date"
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                          className="w-full px-3 py-2 border-2 border-brand-border focus:border-brand-accent outline-none text-sm rounded"
                        />
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-brand-text mb-1">
                        Notes
                      </label>
                      <textarea
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        className="w-full px-3 py-2 border-2 border-brand-border focus:border-brand-accent outline-none text-sm rounded min-h-[80px] resize-y"
                        placeholder="Defense played, robot issues, strategy notes..."
                      />
                    </div>

                    {detailsError && (
                      <p className="mb-3 text-sm text-brand-accent">
                        {detailsError}
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={handleSaveDetails}
                      disabled={savingDetails}
                      className="btn !py-2 !px-4"
                    >
                      {savingDetails ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-brand-text">
                  <div className="w-20 h-20 rounded-2xl bg-brand-accentBg/30 flex items-center justify-center mb-4">
                    <Target size={40} className="text-brand-accent/40" />
                  </div>
                  <p className="text-xl font-semibold text-brand-main-text">No Match Selected</p>
                  <p className="text-sm mt-2 text-center max-w-xs">
                    Choose a match from the list to view detailed statistics and edit information
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <TextImportModal
        open={showTextImport}
        textInput={textInput}
        setTextInput={setTextInput}
        onImport={handleImportFromText}
        onClose={() => setShowTextImport(false)}
      />
    </div>
  );
}

export default MyMatchesPage;
