import { useTournament } from '../../data/TournamentContext'

function TeamLegend({ teamStats, teamColors }) {
  const { visibleTeams, setVisibleTeams } = useTournament()

  const toggleTeam = (team) => {
    setVisibleTeams(prev => ({ ...prev, [team]: prev[team] === false ? true : false }))
  }

  return (
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
  )
}

export default TeamLegend