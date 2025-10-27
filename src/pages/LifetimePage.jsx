import { useState } from 'react'
import { ArrowLeft, UploadSimple, Plus, Trash, ChartLine, TrendUp, Calendar } from '@phosphor-icons/react'
import Statistics from '../components/Statistics'

function LifetimePage({ onBack }) {
  const [tournaments, setTournaments] = useState([])
  const [selectedTournament, setSelectedTournament] = useState(null)

  const importTournament = (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result)
        
        // Check if it's a single match or a tournament
        if (data.matches) {
          // It's a tournament
          setTournaments(prev => [...prev, data].sort((a, b) => new Date(a.date) - new Date(b.date)))
        } else if (data.events) {
          // It's a single match - wrap it in a tournament structure
          const matchDate = new Date(data.startTime).toISOString().split('T')[0]
          const tournament = {
            name: `Match on ${new Date(data.startTime).toLocaleDateString()}`,
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

  const removeTournament = (index) => {
    if (confirm('Remove this tournament from lifetime statistics?')) {
      setTournaments(prev => prev.filter((_, i) => i !== index))
      if (selectedTournament === index) {
        setSelectedTournament(null)
      }
    }
  }

  const allEvents = tournaments.flatMap(t => t.matches.flatMap(m => m.events))
  
  const tournamentStats = tournaments.map(tournament => {
    const tEvents = tournament.matches.flatMap(m => m.events).filter(e => e.type === 'cycle')
    const scored = tEvents.reduce((sum, e) => sum + e.scored, 0)
    const total = tEvents.reduce((sum, e) => sum + e.total, 0)
    const cycleTimes = []
    
    tournament.matches.forEach(match => {
      const cycles = match.events.filter(e => e.type === 'cycle')
      for (let i = 1; i < cycles.length; i++) {
        cycleTimes.push(cycles[i].timestamp - cycles[i - 1].timestamp)
      }
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
    <div className="min-h-screen p-5 max-w-7xl mx-auto">
      <div className="my-8 flex items-center justify-between">
        <h1 className="text-5xl font-bold">Lifetime Statistics</h1>
        <button onClick={onBack} className="btn">
          <ArrowLeft size={20} weight="bold" />
          Back to Home
        </button>
      </div>

      {/* Upload Section */}
      <div className="bg-white border-2 border-[#445f8b] p-6 mb-8">
        <h2 className="text-3xl mb-4">Add Tournament</h2>
        <label className="btn">
          <Plus weight="bold" size={20} />
          Upload Tournament or Match
          <input type="file" accept=".json" onChange={importTournament} className="hidden" />
        </label>
        <p className="text-sm text-[#666] mt-3">
          Upload tournament JSON files or individual match JSON files to track your career progress
        </p>
      </div>

      {tournaments.length === 0 ? (
        <div className="bg-white border-2 border-[#445f8b] p-16 text-center">
          <UploadSimple size={64} weight="light" className="mx-auto mb-4 text-[#445f8b]" />
          <p className="text-xl">No tournaments yet. Upload your first tournament to start tracking!</p>
        </div>
      ) : (
        <>
          {/* Career Summary */}
          <div className="mb-8">
            <h2 className="text-3xl mb-5 flex items-center gap-3">
              <ChartLine weight="bold" size={32} />
              Career Summary
            </h2>
            <Statistics events={allEvents} />
          </div>

          {/* Progression Chart */}
          <div className="bg-white border-2 border-[#445f8b] p-6 mb-8">
            <h2 className="text-3xl mb-5 flex items-center gap-3">
              <TrendUp weight="bold" size={32} />
              Progression
            </h2>
            
            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-3">Accuracy Over Time</h3>
              <div className="relative h-64 border-2 border-[#ddd] p-4">
                <svg className="w-full h-full">
                  {/* Y-axis labels */}
                  {[0, 25, 50, 75, 100].map(val => (
                    <g key={val}>
                      <line 
                        x1="0" 
                        y1={`${100 - val}%`} 
                        x2="100%" 
                        y2={`${100 - val}%`} 
                        stroke="#ddd" 
                        strokeWidth="1"
                      />
                      <text 
                        x="-5" 
                        y={`${100 - val}%`} 
                        textAnchor="end" 
                        dominantBaseline="middle"
                        className="text-xs fill-[#666]"
                      >
                        {val}%
                      </text>
                    </g>
                  ))}
                  
                  {/* Line chart */}
                  {tournamentStats.length > 1 && (
                    <polyline
                      points={tournamentStats.map((stat, i) => {
                        const x = (i / (tournamentStats.length - 1)) * 100
                        const y = 100 - stat.accuracy
                        return `${x}%,${y}%`
                      }).join(' ')}
                      fill="none"
                      stroke="#445f8b"
                      strokeWidth="3"
                    />
                  )}
                  
                  {/* Data points */}
                  {tournamentStats.map((stat, i) => {
                    const x = tournamentStats.length > 1 
                      ? (i / (tournamentStats.length - 1)) * 100 
                      : 50
                    const y = 100 - stat.accuracy
                    return (
                      <circle
                        key={i}
                        cx={`${x}%`}
                        cy={`${y}%`}
                        r="5"
                        fill="#445f8b"
                        className="cursor-pointer hover:fill-[#2d3e5c]"
                        onClick={() => setSelectedTournament(i)}
                      >
                        <title>{stat.name}: {stat.accuracy.toFixed(1)}%</title>
                      </circle>
                    )
                  })}
                </svg>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3">Average Cycle Time Over Time</h3>
              <div className="relative h-64 border-2 border-[#ddd] p-4">
                <svg className="w-full h-full">
                  {/* Y-axis */}
                  {(() => {
                    const maxTime = Math.max(...tournamentStats.map(s => s.avgCycleTime), 30)
                    const step = Math.ceil(maxTime / 4)
                    return [0, step, step * 2, step * 3, step * 4].map(val => (
                      <g key={val}>
                        <line 
                          x1="0" 
                          y1={`${100 - (val / maxTime * 100)}%`} 
                          x2="100%" 
                          y2={`${100 - (val / maxTime * 100)}%`} 
                          stroke="#ddd" 
                          strokeWidth="1"
                        />
                        <text 
                          x="-5" 
                          y={`${100 - (val / maxTime * 100)}%`} 
                          textAnchor="end" 
                          dominantBaseline="middle"
                          className="text-xs fill-[#666]"
                        >
                          {val}s
                        </text>
                      </g>
                    ))
                  })()}
                  
                  {/* Line chart */}
                  {tournamentStats.length > 1 && (() => {
                    const maxTime = Math.max(...tournamentStats.map(s => s.avgCycleTime), 30)
                    return (
                      <polyline
                        points={tournamentStats.map((stat, i) => {
                          const x = (i / (tournamentStats.length - 1)) * 100
                          const y = 100 - (stat.avgCycleTime / maxTime * 100)
                          return `${x}%,${y}%`
                        }).join(' ')}
                        fill="none"
                        stroke="#445f8b"
                        strokeWidth="3"
                      />
                    )
                  })()}
                  
                  {/* Data points */}
                  {(() => {
                    const maxTime = Math.max(...tournamentStats.map(s => s.avgCycleTime), 30)
                    return tournamentStats.map((stat, i) => {
                      const x = tournamentStats.length > 1 
                        ? (i / (tournamentStats.length - 1)) * 100 
                        : 50
                      const y = 100 - (stat.avgCycleTime / maxTime * 100)
                      return (
                        <circle
                          key={i}
                          cx={`${x}%`}
                          cy={`${y}%`}
                          r="5"
                          fill="#445f8b"
                          className="cursor-pointer hover:fill-[#2d3e5c]"
                          onClick={() => setSelectedTournament(i)}
                        >
                          <title>{stat.name}: {stat.avgCycleTime.toFixed(1)}s</title>
                        </circle>
                      )
                    })
                  })()}
                </svg>
              </div>
            </div>
          </div>

          {/* Tournament List */}
          <div className="bg-white border-2 border-[#445f8b] p-6">
            <h2 className="text-3xl mb-5 flex items-center gap-3">
              <Calendar weight="bold" size={32} />
              Tournaments ({tournaments.length})
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
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-2xl font-bold">{tournament.name}</h3>
                        <p className="text-[#666] mb-3">{new Date(tournament.date).toLocaleDateString()}</p>
                        <div className="flex gap-6 text-sm">
                          <span><strong>{stat.matchCount}</strong> matches</span>
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
                        className="error-btn"
                      >
                        <Trash weight="bold" size={16} />
                      </button>
                    </div>
                    
                    {selectedTournament === index && (
                      <div className="mt-6 pt-6 border-t-2 border-[#ddd]">
                        <h4 className="text-xl font-semibold mb-4">Tournament Details</h4>
                        <Statistics events={tournament.matches.flatMap(m => m.events)} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default LifetimePage
