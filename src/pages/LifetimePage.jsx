import { useEffect, useState } from 'react'
import { UploadSimple, Plus, Trash, TrendUp, Calendar, LinkSimple } from '@phosphor-icons/react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import Statistics from '../components/Statistics'
import TextImportModal from '../components/home/modals/TextImportModal'
import { parseLifetimeImportInput } from '../utils/importLifetime'

const LIFETIME_STORAGE_KEY = 'heron_lifetime_stats_v1'

function LifetimePage() {
  const [tournaments, setTournaments] = useState([])
  const [selectedTournament, setSelectedTournament] = useState(null)
  const [teamNumber, setTeamNumber] = useState("")
  const [showTextImport, setShowTextImport] = useState(false)
  const [textInput, setTextInput] = useState("")

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LIFETIME_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.tournaments)) {
        setTournaments(parsed.tournaments)
      }
      if (parsed.teamNumber) {
        setTeamNumber(parsed.teamNumber.toString())
      }
    } catch (e) {
      console.warn('Failed to load lifetime stats from localStorage', e)
    }
  }, [])

  useEffect(() => {
    try {
      if (!tournaments.length && !teamNumber) {
        window.localStorage.removeItem(LIFETIME_STORAGE_KEY)
        return
      }
      const payload = {
        tournaments,
        teamNumber,
      }
      window.localStorage.setItem(LIFETIME_STORAGE_KEY, JSON.stringify(payload))
    } catch (e) {
      console.warn('Failed to save lifetime stats to localStorage', e)
    }
  }, [tournaments, teamNumber])

  const importTournament = (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result)
        
        // Check if it's a single match or a tournament
        if (data.matches) {
          // It's a tournament — filter to only your team's matches
          const tn = (teamNumber || "").toString().trim()
          if (!tn) {
            alert('Please enter your team number above before importing a tournament file.')
            return
          }
          const filteredMatches = (data.matches || []).filter(m => ((m.teamNumber || "").toString().trim()) === tn)
          if (filteredMatches.length === 0) {
            alert('No matches found for your team number in this tournament file.')
            return
          }
          const filteredTournament = { ...data, matches: filteredMatches }
          setTournaments(prev => [...prev, filteredTournament].sort((a, b) => new Date(a.date) - new Date(b.date)))
        } else if (data.events) {
          // It's a single match - wrap it in a tournament structure
          const matchDate = new Date(data.startTime).toISOString().split('T')[0]
          const tournament = {
            name: `Match on ${new Date(data.startTime).toLocaleString()}`,
            date: matchDate,
            matches: [data]
          }
          setTournaments(prev => [...prev, tournament].sort((a, b) => new Date(a.date) - new Date(b.date)))
        } else {
          alert('Invalid file format. Please upload a tournament or match JSON file.')
        }
      } catch {
        alert('Error loading file. Please ensure it is a valid JSON file.')
      }
    }
    reader.readAsText(file)
  }

  const importFromText = async () => {
    const tn = (teamNumber || "").toString().trim()

    try {
      const payloads = await parseLifetimeImportInput(textInput)
      if (!payloads.length) {
        alert('No valid matches or tournaments found in the pasted text or links.')
        return
      }

      const next = [...tournaments]

      for (const data of payloads) {
        if (data.matches) {
          if (!tn) {
            alert('Please enter your team number above before importing a tournament.')
            return
          }
          const filteredMatches = (data.matches || []).filter(m => ((m.teamNumber || "").toString().trim()) === tn)
          if (!filteredMatches.length) continue
          next.push({ ...data, matches: filteredMatches })
        } else if (data.events) {
          const matchDate = new Date(data.startTime).toISOString().split('T')[0]
          next.push({
            name: `Match on ${new Date(data.startTime).toLocaleString()}`,
            date: matchDate,
            matches: [data]
          })
        }
      }

      if (!next.length) {
        alert('No valid matches for your team number were found in the pasted content.')
        return
      }

      const sorted = next.sort((a, b) => new Date(a.date) - new Date(b.date))
      setTournaments(sorted)
      setShowTextImport(false)
      setTextInput("")
    } catch {
      alert('Error importing from text. Please check your links or JSON.')
    }
  }

  const removeTournament = (index) => {
    if (confirm('Remove this tournament from lifetime statistics?')) {
      setTournaments(prev => prev.filter((_, i) => i !== index))
      if (selectedTournament === index) {
        setSelectedTournament(null)
      }
    }
  }

  const allMatches = tournaments.flatMap(t => t.matches)
  
  // Extract individual matches for graphing
  const matchStats = tournaments.flatMap(tournament => 
    tournament.matches.map((match, matchIndex) => {
      const cycleEvents = match.events.filter(e => e.type === 'cycle')
      const scored = cycleEvents.reduce((sum, e) => sum + e.scored, 0)
      const total = cycleEvents.reduce((sum, e) => sum + e.total, 0)
      
      // Calculate cycle times for this match
      const cycleTimes = []
      let lastEventTime = 0
      match.events.forEach(event => {
        if (event.type === 'cycle') {
          const timeDiff = event.timestamp - lastEventTime
          if (timeDiff > 0) {
            cycleTimes.push(timeDiff / 1000)
          }
        }
        lastEventTime = event.timestamp
      })
      
      const avgCycleTime = cycleTimes.length > 0 
        ? cycleTimes.reduce((sum, t) => sum + t, 0) / cycleTimes.length
        : 0
      
      const matchDate = new Date(match.startTime)
      
      return {
        name: tournament.matches.length > 1 
          ? `${tournament.name} - Match ${matchIndex + 1}`
          : tournament.name,
        tournamentName: tournament.name,
        date: matchDate.toISOString(),
        scored,
        total,
        accuracy: total > 0 ? (scored / total * 100) : 0,
        avgCycleTime
      }
    })
  ).sort((a, b) => new Date(a.date) - new Date(b.date))
  
  // Also keep tournament-level stats for the list view
  const tournamentStats = tournaments.map(tournament => {
    const tEvents = tournament.matches.flatMap(m => m.events).filter(e => e.type === 'cycle')
    const scored = tEvents.reduce((sum, e) => sum + e.scored, 0)
    const total = tEvents.reduce((sum, e) => sum + e.total, 0)
    
    // Calculate cycle times correctly across all matches in tournament
    const cycleTimes = []
    tournament.matches.forEach(match => {
      let lastEventTime = 0
      match.events.forEach(event => {
        if (event.type === 'cycle') {
          const timeDiff = event.timestamp - lastEventTime;
          if (timeDiff > 0) {
            cycleTimes.push(timeDiff / 1000);
          }
        }
        lastEventTime = event.timestamp;
      })
    })
    
    const avgCycleTime = cycleTimes.length > 0 
      ? cycleTimes.reduce((sum, t) => sum + t, 0) / cycleTimes.length
      : 0
    
    return {
      name: tournament.name,
      date: tournament.date,
      matchCount: tournament.matches.length,
      scored,
      total,
      accuracy: total > 0 ? (scored / total * 100) : 0,
      avgCycleTime
    }
  })

  return (
    <div className="min-h-screen p-3 sm:p-5 max-w-7xl mx-auto">
      <div className="my-6 sm:my-8 flex items-center justify-between">
        <h1 className="text-3xl sm:text-5xl font-bold">Lifetime Statistics</h1>
      </div>

      {/* Upload Section */}
      <div className="bg-white border-2 border-[#445f8b] p-4 sm:p-6 mb-8">
        <h2 className="text-2xl sm:text-3xl mb-4">Upload</h2>
        <div className="flex flex-col sm:flex-row gap-4 items-center mb-4">
          <label className="flex items-center gap-2 font-semibold">
            Your Team #:
            <input
              type="number"
              value={teamNumber}
              onChange={(e) => setTeamNumber(e.target.value)}
              placeholder="1234"
              className="px-3 py-2 border-2 border-[#ddd] focus:border-[#445f8b] outline-none w-32 text-center font-mono"
              min="1"
            />
          </label>
        </div>
        <label className="btn">
          <Plus weight="bold" size={20} />
          Upload Tournament or Match
          <input type="file" accept=".json" onChange={importTournament} className="hidden" />
        </label>
        <button
          type="button"
          className="btn ml-0 sm:ml-4 mt-3 sm:mt-0 flex items-center gap-2"
          onClick={() => setShowTextImport(true)}
        >
          <LinkSimple weight="bold" size={20} />
          Import text or links
        </button>
        <p className="text-sm text-[#666] mt-3">
          Upload your tournament JSONs and we'll keep only the matches for your team number above. You can also upload single match files or paste match links and text.
        </p>
      </div>

      {tournaments.length === 0 ? (
        <div className="bg-white border-2 border-[#445f8b] p-8 sm:p-16 text-center">
          <UploadSimple size={64} weight="light" className="mx-auto mb-4 text-[#445f8b]" />
          <p className="text-xl">No uploads yet. Upload your first tournament or match and it'll show up here 👀</p>
        </div>
      ) : (
        <>
          {/* Career Summary */}
          <div className="mb-8">
            <Statistics matches={allMatches} />
          </div>

          {/* Progression Chart */}
          <div className="bg-white border-2 border-[#445f8b] p-4 sm:p-6 mb-8">
            <h2 className="text-3xl mb-5 flex items-center gap-3">
              <TrendUp weight="bold" size={32} />
              Progression
            </h2>

            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-3">Accuracy Over Time</h3>
              <div className="h-80 border-2 border-[#ddd] bg-white">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart 
                    data={matchStats.map((stat, i) => ({
                      ...stat,
                      index: i,
                      dateLabel: new Date(stat.date).toLocaleString('en-US')
                    }))}
                    margin={{ top: 20, right: 20, left: 10, bottom: 20 }}
                  >
                    <CartesianGrid stroke="#e5e7eb" strokeDasharray="0" />
                    <XAxis 
                      dataKey="dateLabel" 
                      stroke="#666"
                      style={{ fontSize: '12px', fontFamily: 'League Spartan' }}
                      interval="preserveStartEnd"
                      minTickGap={20}
                      angle={-35}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis 
                      domain={[0, 100]}
                      stroke="#666"
                      style={{ fontSize: '12px', fontFamily: 'League Spartan' }}
                      tickFormatter={(val) => `${val}%`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '2px solid #445f8b',
                        fontFamily: 'League Spartan'
                      }}
                      formatter={(value) => [`${value.toFixed(1)}%`, 'Accuracy']}
                      labelFormatter={(label, payload) => payload[0]?.payload.name}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="accuracy" 
                      stroke="#445f8b" 
                      strokeWidth={2}
                      dot={{ fill: '#445f8b', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3">Average Cycle Time Over Time</h3>
              <div className="h-80 border-2 border-[#ddd] bg-white">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart 
                    data={matchStats.map((stat, i) => ({
                      ...stat,
                      index: i,
                      dateLabel: new Date(stat.date).toLocaleString()
                    }))}
                    margin={{ top: 20, right: 20, left: 10, bottom: 20 }}
                  >
                    <CartesianGrid stroke="#e5e7eb" strokeDasharray="0" />
                    <XAxis 
                      dataKey="dateLabel" 
                      stroke="#666"
                      style={{ fontSize: '12px', fontFamily: 'League Spartan' }}
                      interval="preserveStartEnd"
                      minTickGap={20}
                      angle={-35}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis 
                      stroke="#666"
                      style={{ fontSize: '12px', fontFamily: 'League Spartan' }}
                      tickFormatter={(val) => `${val}s`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '2px solid #445f8b',
                        fontFamily: 'League Spartan'
                      }}
                      formatter={(value) => [`${value.toFixed(1)}s`, 'Avg Cycle Time']}
                      labelFormatter={(label, payload) => payload[0]?.payload.name}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="avgCycleTime" 
                      stroke="#445f8b" 
                      strokeWidth={2}
                      dot={{ fill: '#445f8b', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Tournament List */}
          <div className="bg-white border-2 border-[#445f8b] p-4 sm:p-6">
            <h2 className="text-3xl mb-5 flex items-center gap-3">
              <Calendar weight="bold" size={32} />
              Uploads ({tournaments.length})
            </h2>
            <div className="space-y-4">
              {tournaments.map((tournament, index) => {
                const stat = tournamentStats[index]
                return (
                  <div 
                    key={index} 
                    className={`border-2 p-4 cursor-pointer transition-colors ${
                      selectedTournament === index 
                        ? 'border-[#445f8b] bg-[#f0f5ff]' 
                        : 'border-[#ddd] hover:border-[#445f8b]'
                    }`}
                    onClick={() => setSelectedTournament(selectedTournament === index ? null : index)}
                  >
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                      <div>
                        <h3 className="text-2xl font-bold">{tournament.name}</h3>
                        <p className="text-[#666] mb-3">{new Date(tournament.date).toLocaleDateString()}</p>
                        <div className="flex flex-wrap gap-3 text-xs sm:text-sm">
                          <span><strong>{stat.matchCount}</strong> match{stat.matchCount !== 1 ? 'es' : ''}</span>
                          <span><strong>{stat.scored}/{stat.total}</strong> scored</span>
                          <span><strong>{stat.accuracy.toFixed(1)}%</strong> accuracy</span>
                          <span><strong>{stat.avgCycleTime.toFixed(1)}s</strong> avg cycle</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removeTournament(index)
                        }}
                        className="btn error-btn !py-1 !px-3 !text-sm"
                      >
                        <Trash weight="bold" size={16} />
                      </button>
                    </div>
                    
                    {selectedTournament === index && (
                      <div className="mt-6 pt-6 border-t-2 border-[#ddd]">
                        <h4 className="text-xl font-semibold mb-4">Tournament Details</h4>
                        <Statistics matches={tournament.matches} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      <TextImportModal
        open={showTextImport}
        textInput={textInput}
        setTextInput={setTextInput}
        onImport={importFromText}
        onClose={() => setShowTextImport(false)}
      />
    </div>
  )
}

export default LifetimePage
