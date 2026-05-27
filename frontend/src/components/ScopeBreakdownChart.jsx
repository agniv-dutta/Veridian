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
  scope2: '#2563EB',
  scope3: '#7C3AED',
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
    <div className="rounded-xl border border-[var(--border-default)] bg-white p-4 text-xs shadow-[var(--shadow-dropdown)]">
      <p className="mb-2 font-medium text-[var(--text-primary)]">{formatMonthLabel(label)}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-6 py-0.5">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-sm inline-block"
              style={{ backgroundColor: entry.color }}
            />
            <span className="font-medium text-[var(--text-secondary)]">{SCOPE_LABELS[entry.dataKey]}</span>
          </div>
          <span className="font-medium text-[var(--text-primary)]">{Number(entry.value).toLocaleString()}</span>
        </div>
      ))}
      <div className="mt-2 flex justify-between border-t border-[var(--border-default)] pt-2">
        <span className="font-medium text-[var(--text-muted)]">Total</span>
        <span className="font-semibold text-[var(--text-primary)]">{total.toLocaleString()}</span>
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
      <div className="surface-card space-y-4 p-6 animate-pulse">
        <div className="h-5 w-52 rounded bg-[var(--surface-tertiary)]" />
        <div className="h-[220px] rounded-xl bg-[var(--surface-tertiary)]" />
        <div className="grid grid-cols-3 gap-4">
          <div className="h-20 rounded-xl bg-[var(--surface-tertiary)]" />
          <div className="h-20 rounded-xl bg-[var(--surface-tertiary)]" />
          <div className="h-20 rounded-xl bg-[var(--surface-tertiary)]" />
        </div>
      </div>
    )
  }

  return (
    <div className="surface-card space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[18px] font-semibold text-[var(--text-primary)]">Emissions by Scope</h2>
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">Last 6 months</span>
      </div>

      <div style={{ width: '100%', height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data || []}
            margin={{ top: 5, right: 0, left: 0, bottom: 5 }}
          >
            <XAxis
              dataKey="month"
              tickFormatter={formatMonthLabel}
              tick={{ fontSize: 11, fontWeight: 500, fill: '#9CA3AF' }}
              axisLine={{ stroke: '#E5E7EB' }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => v.toLocaleString()}
              tick={{ fontSize: 10, fontWeight: 500, fill: '#9CA3AF' }}
              axisLine={{ stroke: '#E5E7EB' }}
              tickLine={false}
              label={{
                value: 'kgCO₂e',
                angle: -90,
                position: 'insideLeft',
                offset: 10,
                style: { fontSize: 10, fontWeight: 500, fill: '#9CA3AF', textAnchor: 'middle' },
              }}
              width={70}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="square"
              iconSize={10}
              wrapperStyle={{ fontSize: 11, fontWeight: 500 }}
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

      <div className="grid grid-cols-3 gap-4">
        {[
          { key: 'scope1', label: 'Scope 1 — Direct', color: SCOPE_COLORS.scope1 },
          { key: 'scope2', label: 'Scope 2 — Indirect', color: SCOPE_COLORS.scope2 },
          { key: 'scope3', label: 'Scope 3 — Value Chain', color: SCOPE_COLORS.scope3 },
        ].map((s) => (
          <div
            key={s.key}
            className="rounded-xl border border-[var(--border-default)] bg-white p-4"
            style={{ borderLeftWidth: 3, borderLeftColor: s.color }}
          >
            <span className="block text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
              {s.label}
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-[24px] font-semibold text-[var(--text-primary)]">
                {scopeTotals[s.key].toLocaleString()}
              </span>
              <span className="text-[10px] font-medium text-[var(--text-muted)]">kgCO₂e</span>
            </div>
            <div className="mt-1">
              <span
                className="text-xs font-medium"
                style={{ color: s.color }}
              >
                {getPercentage(scopeTotals[s.key])}%
              </span>
              <span className="ml-1 text-[10px] text-[var(--text-muted)]">of total</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ScopeBreakdownChart
