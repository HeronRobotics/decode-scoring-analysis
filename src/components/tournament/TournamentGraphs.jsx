import { ChartLine, Target, Clock } from '@phosphor-icons/react'
import { calculateCycleTimes } from '../../utils/stats.js'

function TournamentGraphs({ events, matches, numMatches }) {
  const allEvents = matches ? matches.flatMap(m => m.events) : events
  const cycleEvents = allEvents.filter(e => e.type === 'cycle')
  
  if (cycleEvents.length === 0) {
    return (
      <div className="bg-white border-2 border-[#445f8b] p-8 text-center">
        <p className="text-lg text-[#666]">No cycle data available for graphs</p>
      </div>
    )
  }

  const totalScored = cycleEvents.reduce((sum, e) => sum + e.scored, 0)
  const totalBalls = cycleEvents.reduce((sum, e) => sum + e.total, 0)
  const overallAccuracy = totalBalls > 0 ? (totalScored / totalBalls * 100) : 0

  const cycleTimes = calculateCycleTimes(allEvents, matches)
  const avgCycleTime = cycleTimes.length > 0 
    ? cycleTimes.reduce((sum, t) => sum + t, 0) / cycleTimes.length 
    : 0

  const matchCount = matches ? matches.length : numMatches
  const avgBallsPerMatch = totalBalls / matchCount

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border-2 border-[#445f8b] p-6">
          <div className="flex items-center gap-3 mb-3">
            <Target weight="bold" size={28} className="text-[#445f8b]" />
            <h3 className="text-2xl font-bold">Accuracy</h3>
          </div>
          <p className="text-4xl sm:text-5xl font-bold text-[#445f8b]">{overallAccuracy.toFixed(1)}%</p>
          <p className="text-sm text-[#666] mt-2">{totalScored}/{totalBalls} balls scored</p>
        </div>

        <div className="bg-white border-2 border-[#445f8b] p-6">
          <div className="flex items-center gap-3 mb-3">
            <Clock weight="bold" size={28} className="text-[#445f8b]" />
            <h3 className="text-2xl font-bold">Avg Cycle Time</h3>
          </div>
          <p className="text-4xl sm:text-5xl font-bold text-[#445f8b]">{avgCycleTime.toFixed(1)}s</p>
          <p className="text-sm text-[#666] mt-2">{cycleTimes.length} cycles measured</p>
        </div>

        <div className="bg-white border-2 border-[#445f8b] p-6">
          <div className="flex items-center gap-3 mb-3">
            <ChartLine weight="bold" size={28} className="text-[#445f8b]" />
            <h3 className="text-2xl font-bold">Avg Balls Per Match</h3>
          </div>
          <p className="text-4xl sm:text-5xl font-bold text-[#445f8b]">{avgBallsPerMatch.toFixed(1)}</p>
          <p className="text-sm text-[#666] mt-2">Balls attempted, across all matches</p>
        </div>
      </div>

      {/* Distribution Graphs */}
      <div className="bg-white border-2 border-[#445f8b] p-6">
        <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
          <ChartLine weight="bold" size={28} className="text-[#445f8b]" />
          Scoring Distribution
        </h3>

        <div className="mb-8">
          <h4 className="text-xl font-semibold mb-8">Balls Scored Per Cycle</h4>
          <div className="flex items-end gap-2 h-48">
            {[0, 1, 2, 3].map(count => {
              const cyclesWithCount = cycleEvents.filter(e => e.scored === count).length
              const percentage = cycleEvents.length > 0 ? (cyclesWithCount / cycleEvents.length * 100) : 0
              const displayPercent = cyclesWithCount > 0 ? Math.max(percentage, 3) : 0
              const showLabelInside = displayPercent >= 18

              return (
                <div key={count} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex flex-col justify-end items-center relative" style={{ height: '160px' }}>
                    {cyclesWithCount > 0 && !showLabelInside && (
                      <div className="absolute bottom-1 z-10">
                        <span className="bg-[#445f8b] font-bold text-sm text-white flex justify-center items-center px-2 sm:px-6 py-0.5 rounded max-w-full">
                          {cyclesWithCount}
                        </span>
                      </div>
                    )}

                    {cyclesWithCount === 0 ? (
                      <div className="w-full h-1 bg-gray-100 rounded" />
                    ) : (
                      <div
                        className="w-full bg-[#445f8b] flex items-end justify-center pb-2 transition-all rounded"
                        style={{ height: `${displayPercent}%`, minHeight: '6px' }}
                      >
                        {showLabelInside && (
                          <span className="text-white font-bold text-sm">{cyclesWithCount}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="text-center">
                    <p className="font-bold text-base sm:text-lg">{count} ball{count !== 1 ? 's' : ''}</p>
                    <p className="text-sm text-[#666]">{percentage.toFixed(0)}%</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div>
          <h4 className="text-xl font-semibold mb-8">Cycle Time Distribution</h4>
          <div className="flex items-end gap-2 h-48">
            {['0-10s', '10-20s', '20-30s', '30s+'].map((range, idx) => {
              let count = 0
              if (idx === 0) count = cycleTimes.filter(t => t < 10).length
              else if (idx === 1) count = cycleTimes.filter(t => t >= 10 && t < 20).length
              else if (idx === 2) count = cycleTimes.filter(t => t >= 20 && t < 30).length
              else count = cycleTimes.filter(t => t >= 30).length
              
              const percentage = cycleTimes.length > 0 ? (count / cycleTimes.length * 100) : 0
              const displayPercent = count > 0 ? Math.max(percentage, 3) : 0
              const showLabelInside = displayPercent >= 18
              
              return (
                <div key={range} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex flex-col justify-end items-center relative" style={{ height: '160px' }}>
                    {count > 0 && !showLabelInside && (
                      <div className="absolute bottom-1 z-10">
                        <span className="bg-[#445f8b] font-bold text-sm text-white flex justify-center items-center px-2 sm:px-6 py-0.5 rounded max-w-full">
                          {count}
                        </span>
                      </div>
                    )}

                    {count === 0 ? (
                      <div className="w-full h-1 bg-gray-100 rounded" />
                    ) : (
                      <div 
                        className="w-full bg-[#445f8b] flex items-end justify-center pb-2 transition-all rounded"
                        style={{ height: `${displayPercent}%`, minHeight: '6px' }}
                      >
                        {showLabelInside && (
                          <span className="text-white font-bold text-sm">{count}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-base sm:text-lg">{range}</p>
                    <p className="text-sm text-[#666]">{percentage.toFixed(0)}%</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Accuracy breakdown by ball count */}
      <div className="bg-white border-2 border-[#445f8b] p-6">
        <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
          <Target weight="bold" size={28} className="text-[#445f8b]" />
          Accuracy Breakdown
        </h3>
        
        <div className="space-y-4">
          {[1, 2, 3].map(ballCount => {
            const attemptsWithCount = cycleEvents.filter(e => e.total === ballCount)
            const scored = attemptsWithCount.reduce((sum, e) => sum + e.scored, 0)
            const total = attemptsWithCount.reduce((sum, e) => sum + e.total, 0)
            const accuracy = total > 0 ? (scored / total * 100) : 0
            const attempts = attemptsWithCount.length
            
            if (attempts === 0) return null
            
            return (
              <div key={ballCount}>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-lg">{ballCount}-Ball Cycles</span>
                  <span className="text-[#666]">{attempts} attempt{attempts !== 1 ? 's' : ''}</span>
                </div>
                <div className="relative h-8 bg-gray-200">
                  <div 
                    className="absolute top-0 left-0 h-full bg-[#445f8b] flex items-center justify-center transition-all"
                    style={{ width: `${accuracy}%` }}
                  >
                    {accuracy > 15 && (
                      <span className="text-white font-bold text-sm">{accuracy.toFixed(1)}%</span>
                    )}
                  </div>
                  {accuracy <= 15 && accuracy > 0 && (
                    <span className="absolute top-1/2 -translate-y-1/2 left-2 text-[#445f8b] font-bold text-sm">
                      {accuracy.toFixed(1)}%
                    </span>
                  )}
                </div>
                <p className="text-sm text-[#666] mt-1">{scored}/{total} balls scored</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default TournamentGraphs