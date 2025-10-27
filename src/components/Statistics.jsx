import { ChartLine, Target, Clock, ListNumbers, ArrowsDownUp, Crosshair } from '@phosphor-icons/react'

function Statistics({ events }) {
  const cycleEvents = events.filter(e => e.type === 'cycle')
  
  if (cycleEvents.length === 0) {
    return null
  }

  // Calculate cycle times
  const cycleTimes = []
  let lastEventTime = 0
  
  events.forEach((event) => {
    if (event.type === 'cycle') {
      const cycleTime = (event.timestamp - lastEventTime) / 1000 // in seconds
      cycleTimes.push(cycleTime)
    }
    lastEventTime = event.timestamp
  })

  // Calculate statistics
  const calcStats = (arr) => {
    if (arr.length === 0) return { avg: 0, std: 0, min: 0, max: 0 }
    
    const avg = arr.reduce((a, b) => a + b, 0) / arr.length
    const variance = arr.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / arr.length
    const std = Math.sqrt(variance)
    const min = Math.min(...arr)
    const max = Math.max(...arr)
    
    return { avg, std, min, max }
  }

  const timeStats = calcStats(cycleTimes)
  const totalBalls = cycleEvents.map(e => e.total)
  const scoredBalls = cycleEvents.map(e => e.scored)
  const accuracy = cycleEvents.map(e => e.total > 0 ? (e.scored / e.total) * 100 : 0)
  
  const ballStats = calcStats(scoredBalls)
  const accuracyStats = calcStats(accuracy)

  const formatStat = (val, decimals = 2) => {
    return isNaN(val) ? '0.00' : val.toFixed(decimals)
  }

  return (
    <div className="mb-8 w-full">
      <h3 className="text-2xl mb-5">Statistics</h3>
      
      {/* Summary Section - Most Important */}
      <div className="bg-[#445f8b] border-2 border-[#445f8b] p-8 mb-5">
        <div className="flex items-center gap-3 mb-6 ml-[-1rem] mt-[-1rem]">
          <ChartLine size={32} className="text-white" />
          <h4 className="text-2xl !text-white">Summary</h4>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-white">{cycleEvents.length}</div>
            <div className="text-white/70 text-sm mb-1 flex items-center justify-center gap-1">
              <ListNumbers size={16} />
              Total Cycles
            </div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-white">{totalBalls.reduce((a, b) => a + b, 0)}</div>
            <div className="text-white/70 text-sm mb-1 flex items-center justify-center gap-1">
              <Target size={16} />
              Total Balls
            </div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-white">{scoredBalls.reduce((a, b) => a + b, 0)}</div>
            <div className="text-white/70 text-sm mb-1 flex items-center justify-center gap-1">
              <Crosshair size={16} />
              Total Scored
            </div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-white">
              {formatStat((scoredBalls.reduce((a, b) => a + b, 0) / totalBalls.reduce((a, b) => a + b, 0)) * 100)}%
            </div>
            <div className="text-white/70 text-sm mb-1 flex items-center justify-center gap-1">
              <Target size={16} weight="fill" />
              Overall Accuracy
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Cycle Times */}
        <div className="bg-white border-2 border-[#445f8b] p-5">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-[#445f8b]">
            <Clock size={20} weight="bold" className="text-[#445f8b]" />
            <h4 className="text-lg font-bold">Cycle Times</h4>
          </div>
          
          {/* Average - Most Important */}
          <div className="mb-4 pb-3 border-b-2 border-[#f0f0f0]">
            <div className="text-xs text-[#666] mb-1">AVERAGE</div>
            <div className="text-3xl font-bold text-[#445f8b]">{formatStat(timeStats.avg)}s</div>
          </div>
          
          {/* Standard Deviation */}
          <div className="mb-3 pb-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#666] flex items-center gap-1">
                <ArrowsDownUp size={14} />
                Std Dev:
              </span>
              <span className="font-semibold">{formatStat(timeStats.std)}s</span>
            </div>
          </div>
          
          {/* Min/Max - Related */}
          <div className="flex gap-3 pt-2 border-t border-[#f0f0f0]">
            <div className="flex-1 text-center">
              <div className="text-xs text-[#666] mb-1">MIN</div>
              <div className="text-lg font-bold text-[#2d3e5c]">{formatStat(timeStats.min)}s</div>
            </div>
            <div className="w-px bg-[#ddd]"></div>
            <div className="flex-1 text-center">
              <div className="text-xs text-[#666] mb-1">MAX</div>
              <div className="text-lg font-bold text-[#2d3e5c]">{formatStat(timeStats.max)}s</div>
            </div>
          </div>
        </div>

        {/* Balls Scored */}
        <div className="bg-white border-2 border-[#445f8b] p-5">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-[#445f8b]">
            <Target size={20} weight="bold" className="text-[#445f8b]" />
            <h4 className="text-lg font-bold">Balls per Cycle</h4>
          </div>
          
          {/* Average - Most Important */}
          <div className="mb-4 pb-3 border-b-2 border-[#f0f0f0]">
            <div className="text-xs text-[#666] mb-1">AVERAGE</div>
            <div className="text-3xl font-bold text-[#445f8b]">{formatStat(ballStats.avg)}</div>
          </div>
          
          {/* Standard Deviation */}
          <div className="mb-3 pb-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#666] flex items-center gap-1">
                <ArrowsDownUp size={14} />
                Std Dev:
              </span>
              <span className="font-semibold">{formatStat(ballStats.std)}</span>
            </div>
          </div>
          
          {/* Min/Max - Related */}
          <div className="flex gap-3 pt-2 border-t border-[#f0f0f0]">
            <div className="flex-1 text-center">
              <div className="text-xs text-[#666] mb-1">MIN</div>
              <div className="text-lg font-bold text-[#2d3e5c]">{formatStat(ballStats.min, 0)}</div>
            </div>
            <div className="w-px bg-[#ddd]"></div>
            <div className="flex-1 text-center">
              <div className="text-xs text-[#666] mb-1">MAX</div>
              <div className="text-lg font-bold text-[#2d3e5c]">{formatStat(ballStats.max, 0)}</div>
            </div>
          </div>
        </div>

        {/* Accuracy */}
        <div className="bg-white border-2 border-[#445f8b] p-5">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-[#445f8b]">
            <Crosshair size={20} weight="bold" className="text-[#445f8b]" />
            <h4 className="text-lg font-bold">Accuracy per Cycle</h4>
          </div>
          
          {/* Average - Most Important */}
          <div className="mb-4 pb-3 border-b-2 border-[#f0f0f0]">
            <div className="text-xs text-[#666] mb-1">AVERAGE</div>
            <div className="text-3xl font-bold text-[#445f8b]">{formatStat(accuracyStats.avg)}%</div>
          </div>
          
          {/* Standard Deviation */}
          <div className="mb-3 pb-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#666] flex items-center gap-1">
                <ArrowsDownUp size={14} />
                Std Dev:
              </span>
              <span className="font-semibold">{formatStat(accuracyStats.std)}%</span>
            </div>
          </div>
          
          {/* Min/Max - Related */}
          <div className="flex gap-3 pt-2 border-t border-[#f0f0f0]">
            <div className="flex-1 text-center">
              <div className="text-xs text-[#666] mb-1">MIN</div>
              <div className="text-lg font-bold text-[#2d3e5c]">{formatStat(accuracyStats.min)}%</div>
            </div>
            <div className="w-px bg-[#ddd]"></div>
            <div className="flex-1 text-center">
              <div className="text-xs text-[#666] mb-1">MAX</div>
              <div className="text-lg font-bold text-[#2d3e5c]">{formatStat(accuracyStats.max)}%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Statistics
