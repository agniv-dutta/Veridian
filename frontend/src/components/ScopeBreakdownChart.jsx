import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

const SCOPE_COLORS = {
  scope1: '#0D6E6E',
  scope2: '#185FA5',
  scope3: '#534AB7',
}

const SCOPE_LABELS = {
  scope1: 'Scope 1',
  scope2: 'Scope 2',
  scope3: 'Scope 3',
}

/**
 * Format "2023-07" → "Jul '23"
 */
const formatMonthLabel = (month) => {
  if (!month) return ''
  const [year, m] = month.split('-')
  const date = new Date(Number(year), Number(m) - 1)
  const monthShort = date.toLocaleString('en-US', { month: 'short' })
  return `${monthShort} '${year.slice(2)}`
}

/**
 * Custom tooltip showing all three scopes + total
 */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null

  const total = payload.reduce((sum, entry) => sum + (entry.value || 0), 0)

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-4 text-xs font-sans">
      <p className="font-bold text-gray-900 mb-2">{formatMonthLabel(label)}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-6 py-0.5">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-sm inline-block"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600 font-medium">{SCOPE_LABELS[entry.dataKey]}</span>
          </div>
          <span className="font-bold text-gray-900">{Number(entry.value).toLocaleString()}</span>
        </div>
      ))}
      <div className="border-t border-gray-100 mt-2 pt-2 flex justify-between">
        <span className="font-bold text-gray-500">Total</span>
        <span className="font-extrabold text-gray-900">{total.toLocaleString()}</span>
      </div>
    </div>
  )
}

const ScopeBreakdownChart = ({ data, isLoading }) => {
  const navigate = useNavigate()

  // Compute scope totals for the summary cards
  const scopeTotals = useMemo(() => {
    if (!data || data.length === 0) return { scope1: 0, scope2: 0, scope3: 0, total: 0 }
    const s1 = data.reduce((sum, d) => sum + (d.scope1 || 0), 0)
    const s2 = data.reduce((sum, d) => sum + (d.scope2 || 0), 0)
    const s3 = data.reduce((sum, d) => sum + (d.scope3 || 0), 0)
    return { scope1: s1, scope2: s2, scope3: s3, total: s1 + s2 + s3 }
  }, [data])

  const getPercentage = (val) => {
    if (!scopeTotals.total) return '0'
    return ((val / scopeTotals.total) * 100).toFixed(1)
  }

  const handleBarClick = (scopeKey, month) => {
    const scopeNum = scopeKey.replace('scope', '')
    navigate(`/review?scope=${scopeNum}&month=${month}`)
  }

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4 animate-pulse">
        <div className="h-5 w-52 bg-gray-200 rounded" />
        <div className="h-[260px] bg-gray-100 rounded-xl" />
        <div className="grid grid-cols-3 gap-4">
          <div className="h-20 bg-gray-100 rounded-xl" />
          <div className="h-20 bg-gray-100 rounded-xl" />
          <div className="h-20 bg-gray-100 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-gray-900 tracking-tight">
          Emissions by Scope
        </h2>
        <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">
          Last 6 months
        </span>
      </div>

      {/* Chart */}
      <div style={{ width: '100%', height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data || []}
            margin={{ top: 5, right: 0, left: 0, bottom: 5 }}
          >
            <XAxis
              dataKey="month"
              tickFormatter={formatMonthLabel}
              tick={{ fontSize: 11, fontWeight: 600, fill: '#9ca3af' }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => v.toLocaleString()}
              tick={{ fontSize: 10, fontWeight: 600, fill: '#9ca3af' }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={false}
              label={{
                value: 'kgCO₂e',
                angle: -90,
                position: 'insideLeft',
                offset: 10,
                style: { fontSize: 10, fontWeight: 700, fill: '#9ca3af', textAnchor: 'middle' },
              }}
              width={70}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="square"
              iconSize={10}
              wrapperStyle={{ fontSize: 11, fontWeight: 600 }}
              formatter={(value) => SCOPE_LABELS[value] || value}
            />
            {['scope1', 'scope2', 'scope3'].map((key) => (
              <Bar
                key={key}
                dataKey={key}
                stackId="emissions"
                fill={SCOPE_COLORS[key]}
                radius={key === 'scope3' ? [3, 3, 0, 0] : [0, 0, 0, 0]}
                cursor="pointer"
                onClick={(barData) => handleBarClick(key, barData?.payload?.month || barData?.month)}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Scope Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { key: 'scope1', label: 'Scope 1 — Direct', color: SCOPE_COLORS.scope1 },
          { key: 'scope2', label: 'Scope 2 — Indirect', color: SCOPE_COLORS.scope2 },
          { key: 'scope3', label: 'Scope 3 — Value Chain', color: SCOPE_COLORS.scope3 },
        ].map((s) => (
          <div
            key={s.key}
            className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
            style={{ borderLeftWidth: 4, borderLeftColor: s.color }}
          >
            <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase block">
              {s.label}
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-extrabold text-gray-900">
                {scopeTotals[s.key].toLocaleString()}
              </span>
              <span className="text-[10px] font-bold text-gray-400">kgCO₂e</span>
            </div>
            <div className="mt-1">
              <span
                className="text-xs font-bold"
                style={{ color: s.color }}
              >
                {getPercentage(scopeTotals[s.key])}%
              </span>
              <span className="text-[10px] text-gray-400 ml-1">of total</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ScopeBreakdownChart
