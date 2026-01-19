import { useEffect, useMemo, useState } from "react";
import { Trash, UploadSimple, LinkSimple } from "@phosphor-icons/react";
import { useAuth } from "../contexts/AuthContext.jsx";
import {
  listMatchesForCurrentUser,
  deleteMatch,
  updateMatch,
  createMatchForUser,
} from "../api/matchesApi.js";
import Statistics from "../components/Statistics.jsx";
import Timeline from "../components/Timeline.jsx";
import TextImportModal from "../components/home/modals/TextImportModal.jsx";
import { parseLifetimeImportInput } from "../utils/importLifetime.js";

function MyMatchesPage() {
  const { user, authLoading } = useAuth();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedMatchId, setSelectedMatchId] = useState(null);
  const [bulkTournamentName, setBulkTournamentName] = useState("");
  const [showTextImport, setShowTextImport] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await listMatchesForCurrentUser();
        setMatches(data);
        if (data.length > 0) {
          setSelectedMatchId(data[0].id);
        }
      } catch (err) {
        setError(err.message || "Error loading matches");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

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

  const selectedMatch = matches.find((m) => m.id === selectedMatchId) || null;

  const handleTitleChange = async (id, nextTitle) => {
    try {
      const updated = await updateMatch(id, { title: nextTitle });
      setMatches((prev) => prev.map((m) => (m.id === id ? updated : m)));
    } catch (err) {
      alert(err.message || "Failed to update title");
    }
  };

  const handleTournamentNameChange = async (id, nextName) => {
    try {
      const updated = await updateMatch(id, { tournamentName: nextName });
      setMatches((prev) => prev.map((m) => (m.id === id ? updated : m)));
    } catch (err) {
      alert(err.message || "Failed to update tournament name");
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

  return (
    <div className="min-h-screen p-3 sm:p-5 max-w-7xl mx-auto">
      <div className="my-6 sm:my-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-3xl sm:text-5xl font-bold">My Matches</h1>
      </div>

      {authLoading && (
        <p className="text-center mt-8 text-[#445f8b]">Loading account...</p>
      )}

      {!authLoading && !user && (
        <div className="bg-white border-2 border-[#445f8b] p-6 text-center">
          <p className="mb-4">
            Sign in to view and manage matches saved to your account.
          </p>
          <p>
            Use the <strong>Sign in / Sign up</strong> button in the top right
            to get started.
          </p>
        </div>
      )}

      {!authLoading && user && (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_minmax(0,1.5fr)] items-start">
          <div className="bg-white border-2 border-[#445f8b] p-4 sm:p-6 space-y-4">
            <div className="border-b border-[#eee] pb-4 mb-2">
              <h2 className="text-xl font-semibold mb-2">
                Bulk import matches
              </h2>
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center mb-3">
                <label className="flex items-center gap-2 text-sm">
                  <span className="font-semibold">
                    Tournament tag (optional):
                  </span>
                  <input
                    type="text"
                    value={bulkTournamentName}
                    onChange={(e) => setBulkTournamentName(e.target.value)}
                    placeholder="Play Space Qualifier, Regionals, etc."
                    className="px-2 py-1 border-2 border-[#ddd] focus:border-[#445f8b] outline-none text-xs rounded"
                  />
                </label>
                {tournamentTags.length > 0 && (
                  <label className="flex items-center gap-2 text-xs">
                    <span className="font-semibold">Or pick existing:</span>
                    <select
                      value={bulkTournamentName}
                      onChange={(e) => setBulkTournamentName(e.target.value)}
                      className="px-2 py-1 border-2 border-[#ddd] focus:border-[#445f8b] outline-none text-xs rounded min-w-[10rem]"
                    >
                      <option value="">(none)</option>
                      {tournamentTags.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
              <div className="flex flex-wrap gap-3 items-center">
                <label className="btn !py-2 !px-3 text-xs sm:text-sm">
                  <UploadSimple size={16} weight="bold" />
                  Upload JSON files
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
                  className="btn !py-2 !px-3 text-xs sm:text-sm flex items-center gap-2"
                >
                  <LinkSimple size={16} weight="bold" />
                  Paste text or links
                </button>
                {importing && (
                  <span className="text-xs text-[#666]">Importing...</span>
                )}
              </div>
              <p className="text-xs text-[#666] mt-2">
                Imported matches are saved to your account and will appear here,
                in Tournament Analysis, and in Lifetime Stats.
              </p>
            </div>

            <h2 className="text-xl font-semibold mb-4">Saved Matches</h2>

            {loading && <p>Loading matches...</p>}
            {error && <p className="text-red-600 text-sm mb-2">{error}</p>}

            {!loading && matches.length === 0 && !error && (
              <p className="text-sm text-[#666]">
                You do not have any saved matches yet. Record a match and use
                <span className="font-semibold"> Save to My Matches</span> to
                store it here.
              </p>
            )}

            <div className="space-y-2 mt-2 max-h-[420px] overflow-y-auto">
              {matches.map((m) => {
                const date = m.startTime
                  ? new Date(m.startTime)
                  : m.createdAt
                    ? new Date(m.createdAt)
                    : null;
                const dateLabel = date ? date.toLocaleString() : "Unknown date";
                const cycleEvents = m.events.filter((e) => e.type === "cycle");
                const scored = cycleEvents.reduce(
                  (sum, e) => sum + (e.scored || 0),
                  0,
                );
                const total = cycleEvents.reduce(
                  (sum, e) => sum + (e.total || 0),
                  0,
                );

                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedMatchId(m.id)}
                    className={`w-full text-left border-2 p-3 flex items-center justify-between gap-3 transition-colors ${
                      selectedMatchId === m.id
                        ? "border-[#445f8b] bg-[#f0f5ff]"
                        : "border-[#ddd] bg-white hover:border-[#445f8b]"
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">
                        <input
                          type="text"
                          className="w-full px-1 py-0.5 border border-[#ddd] text-[12px] rounded"
                          value={m.title || ""}
                          onChange={(e) =>
                            handleTitleChange(m.id, e.target.value)
                          }
                          placeholder="Optional match title"
                        />
                      </span>
                      <span className="text-xs text-[#666]">
                        Team {m.teamNumber || "Unknown"}
                      </span>
                      <span className="text-xs text-[#666]">{dateLabel}</span>
                      <span className="text-xs text-[#666]">
                        {scored}/{total} balls scored
                      </span>
                      <span className="text-xs text-[#666] mt-1">
                        <span className="font-semibold">Tournament:</span>{" "}
                        <input
                          type="text"
                          className="inline-block px-1 py-0.5 border border-[#ddd] text-[11px] ml-1"
                          value={m.tournamentName || ""}
                          onChange={(e) =>
                            handleTournamentNameChange(m.id, e.target.value)
                          }
                          placeholder="optional"
                        />
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(m.id);
                      }}
                      className="error-btn !py-1 !px-2 flex items-center gap-1 text-xs"
                    >
                      <Trash size={14} weight="bold" />
                      Delete
                    </button>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white border-2 border-[#445f8b] p-4 sm:p-6 min-h-[260px]">
            {selectedMatch ? (
              <>
                <h2 className="text-xl font-semibold mb-4">Match Details</h2>
                <div className="mb-4 text-sm text-[#444]">
                  <p>
                    <strong>Title:</strong> {selectedMatch.title || "None"}
                  </p>
                  <p>
                    <strong>Team:</strong> {selectedMatch.teamNumber || "N/A"}
                  </p>
                  <p>
                    <strong>Notes:</strong>{" "}
                    {selectedMatch.notes ? selectedMatch.notes : "None"}
                  </p>
                </div>
                <Timeline
                  events={selectedMatch.events}
                  currentTime={
                    selectedMatch.events.length > 0
                      ? selectedMatch.events[selectedMatch.events.length - 1]
                          .timestamp
                      : 0
                  }
                />
                {selectedMatch.events.length > 0 && (
                  <div className="mt-4">
                    <Statistics
                      events={selectedMatch.events}
                      teamNumber={selectedMatch.teamNumber}
                      notes={selectedMatch.notes}
                    />
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-[#666]">
                Select a match from the list to view details.
              </p>
            )}
          </div>
        </div>
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
