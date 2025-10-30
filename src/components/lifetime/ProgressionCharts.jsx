import { TrendUp } from '@phosphor-icons/react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

function ProgressionCharts({ matchStats }) {
  const chartData = matchStats.map((stat, i) => ({
    ...stat,
    index: i,
    dateLabel: new Date(stat.date).toLocaleString()
  }))

  return (
    <div className="bg-white border-2 border-[#445f8b] p-6 mb-8">
      <h2 className="text-3xl mb-5 flex items-center gap-3">
        <TrendUp weight="bold" size={32} />
        Progression
      </h2>

      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-3">Accuracy Over Time</h3>
        <div className="h-80 border-2 border-[#ddd] bg-white">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart 
              data={chartData}
              margin={{ top: 20, right: 20, left: 10, bottom: 20 }}
            >
              <CartesianGrid stroke="#e5e7eb" strokeDasharray="0" />
              <XAxis 
                dataKey="dateLabel" 
                stroke="#666"
                style={{ fontSize: '12px', fontFamily: 'League Spartan' }}
              />
              <YAxis 
                domain={[0, 100]}
                stroke="#666"
                style={{ fontSize: '12px', fontFamily: 'League Spartan' }}
                tickFormatter={(val) => `${val}%`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '2px solid #445f8b',
                  fontFamily: 'League Spartan'
                }}
                formatter={(value) => [`${value.toFixed(1)}%`, 'Accuracy']}
                labelFormatter={(label, payload) => payload[0]?.payload.name}
              />
              <Line 
                type="monotone" 
                dataKey="accuracy" 
                stroke="#445f8b" 
                strokeWidth={2}
                dot={{ fill: '#445f8b', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-3">Average Cycle Time Over Time</h3>
        <div className="h-80 border-2 border-[#ddd] bg-white">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart 
              data={chartData}
              margin={{ top: 20, right: 20, left: 10, bottom: 20 }}
            >
              <CartesianGrid stroke="#e5e7eb" strokeDasharray="0" />
              <XAxis 
                dataKey="dateLabel" 
                stroke="#666"
                style={{ fontSize: '12px', fontFamily: 'League Spartan' }}
              />
              <YAxis 
                stroke="#666"
                style={{ fontSize: '12px', fontFamily: 'League Spartan' }}
                tickFormatter={(val) => `${val}s`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '2px solid #445f8b',
                  fontFamily: 'League Spartan'
                }}
                formatter={(value) => [`${value.toFixed(1)}s`, 'Avg Cycle Time']}
                labelFormatter={(label, payload) => payload[0]?.payload.name}
              />
              <Line 
                type="monotone" 
                dataKey="avgCycleTime" 
                stroke="#445f8b" 
                strokeWidth={2}
                dot={{ fill: '#445f8b', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

export default ProgressionCharts