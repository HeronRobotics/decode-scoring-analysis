import { useTournament } from '../../data/TournamentContext'
import TeamName from '../TeamName'

function TeamSummaryGrid({ teamStats }) {
  const { hoveredTeam, setHoveredTeam } = useTournament();

  return (
    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
      {teamStats.map(ts => {
        const isHovered = hoveredTeam === ts.team
        return (
          <div onMouseEnter={() => setHoveredTeam(ts.team)} onMouseLeave={() => setHoveredTeam(null)} key={ts.team} className={`p-3 border-2 ${isHovered ? 'ring-2 ring-[#445f8b] bg-[#f0f5ff]' : 'border-[#eee]'}`}>
            <div className="flex items-baseline justify-between mb-2">
              <div className="font-semibold">
                <TeamName teamNumber={ts.team} />
              </div>
              <div className="text-sm text-[#6b7c95]">Median: <strong>{ts.median}</strong></div>
            </div>
            <div className="text-sm text-[#6b7c95] space-y-1">
              <div>Avg: <strong>{ts.avg.toFixed(1)}</strong> • Accuracy: <strong>{ts.accuracy.toFixed(1)}%</strong></div>
              {ts.fullMatchCount > 0 && (
                <div className="text-[#445f8b]">
                  Avg Points: <strong>{ts.avgPoints.toFixed(1)}</strong> ({ts.fullMatchCount} full match{ts.fullMatchCount !== 1 ? 'es' : ''})
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default TeamSummaryGrid