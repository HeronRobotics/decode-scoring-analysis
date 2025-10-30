import { useTournament } from '../../data/TournamentContext'

function TeamSummaryGrid({ teamStats }) {
  const { hoveredTeam, setHoveredTeam } = useTournament();

  return (
    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
      {teamStats.map(ts => {
        const isHovered = hoveredTeam === ts.team
        return (
          <div onMouseEnter={() => setHoveredTeam(ts.team)} onMouseLeave={() => setHoveredTeam(null)} key={ts.team} className={`p-3 border-2 ${isHovered ? 'ring-2 ring-[#445f8b] bg-[#f0f5ff]' : 'border-[#eee]'}`}>
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
  )
}

export default TeamSummaryGrid