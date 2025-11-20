import { useState } from 'react'
import { ArrowLeft, FloppyDisk } from '@phosphor-icons/react'
import { useTournament } from '../data/TournamentContext'
import TournamentLanding from './TournamentLanding'
import TournamentCreator from './TournamentCreator'
import TeamChart from '../components/tournament/TeamChart'
import TeamLegend from '../components/tournament/TeamLegend'
import TeamSummaryGrid from '../components/tournament/TeamSummaryGrid'
import TournamentGraphs from '../components/tournament/TournamentGraphs'
import Statistics from '../components/Statistics'
import Timeline from '../components/Timeline'
import { calculateMatchStats, matchScoredOutOfTotal, teamStatsFromTournament } from '../utils/stats'


function TournamentPage({ onBack }) {
  const {
    tournament,
    setTournament,
    selectedMatch,
    setSelectedMatch,
    selectedTeam,
    setSelectedTeam
  } = useTournament()
  
  const [isCreating, setIsCreating] = useState(false)

  const handleCreateNew = () => setIsCreating(true)
  const handleLoadExisting = (data) => setTournament(data)
  const handleTournamentCreated = (newTournament) => {
    setTournament(newTournament)
    setIsCreating(false)
  }

  const saveTournament = () => {
    const blob = new Blob([JSON.stringify(tournament, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `tournament-${tournament.name.replace(/\s+/g, '-')}-${tournament.date}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isCreating) {
    return (
      <TournamentCreator
        onBack={() => setIsCreating(false)}
        onTournamentCreated={handleTournamentCreated}
      />
    )
  }

  if (!tournament) {
    return (
      <TournamentLanding
        onCreateNew={handleCreateNew}
        onLoadExisting={handleLoadExisting}
        onBack={onBack}
      />
    )
  }

  const teams = Array.from(new Set(
    tournament.matches
      .map(m => (m.teamNumber || '').toString().trim())
      .filter(Boolean)
  ))

  const filteredMatches = selectedTeam 
    ? tournament.matches.filter(m => (m.teamNumber || '').toString().trim() === selectedTeam)
    : tournament.matches

  const currentMatch = filteredMatches[selectedMatch];

  const teamStats = teamStatsFromTournament(tournament);
  const palette = ['#445f8b', '#2d3e5c', '#7a93c2', '#9fb0df', '#ff7f50', '#6aa84f', '#f1c232', '#8e7cc3', '#d9534f', '#5bc0de'];
  const teamColors = teamStats.reduce((acc, ts, i) => { 
    acc[ts.team] = palette[i % palette.length];
    return acc;
  }, {});

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
          <button onClick={onBack} className="btn">
            <ArrowLeft size={20} weight="bold" />
            Back
          </button>
        </div>
      </div>

      <div className="mb-18">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <h2 className="text-3xl">Tournament Summary</h2>
        </div>

        <div className="bg-white p-6 border-2 border-[#445f8b] mt-5">
          <h3 className="text-xl font-semibold mb-3">Match Scores — All Teams</h3>
          <div className="mb-2 text-sm text-[#666]">Sorted by median scored (highest first). Hover teams for score distributions.</div>
          
          <TeamLegend teamStats={teamStats} teamColors={teamColors} />
          <TeamChart matchesOrdered={tournament.matches} teamStats={teamStats} teamColors={teamColors} />
          <TeamSummaryGrid teamStats={teamStats} />
          <p className="mt-4 italic text-sm text-[#666]">^ Hover over a box above!</p>
        </div>

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mt-18">
          <h2 className="text-3xl">Team Statistics</h2>
          {teams.length > 0 && (
            <div className="flex items-center gap-3 mt-4">
              <label className="font-semibold">Selected Team:</label>
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
        <div className="bg-white p-6 border-2 border-[#445f8b] mt-8">
          <h3 className="text-xl font-semibold mb-3">Team Statistics</h3>
          <div className={`mt-5 ${selectedTeam && 'mb-5'}`}>
            <p className="text-[#666]">Select a team to view detailed graphs for that team.</p>
          </div>

          {selectedTeam && (
            <TournamentGraphs matches={filteredMatches} />
          )}
      </div>
      </div>

      <div className='w-full flex flex-col items-start p-8 bg-[#f0f5fd]'>
        <h2 className='mb-8'>
          <span className="text-3xl mb-5">{selectedTeam ? "Team " + selectedTeam + "'s Matches" : "All Tournament Matches"}</span>
        </h2>
        
        <div className="w-full bg-white border-2 border-[#445f8b] p-6 mb-8">
          <h3 className="text-2xl mb-4">Select Match ({filteredMatches.length} total)</h3>
          <div className="flex gap-3 flex-wrap">
            {filteredMatches.map((_, index) => {
              const matchStats = matchScoredOutOfTotal(filteredMatches[index]);
              return (
                <button
                  key={index}
                  onClick={() => setSelectedMatch(index)}
                  className={`px-6 py-3 border-2 font-semibold transition-colors ${
                    selectedMatch === index
                      ? 'border-[#445f8b] bg-[#445f8b] text-white'
                    : 'border-[#ddd] bg-white hover:border-[#445f8b]'
                }`}
              >
                Match {index + 1} ({filteredMatches[index].teamNumber || 'No Team'}) <span className={`ml-3 text-xs text-[#666] ${selectedMatch == index ? "text-[#ddd]" : ""}`}>{matchStats.scored}/{matchStats.total}</span>
              </button>
            )})}
          </div>
        </div>

        <div className="w-full mb-8">
          {currentMatch ? (
            <>
              <Statistics events={currentMatch.events} teamNumber={currentMatch.teamNumber} notes={currentMatch.notes} />
              <Timeline
                events={currentMatch.events} 
                currentTime={currentMatch.events[currentMatch.events.length - 1]?.timestamp || 0} 
              />
            </>
          ) : (
            <div className="bg-white border-2 border-[#445f8b] p-6 text-center text-[#666]">
              No matches for selected team.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TournamentPage