import React, { useMemo } from 'react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'

const TrendSparkline = ({ data, currentValue }) => {
  if (!data || data.length === 0) return null

  // Determine line color based on trend direction
  const lineColor = useMemo(() => {
    const lastValue = data[data.length - 1]
    if (!lastValue || lastValue === 0) return '#9ca3af' // gray

    const diff = Math.abs(currentValue - lastValue) / lastValue

    if (diff <= 0.1) return '#9ca3af'    // gray — within 10%
    if (currentValue > lastValue) return '#ef4444' // red — above trend
    return '#10b981'                               // green — below trend
  }, [data, currentValue])

  // Transform to recharts format
  const chartData = useMemo(() => {
    return data.map((v, i) => ({ value: v, idx: i }))
  }, [data])

  return (
    <div className="inline-block" style={{ width: 60, height: 24 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={lineColor}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default TrendSparkline
