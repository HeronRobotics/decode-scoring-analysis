import { useCallback, useMemo, useState } from 'react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { useTournament } from '../../data/TournamentContext'

const numToKey = (num) => `Team ${num}`

// Helper function to calculate quartiles for boxplot
const calculateQuartiles = (values) => {
  if (!values || values.length === 0) return null
  
  const sorted = values.filter(v => v !== null).sort((a, b) => a - b)
  if (sorted.length === 0) return null
  
  const q1Index = Math.floor(sorted.length * 0.25)
  const q2Index = Math.floor(sorted.length * 0.5)
  const q3Index = Math.floor(sorted.length * 0.75)
  
  return {
    min: sorted[0],
    q1: sorted[q1Index],
    median: sorted[q2Index],
    q3: sorted[q3Index],
    max: sorted[sorted.length - 1],
    values: sorted
  }
}

function TeamChart({ matchesOrdered, teamStats, teamColors }) {
  const { visibleTeams, hoveredTeam, setHoveredTeam } = useTournament()
  const [chartSize, setChartSize] = useState({ width: 0, height: 0 })

  const onResize = useCallback((width, height) => {
    // Recharts calls this frequently; keep it light.
    setChartSize({ width, height })
  }, [])

  const getMatchTime = (m) => {
    if (m.startTime) {
      const date = new Date(m.startTime)
      date.setSeconds(0, 0)
      return date.getTime()
    }
    if (m.events && m.events.length > 0) {
      const date = new Date(m.events[0].timestamp)
      date.setSeconds(0, 0)
      return date.getTime()
    }
    return 0
  }

  const chartData = useMemo(() => {
    if (!matchesOrdered || matchesOrdered.length === 0 || !teamStats || teamStats.length === 0) {
      return []
    }
    
    const orderedMatches = matchesOrdered.slice().sort((a, b) => getMatchTime(a) - getMatchTime(b))
    
    return orderedMatches.map((m, idx) => {
      let key = new Date(getMatchTime(m)).toLocaleString()
      if (key.indexOf(':00 ') !== -1) {
        key = key.replace(':00 ', ' ')
      }
      const obj = {
        label: key,
        matchIdx: idx,
        matchTime: getMatchTime(m),
        _idx: idx,
      }
      teamStats.forEach(ts => {
        obj[numToKey(ts.team)] = ts.scores && ts.scores[idx] != null ? ts.scores[idx] : null
      })
      return obj
    })
  }, [matchesOrdered, teamStats])

  const sharedMax = Math.max(1, ...teamStats.flatMap(ts => ts.scores ? ts.scores.filter(v => v !== null) : []))

  const isCompact = chartSize.width > 0 ? chartSize.width < 640 : false
  const chartMargin = useMemo(() => (
    {
      top: 20,
      right: isCompact ? 20 : 80,
      left: 8,
      bottom: isCompact ? 50 : 20,
    }
  ), [isCompact])

  // Calculate boxplot data for hovered team
  const hoveredTeamBoxplot = useMemo(() => {
    if (!hoveredTeam) return null
    const team = teamStats.find(ts => ts.team === hoveredTeam)
    if (!team || !team.scores) return null
    return calculateQuartiles(team.scores)
  }, [hoveredTeam, teamStats])

  if (!chartData || chartData.length === 0 || !teamStats || teamStats.length === 0) {
    return (
      <div className="h-[600px] flex items-center justify-center border-2 border-[#ddd] bg-gray-50">
        <p className="text-gray-500">No team data available for chart</p>
      </div>
    )
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null
    const idxPayloadItem = payload.find(p => p && p.payload && (p.payload.matchIdx !== undefined || p.payload._idx !== undefined))
    const idx = idxPayloadItem?.payload?.matchIdx ?? idxPayloadItem?.payload?._idx
    const row = typeof idx === 'number' && chartData[idx] ? chartData[idx] : chartData.find(r => r.label === label) || {}
    const displayLabel = row.matchTime ? new Date(row.matchTime).toLocaleString() : label
    
    return (
      <div className="bg-white border-2 border-[#445f8b] p-2 text-sm">
        <div className="font-semibold mb-1">{displayLabel}</div>
        <div className="space-y-1">
          {teamStats.filter(ts => visibleTeams[ts.team] !== false).map(ts => {
            if (row[numToKey(ts.team)] == null) return null;
            
            return (
            <div key={ts.team} className="flex items-center gap-2">
              <div style={{ width: 10, height: 10, background: teamColors[ts.team] }} />
              <div className="flex-1">Team {ts.team}</div>
              <div className="font-semibold">{`${row[numToKey(ts.team)]} balls`}</div>
            </div>
          )
        })}
        </div>
      </div>
    )
  }

  // Custom component to render boxplot overlay on the main chart
  const BoxplotOverlay = () => {
    if (!hoveredTeamBoxplot || !hoveredTeam) return null
    
    const color = teamColors[hoveredTeam]
    const boxplotData = hoveredTeamBoxplot
    
    // Coordinates are relative to the SVG viewBox (0..width, 0..height).
    const w = chartSize.width || 700
    const h = chartSize.height || 600
    const topY = chartMargin.top
    const bottomY = h - chartMargin.bottom
    const boxplotHeight = Math.max(1, bottomY - topY)

    // Position boxplot in the right margin so it doesn't overlap the lines.
    const boxplotX = w - (chartMargin.right / 2)
    
    // Scale values based on chart's Y domain (0 to sharedMax)
    const scaleY = (value) => {
      const ratio = value / sharedMax
      return bottomY - (ratio * boxplotHeight)
    }
    
    const boxWidth = 20
    const centerX = boxplotX
    const labelX = Math.min(centerX + 15, w - 8)
    
    return (
      <>
        
        {/* Whiskers */}
        <line
          x1={centerX}
          y1={scaleY(boxplotData.min)}
          x2={centerX}
          y2={scaleY(boxplotData.q1)}
          stroke={color}
          strokeWidth={2}
        />
        <line
          x1={centerX}
          y1={scaleY(boxplotData.q3)}
          x2={centerX}
          y2={scaleY(boxplotData.max)}
          stroke={color}
          strokeWidth={2}
        />
        
        {/* Whisker caps */}
        <line
          x1={centerX - 8}
          y1={scaleY(boxplotData.min)}
          x2={centerX + 8}
          y2={scaleY(boxplotData.min)}
          stroke={color}
          strokeWidth={2}
        />
        <line
          x1={centerX - 8}
          y1={scaleY(boxplotData.max)}
          x2={centerX + 8}
          y2={scaleY(boxplotData.max)}
          stroke={color}
          strokeWidth={2}
        />
        
        {/* Box */}
        <rect
          x={centerX - boxWidth/2}
          y={scaleY(boxplotData.q3)}
          width={boxWidth}
          height={scaleY(boxplotData.q1) - scaleY(boxplotData.q3)}
          fill={color}
          fillOpacity={0.3}
          stroke={color}
          strokeWidth={2}
        />
        
        {/* Median line */}
        <line
          x1={centerX - boxWidth/2}
          y1={scaleY(boxplotData.median)}
          x2={centerX + boxWidth/2}
          y2={scaleY(boxplotData.median)}
          stroke={color}
          strokeWidth={3}
        />
        
        {/* Value labels */}
        <text x={labelX} y={scaleY(boxplotData.max) + 4} fill="#666" fontSize="9" dominantBaseline="middle">
          {boxplotData.max}
        </text>
        <text x={labelX} y={scaleY(boxplotData.q3) + 4} fill="#666" fontSize="9" dominantBaseline="middle">
          {boxplotData.q3}
        </text>
        <text x={labelX} y={scaleY(boxplotData.median) + 4} fill="#666" fontSize="9" dominantBaseline="middle">
          {boxplotData.median}
        </text>
        <text x={labelX} y={scaleY(boxplotData.q1) + 4} fill="#666" fontSize="9" dominantBaseline="middle">
          {boxplotData.q1}
        </text>
        <text x={labelX} y={scaleY(boxplotData.min) + 4} fill="#666" fontSize="9" dominantBaseline="middle">
          {boxplotData.min}
        </text>
      </>
    )
  }

  return (
    <div className="h-[360px] sm:h-[600px]">
      <ResponsiveContainer width="100%" height="100%" onResize={onResize}>
        <LineChart data={chartData} margin={chartMargin}>
          <CartesianGrid stroke="#f7fafc" />
          <XAxis
            dataKey="label"
            tick={{ fill: '#666', fontSize: isCompact ? 10 : 12 }}
            interval="preserveStartEnd"
            minTickGap={20}
            angle={isCompact ? -35 : 0}
            textAnchor={isCompact ? 'end' : 'middle'}
            height={isCompact ? 60 : undefined}
          />
          <YAxis domain={[0, sharedMax]} tick={{ fill: '#666' }} />
          <Tooltip content={<CustomTooltip />} />
          {teamStats.map((ts) => {
            const key = numToKey(ts.team)
            const color = teamColors[ts.team]
            const isVisible = visibleTeams[ts.team] !== false
            if (!isVisible) return null
            const isHovered = hoveredTeam ? hoveredTeam === ts.team : false
            return (
              <Line
                key={ts.team}
                type="monotone"
                dataKey={key}
                stroke={color}
                strokeWidth={isHovered ? 3 : 2}
                strokeOpacity={hoveredTeam ? (isHovered ? 1 : 0.15) : 0.95}
                dot={{ r: isHovered ? 5 : 3 }}
                connectNulls={true}
                isAnimationActive={false}
                onMouseEnter={() => setHoveredTeam(ts.team)}
                onMouseLeave={() => setHoveredTeam(null)}
              />
            )
          })}
          {/* Custom content for boxplot overlay */}
          {!isCompact && hoveredTeamBoxplot && hoveredTeam && (
            <g className="recharts-layer">
              <BoxplotOverlay />
            </g>
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default TeamChart