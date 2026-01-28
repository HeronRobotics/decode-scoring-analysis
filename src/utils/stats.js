export const calculateCycleTimes = (events, matches = null) => {
  const cycleTimes = []
  
  if (matches) {
    // Process each match separately to avoid times spanning across matches
    matches.forEach(match => {
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
    })
  } else {
    // Single match or continuous event list
    let lastEventTime = 0
    events.forEach((event) => {
      if (event.type === 'cycle') {
        const timeDiff = event.timestamp - lastEventTime
        if (timeDiff > 0) {
          cycleTimes.push(timeDiff / 1000)
        }
      }
      lastEventTime = event.timestamp
    })
  }

  return cycleTimes
}

export const calculateStats = (arr) => {
  if (arr.length === 0) return { avg: 0, std: 0, min: 0, max: 0 }

  const avg = arr.reduce((a, b) => a + b, 0) / arr.length
  const variance = arr.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / arr.length
  const std = Math.sqrt(variance)
  const min = Math.min(...arr)
  const max = Math.max(...arr)

  return { avg, std, min, max }
}

export const calculateTournamentStats = (tournament) => {
  const allEvents = tournament.matches.flatMap(m => m.events)
  const tEvents = allEvents.filter(e => e.type === 'cycle')
  const scored = tEvents.reduce((sum, e) => sum + e.scored, 0)
  const total = tEvents.reduce((sum, e) => sum + e.total, 0)
  
  // Calculate cycle times correctly across all matches in tournament
  const cycleTimes = []
  tournament.matches.forEach(match => {
    let lastEventTime = 0
    match.events.forEach(event => {
      if (event.type === 'cycle') {
        const timeDiff = event.timestamp - lastEventTime
        if (timeDiff > 0) {
          cycleTimes.push(timeDiff / 1000) // Convert to seconds
        }
      }
      lastEventTime = event.timestamp
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
}

export const calculateMatchStats = (tournaments) => {
  return tournaments.flatMap(tournament => 
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
        date: matchDate,
        scored,
        total,
        accuracy: total > 0 ? (scored / total * 100) : 0,
        avgCycleTime,
        tournament: tournament.name
      }
    })
  )
}

export const teamStatsFromTournament = (tournament) => {
  if (!tournament || !tournament.matches || tournament.matches.length === 0) {
    return []
  }

  const teams = Array.from(new Set(
    tournament.matches
      .map(m => (m.teamNumber || '').toString().trim())
      .filter(Boolean)
  ))

  if (teams.length === 0) {
    return []
  }

  const getMatchTime = (m) => {
    if (m.startTime) return new Date(m.startTime).getTime()
    if (m.events && m.events.length > 0) return m.events[0].timestamp
    return 0
  }

  const matchesOrdered = tournament.matches.slice().sort((a, b) => getMatchTime(a) - getMatchTime(b))

  return teams.map(team => {
    const scores = matchesOrdered.map(m => {
      const teamNum = (m.teamNumber || '').toString().trim()
      if (teamNum !== team) return null
      const cycleEvents = m.events.filter(e => e.type === 'cycle')
      return cycleEvents.reduce((sum, e) => sum + e.scored, 0)
    })

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

    // Calculate points per match (for full matches)
    // Import calculateTotalPoints dynamically since this is a utility file
    const teamMatches = matchesOrdered.filter(m => (m.teamNumber || '').toString().trim() === team)
    const pointsArray = teamMatches.map(m => {
      // Check if match has duration (full matches are 158 seconds)
      const isFullMatch = m.duration && Math.abs(m.duration - 158) <= 10
      if (!isFullMatch) return null

      // Calculate points for this match
      const cycleEvents = m.events.filter(e => e.type === 'cycle')
      const artifactPoints = cycleEvents.reduce((sum, e) => sum + e.scored, 0) * 3

      // Motif points
      let motifPoints = 0
      if (m.motif) {
        const getTargetPattern = (motif) => motif ? motif.repeat(3) : ''
        const calculateMatches = (pattern, target) => {
          if (!pattern || !target) return 0
          let matches = 0
          const len = Math.min(pattern.length, target.length)
          for (let i = 0; i < len; i++) {
            if (pattern[i] === target[i]) matches++
          }
          return matches
        }
        const target = getTargetPattern(m.motif)
        const autoMatches = calculateMatches(m.autoPattern || '', target)
        const teleopMatches = calculateMatches(m.teleopPattern || '', target)
        motifPoints = (autoMatches + teleopMatches) * 2
      }

      // Leave and park points
      const leavePoints = m.autoLeave ? 3 : 0
      const parkPoints = m.teleopPark === 'partial' ? 5 : m.teleopPark === 'full' ? 10 : 0

      return artifactPoints + motifPoints + leavePoints + parkPoints
    }).filter(p => p !== null)

    const avgPoints = pointsArray.length > 0 ? pointsArray.reduce((a,b)=>a+b,0) / pointsArray.length : 0

    return {
      team,
      scores,
      median,
      avg,
      totalScored,
      totalBalls,
      accuracy,
      avgPoints,
      fullMatchCount: pointsArray.length
    }
  }).sort((a,b) => b.median - a.median)
}

export const matchScoredOutOfTotal = (match) => {
  const cycleEvents = match.events.filter(e => e.type === 'cycle')
  const scored = cycleEvents.reduce((sum, e) => sum + e.scored, 0)
  const total = cycleEvents.reduce((sum, e) => sum + e.total, 0)
  return { scored, total }
}