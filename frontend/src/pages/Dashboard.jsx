import React, { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getImports } from '../api/imports'
import { getScopeTrend, getSummary } from '../api/summary'
import ScopeBreakdownChart from '../components/ScopeBreakdownChart'
import QualityBadge from '../components/QualityBadge'
import StatusBadge from '../components/StatusBadge'
import ExportModal from '../components/ExportModal'
import SourceIcon from '../components/SourceIcon'
import { SOURCE_CONFIG, getSourceLabel } from '../utils/sourceConfig'
import { formatImportDate } from '../utils/formatDate'
import {
  FunnelIcon,
  EllipsisVerticalIcon,
  ArrowDownTrayIcon,
  ClipboardDocumentIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../context/AuthContext'
import { useClient } from '../context/ClientContext'

const MOCK_SCOPE_TREND = [
  { month: '2023-08', scope1: 1280, scope2: 2240, scope3: 1640 },
  { month: '2023-09', scope1: 1420, scope2: 2380, scope3: 1900 },
  { month: '2023-10', scope1: 1580, scope2: 2540, scope3: 2120 },
  { month: '2023-11', scope1: 1710, scope2: 2680, scope3: 2280 },
  { month: '2023-12', scope1: 1840, scope2: 2790, scope3: 2410 },
  { month: '2024-01', scope1: 1960, scope2: 2910, scope3: 2570 },
]

const MOCK_IMPORTS = [
  { id: 'sap-1', sourceType: 'sap', filename: 'SAP Fuel & Procurement', created_at: '2023-12-15T09:24:00Z', records_count: 30, flags_count: 5, status: 'pending_review', quality_score: 84, grade: 'B' },
  { id: 'utility-1', sourceType: 'utility', filename: 'Utility / Electricity', created_at: '2023-12-12T11:10:00Z', records_count: 12, flags_count: 3, status: 'flagged', quality_score: 71, grade: 'C' },
  { id: 'travel-1', sourceType: 'travel', filename: 'Corporate Travel', created_at: '2023-12-10T14:05:00Z', records_count: 18, flags_count: 2, status: 'completed', quality_score: 93, grade: 'A' },
]

const MOCK_SUMMARY = {
  total_imports: 42,
  pending_review: 12,
  flagged_records: 7,
  approved_locked: 23,
}

const formatNumber = (value) => Number(value || 0).toLocaleString()

const Dashboard = () => {
  const { clientId } = useClient()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isExportOpen, setIsExportOpen] = useState(false)

  const { data: summaryData } = useQuery({
    queryKey: ['summary', clientId],
    queryFn: () => getSummary(clientId),
    enabled: !!clientId,
  })

  const { data: importsData } = useQuery({
    queryKey: ['recent-imports', clientId],
    queryFn: () => getImports({ client: clientId, limit: 10 }),
    enabled: !!clientId,
  })

  const { data: scopeTrendData } = useQuery({
    queryKey: ['scope-trend', clientId],
    queryFn: () => getScopeTrend(clientId),
    enabled: !!clientId,
  })

  const summary = summaryData || MOCK_SUMMARY
  const scopeTrend = scopeTrendData?.length ? scopeTrendData : MOCK_SCOPE_TREND
  const recentImports = importsData?.results?.length
    ? importsData.results.slice(0, 3).map((job) => ({
        id: job.id,
        sourceType: job.source_type || job.sourceType,
        filename: job.filename || job.source_type || job.sourceType || 'Import',
        uploaded_at: job.uploaded_at || job.created_at,
        records_count: job.total_records ?? job.records_count ?? job.successful_records ?? 0,
        flags_count: job.failed_records ?? job.flags_count ?? 0,
        status: job.status,
        quality_score: job.quality_score,
        grade: job.grade || job.quality_grade,
      }))
    : MOCK_IMPORTS

  const scopeTotals = useMemo(() => {
    return scopeTrend.reduce(
      (acc, entry) => {
        acc.scope1 += Number(entry.scope1 || 0)
        acc.scope2 += Number(entry.scope2 || 0)
        acc.scope3 += Number(entry.scope3 || 0)
        return acc
      },
      { scope1: 0, scope2: 0, scope3: 0 }
    )
  }, [scopeTrend])

  const totalScope = scopeTotals.scope1 + scopeTotals.scope2 + scopeTotals.scope3 || 1

  const summaryCards = [
    {
      label: 'TOTAL IMPORTS',
      value: formatNumber(summary.total_imports),
      icon: ArrowDownTrayIcon,
      iconClass: 'text-[var(--brand-primary)]',
      subtext: '↑ 12.5% from last month',
      subtextClass: 'text-[#059669]',
    },
    {
      label: 'PENDING REVIEW',
      value: formatNumber(summary.pending_review),
      icon: ClipboardDocumentIcon,
      iconClass: 'text-[#F59E0B]',
      subtext: '⚠ 8 requiring immediate action',
      subtextClass: 'text-[#F59E0B]',
    },
    {
      label: 'FLAGGED RECORDS',
      value: formatNumber(summary.flagged_records),
      icon: ExclamationTriangleIcon,
      iconClass: 'text-[#EF4444]',
      borderColor: 'border-l-[#EF4444]',
      subtext: 'Data variance detected',
      subtextClass: 'text-[#EF4444]',
    },
    {
      label: 'APPROVED & LOCKED',
      value: formatNumber(summary.approved_locked),
      icon: LockClosedIcon,
      iconClass: 'text-[#10B981]',
      subtext: '✓ Ready for audit reporting',
      subtextClass: 'text-[#10B981]',
    },
  ]

  return (
    <div className="px-8 py-8 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-[28px] font-semibold text-[var(--text-primary)] tracking-tight">Data Integrity Overview</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Monitoring sustainability metrics and ingestion pipeline performance.</p>
        </div>
        <button
          onClick={() => navigate('/ingest')}
          className="button-primary inline-flex h-10 items-center gap-2 px-5 text-sm font-medium"
        >
          <span className="text-base leading-none">+</span> New Analysis
        </button>
      </div>

      <ScopeBreakdownChart data={scopeTrend} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon
          return (
            <div key={card.label} className={`surface-card relative overflow-hidden p-6 ${card.borderColor || ''}`.trim()}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">{card.label}</p>
                  <div className="mt-4 text-[32px] font-semibold leading-none text-[var(--text-primary)]">{card.value}</div>
                  <p className={`mt-2 text-[12px] font-medium ${card.subtextClass}`}>{card.subtext}</p>
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--surface-secondary)]">
                  <Icon className={`h-6 w-6 ${card.iconClass}`} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,0.84fr)]">
        <section className="surface-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--border-default)] px-6 py-5">
            <h2 className="text-[18px] font-semibold text-[var(--text-primary)]">Recent Imports</h2>
            <div className="flex items-center gap-2 text-[var(--text-muted)]">
              <button className="grid h-8 w-8 place-items-center rounded-full hover:bg-[var(--surface-secondary)]">
                <FunnelIcon className="h-4 w-4" />
              </button>
              <button className="grid h-8 w-8 place-items-center rounded-full hover:bg-[var(--surface-secondary)]">
                <EllipsisVerticalIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="table-shell w-full min-w-[780px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[var(--border-default)]">
                  <th className="px-4 py-3.5">Source</th>
                  <th className="px-4 py-3.5">Import Date</th>
                  <th className="px-4 py-3.5 text-right">Records</th>
                  <th className="px-4 py-3.5 text-right">Flagged</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Quality</th>
                  <th className="px-4 py-3.5">Action</th>
                </tr>
              </thead>
              <tbody>
                {recentImports.map((job) => (
                  <tr key={job.id} className="border-b border-[var(--border-default)] last:border-b-0">
                    <td className="px-4 py-3.5 align-middle">
                      <div className="flex items-center gap-3">
                        <SourceIcon sourceType={job.sourceType} />
                        <div>
                          <div className="text-sm font-medium text-[var(--text-primary)]">{SOURCE_CONFIG[(job.sourceType || '').toLowerCase()]?.label || getSourceLabel(job.sourceType)}</div>
                          <div className="mt-0.5 text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)]">{SOURCE_CONFIG[(job.sourceType || '').toLowerCase()]?.sublabel || ''}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-[var(--text-secondary)]">{formatImportDate(job.uploaded_at)}</td>
                    <td className="px-4 py-3.5 text-right text-sm text-[var(--text-secondary)]">{formatNumber(job.records_count)}</td>
                    <td className="px-4 py-3.5 text-right text-sm text-[var(--status-flagged)]">{formatNumber(job.flags_count)}</td>
                    <td className="px-4 py-3.5"><StatusBadge status={job.status} /></td>
                    <td className="px-4 py-3.5">
                      <QualityBadge grade={job.grade || 'B'} score={job.quality_score} />
                    </td>
                    <td className="px-4 py-3.5">
                      {job.id && !String(job.id).startsWith('sap-') ? (
                        <Link to={`/imports/${job.id}`} className="text-sm font-medium text-[var(--brand-primary)] hover:text-[var(--brand-secondary)]">View →</Link>
                      ) : (
                        <span className="text-sm font-medium text-[var(--brand-primary)]">View →</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-[var(--border-default)] px-6 py-4 text-center">
            <Link to="/ingest" className="text-sm font-medium text-[var(--brand-primary)] hover:text-[var(--brand-secondary)]">Show All Imports →</Link>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="surface-card p-6">
            <h2 className="text-[18px] font-semibold text-[var(--text-primary)]">Integrity Score</h2>
            <div className="mt-6 flex flex-col items-center">
              <div className="relative flex h-20 w-20 items-center justify-center">
                <svg width="80" height="80" viewBox="0 0 80 80" className="-rotate-90 transform">
                  <circle cx="40" cy="40" r="32" fill="none" stroke="#E6F4F4" strokeWidth="6" />
                  <circle
                    cx="40"
                    cy="40"
                    r="32"
                    fill="none"
                    stroke="#0D6E6E"
                    strokeWidth="6"
                    strokeDasharray="201.1"
                    strokeDashoffset="16"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute text-center">
                  <div className="text-[28px] font-semibold leading-none text-[var(--brand-primary)]">92</div>
                  <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--brand-primary)]">Optimal</div>
                </div>
              </div>
              <p className="mt-6 text-center text-[13px] text-[var(--text-secondary)]">Data accuracy is up <span className="font-medium text-[var(--brand-primary)]">4%</span> this week.</p>
            </div>
          </div>

          <div className="surface-card overflow-hidden">
            <div className="border-b border-[var(--border-default)] px-6 py-5">
              <h2 className="text-[18px] font-semibold text-[var(--text-primary)]">Active Alerts</h2>
            </div>
            <div className="divide-y divide-[var(--border-default)]">
              <div className="flex gap-3 px-6 py-4">
                <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 text-[#EF4444]" />
                <div>
                  <div className="text-[13px] font-medium text-[#EF4444]">Critical Schema Mismatch</div>
                  <div className="mt-1 text-[12px] text-[var(--text-muted)]">Utility API source changed headers.</div>
                </div>
              </div>
              <div className="flex gap-3 px-6 py-4">
                <div className="mt-0.5 h-5 w-5 rounded-full bg-[var(--surface-tertiary)] text-center text-[12px] leading-5 text-[var(--text-secondary)]">i</div>
                <div>
                  <div className="text-[13px] font-medium text-[var(--text-secondary)]">Maintenance Window</div>
                  <div className="mt-1 text-[12px] text-[var(--text-muted)]">Tonight 02:00 – 04:00 UTC.</div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} clientId={clientId} />
    </div>
  )
}

export default Dashboard
