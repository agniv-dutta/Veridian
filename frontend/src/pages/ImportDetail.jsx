import React, { useMemo, useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getImport, getImportPreview, reingestImport } from '../api/imports'
import apiClient from '../api/client'
import StatusBadge from '../components/StatusBadge'
import QualityBadge from '../components/QualityBadge'
import ScopeBadge from '../components/ScopeBadge'
import RecordDetailPanel from '../components/RecordDetailPanel'
import useToast from '../hooks/useToast'
import {
  ChevronDownIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  ClipboardDocumentIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  DocumentDuplicateIcon,
  ClipboardDocumentCheckIcon,
  ClipboardIcon,
} from '@heroicons/react/24/outline'

const MOCK_RECORDS = [
  { id: '001', description: 'Diesel combustion – Plant 1001', quantity: 1200, unit: 'L', calculated_kgco2e: 3216, scope: 1, status: 'approved' },
  { id: '002', description: 'Diesel combustion – Plant 1002', quantity: 980, unit: 'L', calculated_kgco2e: 2626.4, scope: 1, status: 'failed', parse_error: 'Plant code unresolved' },
  { id: '003', description: 'Grid electricity – MTR-BOM-01', quantity: 32000, unit: 'kWh', calculated_kgco2e: 26240, scope: 2, status: 'flagged', flag_message: '4.2σ above site mean' },
  { id: '004', description: 'Business travel – APAC roadshow', quantity: 4800, unit: 'km', calculated_kgco2e: 1224, scope: 3, status: 'pending' },
]

const ImportDetail = () => {
  const { importId } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const toast = useToast()

  const [activeRecordId, setActiveRecordId] = useState(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const activeTab = searchParams.get('status') || 'all'

  const { data: importJob, isLoading: isLoadingJob, isError: isErrorJob, error: jobError, refetch: refetchJob } = useQuery({
    queryKey: ['import-job', importId],
    queryFn: () => getImport(importId),
    enabled: !!importId,
  })

  const { data: importRecords, isLoading: isLoadingRecords, isError: isErrorRecords, error: recordsError, refetch: refetchRecords } = useQuery({
    queryKey: ['import-records', importId, activeTab],
    queryFn: async () => {
      const statusParam = activeTab === 'all' ? '' : activeTab
      const response = await apiClient.get(`/api/imports/${importId}/records/`, {
        params: statusParam ? { status: statusParam } : {},
      })
      return response.data
    },
    enabled: !!importId,
  })

  const { data: previewData, isLoading: isLoadingPreview } = useQuery({
    queryKey: ['import-preview', importId],
    queryFn: () => getImportPreview(importId),
    enabled: !!importId,
  })

  const reingestMutation = useMutation({
    mutationFn: () => reingestImport(importId),
    onSuccess: () => {
      toast.success('Re-ingestion triggered.')
      queryClient.invalidateQueries({ queryKey: ['records'] })
      queryClient.invalidateQueries({ queryKey: ['summary'] })
      refetchJob()
      refetchRecords()
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Re-ingestion failed.')
    },
  })

  const records = Array.isArray(importRecords) ? importRecords : importRecords?.results || []
  const fallbackRecords = MOCK_RECORDS
  const visibleRecords = records.length ? records : fallbackRecords

  const failedRecords = useMemo(() => visibleRecords.filter((record) => (record.status || '').toLowerCase() === 'failed' || (record.status || '').toLowerCase() === 'rejected'), [visibleRecords])
  const flaggedRecords = useMemo(() => visibleRecords.filter((record) => (record.status || '').toLowerCase() === 'flagged'), [visibleRecords])
  const tabbedRecords = activeTab === 'failed' ? failedRecords : activeTab === 'flagged' ? flaggedRecords : visibleRecords

  const errorMessage = jobError?.message || recordsError?.message || 'Failed to load import details.'
  const totalRecords = importJob?.total_records ?? visibleRecords.length
  const successfulRecords = importJob?.successful_records ?? visibleRecords.filter((record) => record.status !== 'failed').length
  const failedCount = importJob?.failed_records ?? failedRecords.length
  const qualityGrade = importJob?.grade || 'B'

  const qualityCountDisplay = importJob?.quality_score == null ? '—' : `${Math.round((Number(importJob.quality_score) <= 1 ? Number(importJob.quality_score) * 100 : Number(importJob.quality_score)))}%`

  const rawLines = previewData?.lines || previewData?.preview_lines || []
  const copiedText = async () => {
    if (!rawLines.length) return
    await navigator.clipboard.writeText(rawLines.slice(0, 10).join('\n'))
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  if (isLoadingJob) {
    return (
      <div className="px-8 py-8 space-y-6 animate-pulse">
        <div className="h-8 w-60 rounded bg-[var(--surface-tertiary)]" />
        <div className="h-36 rounded-xl bg-[var(--surface-tertiary)]" />
        <div className="h-80 rounded-xl bg-[var(--surface-tertiary)]" />
      </div>
    )
  }

  if (isErrorJob || !importJob) {
    return (
      <div className="px-8 py-8">
        <div className="surface-card border-l-4 border-l-[#EF4444] p-6">
          <h2 className="text-[18px] font-semibold text-[var(--text-primary)]">Failed to load import details</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">{errorMessage}</p>
          <button onClick={() => refetchJob()} className="mt-4 rounded-lg bg-[#FEF2F2] px-4 py-2 text-sm font-medium text-[#B91C1C]">Retry</button>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'all', label: 'All Records', count: visibleRecords.length },
    { id: 'failed', label: 'Failed', count: failedRecords.length },
    { id: 'flagged', label: 'Flagged', count: flaggedRecords.length },
  ]

  return (
    <div className="px-8 py-8 space-y-6">
      <div className="surface-card p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <button onClick={() => navigate('/ingest')} className="inline-flex items-center gap-2 text-sm font-medium text-[var(--brand-primary)] hover:text-[var(--brand-secondary)]">
              <ArrowLeftIcon className="h-4 w-4" /> All Imports
            </button>
            <div className="flex flex-wrap items-center gap-3">
              <div className="font-mono text-[14px] text-[var(--text-primary)]">Import #{String(importId).slice(0, 8)}</div>
              <StatusBadge status={importJob.status} />
              <div className="text-[12px] text-[var(--text-muted)]">{new Date(importJob.uploaded_at || importJob.created_at || Date.now()).toLocaleString()}</div>
            </div>
            <h1 className="text-[28px] font-semibold tracking-tight text-[var(--text-primary)]">{importJob.filename || 'Direct API Ingestion'}</h1>
          </div>

          <div className="flex flex-wrap items-start gap-3">
            {importJob.status === 'failed' && (
              <button
                onClick={() => {
                  if (window.confirm('Re-ingest this import? This may overwrite the previous batch.')) {
                    reingestMutation.mutate()
                  }
                }}
                className="rounded-lg border border-[#F59E0B] px-4 py-2 text-sm font-medium text-[#B45309] hover:bg-[#FFFBEB]"
              >
                Re-ingest
              </button>
            )}
            <div className="rounded-xl border border-[var(--border-default)] px-4 py-3 text-center">
              <div className="text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)]">Total Records</div>
              <div className="mt-1 text-[22px] font-semibold text-[var(--text-primary)]">{totalRecords}</div>
            </div>
            <div className="rounded-xl border border-[var(--border-default)] px-4 py-3 text-center">
              <div className="text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)]">Successful</div>
              <div className="mt-1 text-[22px] font-semibold text-[var(--text-primary)]">{successfulRecords}</div>
            </div>
            <div className="rounded-xl border border-[var(--border-default)] px-4 py-3 text-center">
              <div className="text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)]">Failed</div>
              <div className="mt-1 text-[22px] font-semibold text-[var(--text-primary)]">{failedCount}</div>
            </div>
            <div className="rounded-xl border border-[var(--border-default)] px-4 py-3 text-center">
              <div className="text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)]">Quality Grade</div>
              <div className="mt-2 flex justify-center"><QualityBadge grade={qualityGrade} score={importJob.quality_score} showInterpretation /></div>
              <div className="mt-2 text-[11px] text-[var(--text-muted)]">{qualityCountDisplay}</div>
            </div>
          </div>
        </div>
      </div>

      {(isErrorRecords || isLoadingRecords) && (
        <div className={`surface-card border-l-4 ${isErrorRecords ? 'border-l-[#EF4444]' : 'border-l-[var(--brand-primary)]'} p-4`}>
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm text-[var(--text-secondary)]">{isErrorRecords ? errorMessage : 'Loading records...'}</div>
            {isErrorRecords && <button onClick={() => refetchRecords()} className="rounded-lg bg-[#FEF2F2] px-3 py-2 text-sm font-medium text-[#B91C1C]">Retry</button>}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="border-b border-[var(--border-default)]">
          <div className="flex items-center gap-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSearchParams(tab.id === 'all' ? {} : { status: tab.id })}
                className={`relative -mb-px border-b-2 px-1 py-3 text-sm font-medium transition-colors ${activeTab === tab.id ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
              >
                <span>{tab.label}</span>
                {tab.id !== 'all' && <span className="ml-2 rounded-full bg-[var(--surface-tertiary)] px-2 py-0.5 text-[11px] text-[var(--text-secondary)]">{tab.count}</span>}
              </button>
            ))}
          </div>
        </div>

        <section className="surface-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-shell w-full min-w-[940px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[var(--border-default)]">
                  <th className="px-4 py-3.5">Record ID</th>
                  <th className="px-4 py-3.5">Source</th>
                  <th className="px-4 py-3.5">Activity Description</th>
                  <th className="px-4 py-3.5">Period</th>
                  <th className="px-4 py-3.5 text-right">Raw Value</th>
                  <th className="px-4 py-3.5 text-right">Normalized</th>
                  <th className="px-4 py-3.5">Scope</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tabbedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-16 text-center">
                      <div className="mx-auto max-w-sm space-y-3">
                        <ClipboardDocumentCheckIcon className="mx-auto h-10 w-10 text-[var(--text-muted)]" />
                        <div className="text-[15px] font-medium text-[var(--text-primary)]">All caught up. No records need review.</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  tabbedRecords.map((record, index) => {
                    const status = (record.status || '').toLowerCase()
                    const sourceType = (record.source_type || record.source || '').toLowerCase()
                    return (
                      <tr
                        key={record.id}
                        onClick={() => {
                          setActiveRecordId(record.id)
                          setIsPanelOpen(true)
                        }}
                        className={`border-b border-[var(--border-default)] cursor-pointer hover:bg-[var(--surface-secondary)] ${status === 'flagged' ? 'border-l-2 border-l-[#F59E0B] animate-pulse-border' : ''}`}
                      >
                        <td className="px-4 py-4 font-mono text-[12px] font-medium text-[var(--text-primary)]">{record.id}</td>
                        <td className="px-4 py-4 text-sm text-[var(--text-secondary)]">{sourceType || record.source || 'SAP'}</td>
                        <td className="px-4 py-4 text-sm text-[var(--text-secondary)]">
                          {record.description}
                          {status === 'failed' && record.parse_error && <div className="mt-1 text-[12px] text-[#B91C1C]">{record.parse_error}</div>}
                          {status === 'flagged' && record.flag_message && <div className="mt-1 text-[12px] text-[#B45309]">{record.flag_message}</div>}
                        </td>
                        <td className="px-4 py-4 text-sm text-[var(--text-secondary)]">{record.period || 'Oct 2023'}</td>
                        <td className="px-4 py-4 text-right text-sm text-[var(--text-secondary)]">{record.rawValue || `${Number(record.quantity || 0).toLocaleString()} ${record.unit || ''}`}</td>
                        <td className="px-4 py-4 text-right text-sm text-[var(--text-primary)]">{record.normalized || `${Number(record.calculated_kgco2e || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</td>
                        <td className="px-4 py-4"><ScopeBadge scope={record.scope} /></td>
                        <td className="px-4 py-4"><StatusBadge status={record.status} /></td>
                        <td className="px-4 py-4">
                          <button className="inline-flex items-center gap-1 text-sm font-medium text-[var(--brand-primary)] opacity-0 transition-all duration-150 hover:translate-x-0 hover:opacity-100 group-hover:opacity-100">Review →</button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="surface-card overflow-hidden">
        <button onClick={() => setIsPreviewOpen((s) => !s)} className="flex w-full items-center justify-between px-6 py-5 text-left">
          <div>
            <div className="text-[18px] font-semibold text-[var(--text-primary)]">Raw File Preview</div>
            <div className="mt-1 text-[12px] text-[var(--text-muted)]">First 10 lines of the uploaded file</div>
          </div>
          <ChevronDownIcon className={`h-5 w-5 text-[var(--text-muted)] transition-transform ${isPreviewOpen ? 'rotate-180' : ''}`} />
        </button>
        {isPreviewOpen && (
          <div className="border-t border-[var(--border-default)] p-6">
            {isLoadingPreview ? (
              <div className="h-40 rounded-lg bg-[var(--surface-tertiary)] animate-pulse" />
            ) : rawLines.length > 0 ? (
              <div className="relative">
                <button onClick={copiedText} className="absolute right-3 top-3 z-10 rounded-lg bg-white/10 px-3 py-1 text-xs font-medium text-slate-200 border border-white/10">
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <pre className="max-h-80 overflow-auto rounded-lg bg-slate-900 p-3 text-[13px] leading-6 text-slate-200">
                  {rawLines.slice(0, 10).map((line, idx) => <div key={idx} className="whitespace-pre-wrap break-words">{line}</div>)}
                  {rawLines.length > 10 && <div className="mt-2 text-[12px] text-slate-400">... and {rawLines.length - 10} more lines</div>}
                </pre>
              </div>
            ) : (
              <div className="text-sm text-[var(--text-muted)]">No preview data available for this import.</div>
            )}
          </div>
        )}
      </section>

      <RecordDetailPanel recordId={activeRecordId} isOpen={isPanelOpen} onClose={() => { setIsPanelOpen(false); setActiveRecordId(null) }} onAdvanceNext={() => {}} />
    </div>
  )
}

export default ImportDetail
