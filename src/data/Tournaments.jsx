import { useState } from 'react'

export const useLifetimeStats = () => {
  const [tournaments, setTournaments] = useState([])
  const [selectedTournament, setSelectedTournament] = useState(null)

  const addTournament = (tournamentData) => {
    if (tournamentData.matches) {
      setTournaments(prev => [...prev, tournamentData].sort((a, b) => new Date(a.date) - new Date(b.date)))
    } else if (tournamentData.events) {
      const matchDate = new Date(tournamentData.startTime).toISOString().split('T')[0]
      const tournament = {
        name: `Match on ${new Date(tournamentData.startTime).toLocaleString()}`,
        date: matchDate,
        matches: [tournamentData]
      }
      setTournaments(prev => [...prev, tournament].sort((a, b) => new Date(a.date) - new Date(b.date)))
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

  return {
    tournaments,
    selectedTournament,
    setSelectedTournament,
    addTournament,
    removeTournament
  }
}