import { Calendar, Trash } from '@phosphor-icons/react'
import Statistics from '../Statistics'

function TournamentList({ tournaments, tournamentStats, selectedTournament, setSelectedTournament, removeTournament }) {
  return (
    <div className="bg-brand-bg border-2 border-brand-border p-6">
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
                  ? 'border-brand-accent bg-brand-accentBg' 
                  : 'border-brand-border hover:border-brand-accent'
              }`}
              onClick={() => setSelectedTournament(selectedTournament === index ? null : index)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-bold">{tournament.name}</h3>
                  <p className="text-brand-muted mb-3">{new Date(tournament.date).toLocaleDateString()}</p>
                  <div className="flex gap-6 text-sm">
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
                <div className="mt-6 pt-6 border-t-2 border-brand-border">
                  <Statistics matches={tournament.matches} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default TournamentList