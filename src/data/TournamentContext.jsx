import { createContext, useContext, useState } from 'react'

const TournamentContext = createContext()

export const useTournament = () => {
  const context = useContext(TournamentContext)
  if (!context) {
    throw new Error('useTournament must be used within a TournamentProvider')
  }
  return context
}

export const TournamentProvider = ({ children }) => {
  const [tournament, setTournament] = useState(null)
  const [selectedMatch, setSelectedMatch] = useState(0)
  const [selectedTeam, setSelectedTeam] = useState('')
  const [visibleTeams, setVisibleTeams] = useState({})
  const [hoveredTeam, setHoveredTeam] = useState(null)

  const value = {
    tournament,
    setTournament,
    selectedMatch,
    setSelectedMatch,
    selectedTeam,
    setSelectedTeam,
    visibleTeams,
    setVisibleTeams,
    hoveredTeam,
    setHoveredTeam
  }

  return (
    <TournamentContext.Provider value={value}>
      {children}
    </TournamentContext.Provider>
  )
}