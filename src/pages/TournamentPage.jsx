import { useMemo, useState } from 'react'
import { ArrowLeft, UploadSimple, Calendar, FloppyDisk } from '@phosphor-icons/react'
import Statistics from '../components/Statistics'
import Timeline from '../components/Timeline'
import TournamentGraphs from '../components/TournamentGraphs'
import { logEvent } from 'firebase/analytics'
import { analytics } from '../firebase'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'

const numToKey = (num) => `Team ${num}`

function TournamentPage({ onBack }) {
  const [tournament, setTournament] = useState(null)
  const [selectedMatch, setSelectedMatch] = useState(0)
  const [isCreating, setIsCreating] = useState(false)
  const [tournamentName, setTournamentName] = useState('')
  const [tournamentDate, setTournamentDate] = useState('')
  const [uploadedMatches, setUploadedMatches] = useState([])
  const [selectedTeam, setSelectedTeam] = useState('')
  const [visibleTeams, setVisibleTeams] = useState({})
  const [hoveredTeam, setHoveredTeam] = useState(null)

  // visibleTeams default: undefined -> treated as visible; toggling will set to true/false

  const teams = useMemo(() => {
    if (!tournament?.matches) return []
    const uniq = Array.from(new Set(
      tournament.matches
        .map(m => (m.teamNumber || '').toString().trim())
        .filter(Boolean)
    ));
    return uniq;
  }, [tournament])

  const filteredMatches = useMemo(() => {
    if (!tournament?.matches) return [];
    if (!selectedTeam) return tournament.matches;
    return tournament.matches.filter(m => (m.teamNumber || '').toString().trim() === selectedTeam);
  }, [tournament, selectedTeam]);

  const importTournament = (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result)
        setTournament(data)
        setSelectedMatch(0)
        setSelectedTeam('')
        setIsCreating(false)
      } catch {
        alert('Error loading tournament file. Please ensure it is a valid JSON file.')
      }
    }
    reader.readAsText(file)
  }

  const importMatchFiles = (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    let loadedMatches = []
    let loadedCount = 0

    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result)
          loadedMatches.push(data)
          loadedCount++

          if (loadedCount === files.length) {
            setUploadedMatches(prev => [...prev, ...loadedMatches])
          }
        } catch {
          alert(`Error loading ${file.name}. Please ensure it is a valid JSON file.`)
          loadedCount++
        }
      }
      reader.readAsText(file)
    })
  }

  const createTournament = () => {
    if (!tournamentName.trim()) {
      alert('Please enter a tournament name')
      return
    }
    if (!tournamentDate) {
      alert('Please select a tournament date')
      return
    }
    if (uploadedMatches.length === 0) {
      alert('Please upload at least one match')
      return
    }

    const newTournament = {
      name: tournamentName,
      date: tournamentDate,
      matches: uploadedMatches
    }

    setTournament(newTournament)
    setSelectedMatch(0)
    setSelectedTeam('')
    setIsCreating(false)
    logEvent(analytics, 'create_tournament', {
        tournamentName: tournamentName,
        numMatches: uploadedMatches.length
    });
  }

  // visibleTeams will be toggled by the legend buttons; undefined means visible

  const saveTournament = () => {
    if (!tournament) return

    const blob = new Blob([JSON.stringify(tournament, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tournament-${tournament.name.toLowerCase().replace(/\s+/g, '-')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isCreating) {
    return (
      <div className="min-h-screen p-5 max-w-7xl mx-auto">
        <div className="my-8 flex items-center justify-between">
          <h1 className="text-5xl font-bold">Create Tournament</h1>
          <button onClick={() => setIsCreating(false)} className="btn">
            <ArrowLeft size={20} weight="bold" />
            Cancel
          </button>
        </div>

        <div className="bg-white border-2 border-[#445f8b] p-8">
          <div className="space-y-6 mb-8">
            <div>
              <label className="block font-semibold mb-2">Tournament Name</label>
              <input
                type="text"
                value={tournamentName}
                onChange={(e) => setTournamentName(e.target.value)}
                placeholder="e.g., Qualifier October 10th"
                className="w-full p-3 border-2 border-[#ddd] focus:border-[#445f8b] outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold mb-2">Tournament Date</label>
              <input
                type="date"
                value={tournamentDate}
                onChange={(e) => setTournamentDate(e.target.value)}
                className="w-full p-3 border-2 border-[#ddd] focus:border-[#445f8b] outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold mb-2">Upload Match Files ({uploadedMatches.length} uploaded)</label>
              <label className="btn py-3!">
                <UploadSimple weight="bold" size={20} />
                Upload Match JSON Files
                <input
                  type="file"
                  accept=".json"
                  multiple
                  onChange={importMatchFiles}
                  className="hidden"
                />
              </label>
            </div>

            {uploadedMatches.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Uploaded Matches:</h3>
                <div className="space-y-2">
                  {uploadedMatches.map((match, index) => {
                    const cycleEvents = match.events.filter(e => e.type === 'cycle')
                    const scored = cycleEvents.reduce((sum, e) => sum + e.scored, 0)
                    const total = cycleEvents.reduce((sum, e) => sum + e.total, 0)
                    return (
                      <div key={index} className="border-2 border-[#ddd] p-3 flex justify-between items-center">
                        <div>
                          <span className="font-semibold">Match {index + 1} ({match.teamNumber || 'No Team'})</span>
                          <span className="text-sm text-[#666] ml-4">
                            {scored}/{total} balls scored
                          </span>
                        </div>
                        <button
                          onClick={() => setUploadedMatches(prev => prev.filter((_, i) => i !== index))}
                          className="error-btn py-1! px-3! text-sm!"
                        >
                          Remove
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={createTournament}
            className="btn py-3! bg-[#445f8b]! text-white! px-6!"
          >
            <FloppyDisk weight="bold" size={20} />
            Create Tournament
          </button>
        </div>
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="min-h-screen p-5 max-w-7xl mx-auto flex flex-col justify-center items-center gap-12">
        <header className="text-center my-8">
          <h1 className="text-5xl font-bold">Tournament Analysis</h1>
        </header>

        <div className="bg-white border-2 border-[#445f8b] flex flex-col items-center p-16 gap-6">
          <h2 className="text-3xl text-center">Load or Create Tournament</h2>
          <p className='mb-4 text-center'>
            Scout teams at tournaments (or other multi-match events like scrimmages) and import them here!
            This will give you deeper insight into how well each team did across all matches, especially with regard to scoring and consistency.<br /><br />
            Creating "Tournament" JSON files will also make it very easy for you to keep track of your <i>own</i> performance over time on the Lifetime Stats page.
          </p>
          
          <button
            onClick={() => setIsCreating(true)}
            className="btn py-3! bg-[#445f8b]! text-white! px-6!"
          >
            <Calendar weight="bold" size={24} />
            Create New Tournament From Game Files
          </button>

          <div className="flex gap-4 items-center my-4">
            <hr className="w-12 grow border-t border-gray-300" />
            <span className="mx-2 text-gray-500">or</span>
            <hr className="grow w-12 border-t border-gray-300" />
          </div>

          <label className="btn py-3!">
            <span className="flex items-center gap-2">
              <UploadSimple weight="bold" size={24} />
              Load Existing Tournament JSON
            </span>
            <input type="file" accept=".json" onChange={importTournament} className="hidden" />
          </label>

          <button onClick={onBack} className="btn mt-6">
            <ArrowLeft size={20} weight="bold" />
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  const currentMatch = filteredMatches[selectedMatch]
  

  const getMatchTime = (m) => {
    if (m.startTime) {
      const date = new Date(m.startTime);
      date.setSeconds(0, 0); // Remove seconds and milliseconds
      return date.getTime();
    }
    // fallback to first event timestamp if available
    if (m.events && m.events.length > 0) {
      const date = new Date(m.events[0].timestamp);
      date.setSeconds(0, 0); // Remove seconds and milliseconds
      return date.getTime();
    }
    return 0;
  }

  const matchesOrdered = filteredMatches.slice().sort((a, b) => getMatchTime(a) - getMatchTime(b))

  // Build per-team stats (scores per match aligned to matchesOrdered)
  const teamStats = teams.map(team => {
    const scores = matchesOrdered.map(m => {
      const teamNum = (m.teamNumber || '').toString().trim()
      if (teamNum !== team) return null
      const cycleEvents = m.events.filter(e => e.type === 'cycle')
      return cycleEvents.reduce((sum, e) => sum + e.scored, 0)
    })

    // compute summary stats for the team
    const numeric = scores.filter(v => v !== null)
    const sorted = numeric.slice().sort((a, b) => a - b)
    const median = sorted.length === 0 ? 0 : (sorted.length % 2 === 1 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length/2 -1] + sorted[sorted.length/2]) / 2)
    const avg = numeric.length ? numeric.reduce((a,b)=>a+b,0)/numeric.length : 0
    const totalScored = numeric.reduce((a,b)=>a+b,0)
    const totalBalls = matchesOrdered.reduce((sum, m) => {
      const teamNum = (m.teamNumber || '').toString().trim()
      if (teamNum !== team) return sum
      const cycleEvents = m.events.filter(e => e.type === 'cycle')
      return sum + cycleEvents.reduce((s, e) => s + e.total, 0)
    }, 0)
    const accuracy = totalBalls > 0 ? (totalScored / totalBalls) * 100 : 0

    return {
      team,
      scores,
      median,
      avg,
      totalScored,
      totalBalls,
      accuracy
    }
  }).sort((a,b) => b.median - a.median)
  
  // Compute shared Y max across all teams so small charts are comparable
  const sharedMax = Math.max(1, ...teamStats.flatMap(ts => ts.scores.filter(v => v !== null)) )
  
  // Build combined chart data: one object per match with scores per team
  const chartData = matchesOrdered.map((m, idx) => {
    let key = new Date(getMatchTime(m)).toLocaleString();
    if (key.indexOf(':00 ') !== -1) {
      key = key.replace(':00 ', ' ');
    }
    const obj = {
      // human-friendly x-axis label (date)
      label: key,
      // stable unique match index and timestamp for reliable tooltip lookup
      matchIdx: idx,
      matchTime: getMatchTime(m),
      _idx: idx,
    }
    teamStats.forEach(ts => {
      obj[numToKey(ts.team)] = ts.scores[idx] == null ? null : ts.scores[idx]
    })
    return obj
  });

  // Map team to color
  const palette = ['#445f8b', '#2d3e5c', '#7a93c2', '#9fb0df', '#ff7f50', '#6aa84f', '#f1c232', '#8e7cc3', '#d9534f', '#5bc0de']
  const teamColors = teamStats.reduce((acc, ts, i) => { acc[ts.team] = palette[i % palette.length]; return acc }, {})



  const toggleTeam = (team) => {
    setVisibleTeams(prev => ({ ...prev, [team]: prev[team] === false ? true : false }))
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null
    // Prefer the payload's matchIdx (added to chartData). Fallback to matching matchTime when needed.
  const idxPayloadItem = payload.find(p => p && p.payload && (p.payload.matchIdx !== undefined || p.payload._idx !== undefined))
  const idx = idxPayloadItem?.payload?.matchIdx ?? idxPayloadItem?.payload?._idx
    const row = typeof idx === 'number' && chartData[idx] ? chartData[idx] : chartData.find(r => r.label === label) || {}
    const displayLabel = row.matchTime ? new Date(row.matchTime).toLocaleString() : label
    return (
      <div className="bg-white border-2 border-[#445f8b] p-2 text-sm">
        <div className="font-semibold mb-1">{displayLabel}</div>
        <div className="space-y-1">
          {teamStats.filter(ts => visibleTeams[ts.team] !== false).map(ts => (
            <div key={ts.team} className="flex items-center gap-2">
              <div style={{ width: 10, height: 10, background: teamColors[ts.team] }} />
              <div className="flex-1">Team {ts.team}</div>
              <div className="font-semibold">{row[numToKey(ts.team)] == null ? '-' : `${row[numToKey(ts.team)]} balls`}</div>
            </div>
          ))}
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen p-5 max-w-7xl mx-auto">
      <div className="my-8 flex flex-row flex-wrap space-y-3 items-center justify-between">
        <div>
          <h1 className="text-5xl font-bold">{tournament.name}</h1>
          <p className="text-lg text-[#666] mt-2">{new Date(tournament.date).toLocaleDateString()}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={saveTournament} className="btn">
            <FloppyDisk size={20} weight="bold" />
            Save Tournament
          </button>
        </div>
      </div>

      {/* Tournament-wide Statistics */}
      <div className="mb-18">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <h2 className="text-3xl">Tournament Summary</h2>
          {teams.length > 0 && (
            <div className="flex items-center gap-3">
              <label className="font-semibold">Team:</label>
              <select
                value={selectedTeam}
                onChange={(e) => {
                  setSelectedTeam(e.target.value)
                  setSelectedMatch(0)
                }}
                className="p-2 border-2 border-[#ddd] focus:border-[#445f8b] outline-none min-w-40"
              >
                <option value="">All Teams</option>
                {teams.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="bg-white p-6 border-2 border-[#445f8b] mt-5">
          <h3 className="text-xl font-semibold mb-3">Per-Match Scores — All Teams</h3>
          <div className="mb-2 text-sm text-[#666]">Sorted by median scored (highest first). Hover points for match details.</div>
          {/* Legend / team toggles */}
          <div className="flex flex-wrap gap-2 mb-3">
            {teamStats.map(ts => (
              <button
                key={ts.team}
                onClick={() => toggleTeam(ts.team)}
                className={`flex items-center gap-2 px-3 py-2 border rounded ${visibleTeams[ts.team] === false ? 'opacity-40' : ''}`}
              >
                <span className="inline-block" style={{ width: 12, height: 12, background: teamColors[ts.team] }} />
                <span className="text-sm">{ts.team}</span>
              </button>
            ))}
          </div>
          <div className="h-[600px]">
            <ResponsiveContainer width="100%" height={600}>
              <LineChart data={chartData} margin={{ top: 20, right: 40, left: 8, bottom: 20 }}>
                <CartesianGrid stroke="#f7fafc" />
                <XAxis dataKey="label" tick={{ fill: '#666' }} />
                <YAxis domain={[0, sharedMax]} tick={{ fill: '#666' }} />
                <Tooltip content={<CustomTooltip />} />
                {/* Render one Line per team with a stable color palette */}
                {teamStats.map((ts, i) => {
                  const key = numToKey(ts.team)
                  const colors = ['#445f8b', '#2d3e5c', '#7a93c2', '#9fb0df', '#ff7f50', '#6aa84f', '#f1c232', '#8e7cc3']
                  const color = colors[i % colors.length]
                  const isVisible = visibleTeams[ts.team] !== false
                  if (!isVisible) return null
                  const isHovered = hoveredTeam ? hoveredTeam === ts.team : false
                  return (
                    <Line
                      key={ts.team}
                      type="monotone"
                      dataKey={key}
                      stroke={color}
                      strokeWidth={isHovered ? 3 : 2}
                      strokeOpacity={hoveredTeam ? (isHovered ? 1 : 0.15) : 0.95}
                      dot={{ r: isHovered ? 5 : 3 }}
                      connectNulls={true}
                      isAnimationActive={false}
                      onMouseEnter={() => setHoveredTeam(ts.team)}
                      onMouseLeave={() => setHoveredTeam(null)}
                    />
                  )
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Per-team summary table below the chart for quick scanning */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            {teamStats.map(ts => {
              const isHovered = hoveredTeam === ts.team
              return (
                <div key={ts.team} className={`p-3 border-2 ${isHovered ? 'ring-2 ring-[#445f8b] bg-[#f0f5ff]' : 'border-[#eee]'}`}>
                  <div className="flex items-baseline justify-between">
                    <div className="font-semibold">Team {ts.team}</div>
                    <div className="text-sm text-[#666]">Median: <strong>{ts.median}</strong></div>
                  </div>
                  <div className="text-sm text-[#666] mt-2">
                    Avg: <strong>{ts.avg.toFixed(1)}</strong> • Accuracy: <strong>{ts.accuracy.toFixed(1)}%</strong>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <div className="mt-5">
          <TournamentGraphs matches={filteredMatches} />
        </div>
      </div>


    <div className='w-full flex flex-col items-start p-8 bg-[#f0f5fd]'>
        <h2 className='mb-8'>
            <span className="text-3xl mb-5">Match Details</span>
        </h2>
        <div className="w-full bg-white border-2 border-[#445f8b] p-6 mb-8">
            <h3 className="text-2xl mb-4">Select Match ({filteredMatches.length} total)</h3>
            <div className="flex gap-3 flex-wrap">
            {filteredMatches.map((_, index) => (
                <button
                key={index}
                onClick={() => setSelectedMatch(index)}
                className={`px-6 py-3 border-2 font-semibold transition-colors ${
                    selectedMatch === index
                    ? 'border-[#445f8b] bg-[#445f8b] text-white'
                    : 'border-[#ddd] bg-white hover:border-[#445f8b]'
                }`}
                >
                Match {index + 1} ({filteredMatches[index].teamNumber || 'No Team'})
                </button>
            ))}
            </div>
        </div>

        {/* Individual Match View */}
        <div className="w-full mb-8">
            {currentMatch ? (
              <>
                <Statistics events={currentMatch.events} teamNumber={(currentMatch.teamNumber || '').toString().trim() || undefined} />
                <Timeline
                    events={currentMatch.events} 
                    currentTime={currentMatch.events[currentMatch.events.length - 1]?.timestamp || 0} 
                />
              </>
            ) : (
              <div className="bg-white border-2 border-[#445f8b] p-6 text-center text-[#666]">No matches for selected team.</div>
            )}
        </div>
        </div>
    </div>
  )
}

export default TournamentPage
