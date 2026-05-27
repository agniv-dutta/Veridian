import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getRecords, bulkApprove, bulkReject, getSparklines } from '../api/records'
import StatusBadge from '../components/StatusBadge'
import ScopeBadge from '../components/ScopeBadge'
import TrendSparkline from '../components/TrendSparkline'
import KeyboardShortcutsModal from '../components/KeyboardShortcutsModal'
import ExportModal from '../components/ExportModal'
import RecordDetailPanel from '../components/RecordDetailPanel'
import useKeyboardNav from '../hooks/useKeyboardNav'
import useToast from '../hooks/useToast'
import { useClient } from '../context/ClientContext'
import { useAuth } from '../context/AuthContext'
import {
  FunnelIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

const MOCK_RECORDS = [
  { id: 'REC-001', source: 'SAP', sourceType: 'sap', description: 'Diesel combustion – Plant 1001', period: 'Oct 1–31, 2023', rawValue: '1,200 L', normalized: '3,216.00', scope: 1, status: 'pending', current: 3216 },
  { id: 'REC-002', source: 'SAP', sourceType: 'sap', description: 'Diesel combustion – Plant 1002', period: 'Oct 1–31, 2023', rawValue: '980 L', normalized: '2,626.40', scope: 1, status: 'flagged', flagReason: '4.2σ above site mean', current: 2626.4 },
  { id: 'REC-003', source: 'Utility', sourceType: 'utility', description: 'Grid electricity – MTR-BOM-01', period: 'Oct 18–Nov 17, 2023', rawValue: '32,000 kWh', normalized: '26,240.00', scope: 2, status: 'pending', current: 26240 },
  { id: 'REC-004', source: 'Travel', sourceType: 'travel', description: 'Business travel – APAC Q4 roadshow', period: 'Oct 9–13, 2023', rawValue: '4,800 km', normalized: '1,224.00', scope: 3, status: 'approved', current: 1224 },
  { id: 'REC-005', source: 'Utility', sourceType: 'utility', description: 'Purchased electricity – Data center', period: 'Oct 1–31, 2023', rawValue: '0 kWh', normalized: '0.00', scope: 2, status: 'rejected', current: 0 },
]

const sourceLabelMap = {
  sap: 'SAP ERP',
  utility: 'Utility API',
  travel: 'Travel Portal',
}

const ReviewQueue = () => {
  const { clientId } = useClient()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const toast = useToast()

  const [selectedIds, setSelectedIds] = useState([])
  const [localSource, setLocalSource] = useState(() => searchParams.get('source') || '')
  const [localScope, setLocalScope] = useState(() => searchParams.get('scope') || '')
  const [localStatus, setLocalStatus] = useState(() => searchParams.get('status') || '')
  const [localDateFrom, setLocalDateFrom] = useState(() => searchParams.get('date_from') || '')
  const [localDateTo, setLocalDateTo] = useState(() => searchParams.get('date_to') || '')
  const [localPage, setLocalPage] = useState(() => parseInt(searchParams.get('page') || '1', 10))
  const [activeRecordId, setActiveRecordId] = useState(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [isKeyboardHelpOpen, setIsKeyboardHelpOpen] = useState(false)
  const [isExportOpen, setIsExportOpen] = useState(false)

  useEffect(() => {
    setLocalSource(searchParams.get('source') || '')
    setLocalScope(searchParams.get('scope') || '')
    setLocalStatus(searchParams.get('status') || '')
    setLocalDateFrom(searchParams.get('date_from') || '')
    setLocalDateTo(searchParams.get('date_to') || '')
    setLocalPage(parseInt(searchParams.get('page') || '1', 10))
  }, [searchParams])

  useEffect(() => {
    const handler = window.setTimeout(() => {
      const params = {}
      if (localSource) params.source = localSource
      if (localScope) params.scope = localScope
      if (localStatus) params.status = localStatus
      if (localDateFrom) params.date_from = localDateFrom
      if (localDateTo) params.date_to = localDateTo
      if (localPage > 1) params.page = localPage.toString()
      if (clientId) params.client = clientId
      setSearchParams(params)
    }, 250)

    return () => window.clearTimeout(handler)
  }, [localSource, localScope, localStatus, localDateFrom, localDateTo, localPage, clientId, setSearchParams])

  const queryParams = {
    client: clientId,
    source: searchParams.get('source') || '',
    scope: searchParams.get('scope') || '',
    status: searchParams.get('status') || '',
    date_from: searchParams.get('date_from') || '',
    date_to: searchParams.get('date_to') || '',
    page: searchParams.get('page') || '1',
    page_size: '50',
  }

  const { data: recordsData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['records', queryParams],
    queryFn: () => getRecords(queryParams),
    enabled: !!clientId,
  })

  const visibleRecords = recordsData?.results?.length ? recordsData.results : MOCK_RECORDS
  const hasBackendRecords = !!recordsData?.results?.length
  const visibleRecordIds = useMemo(() => visibleRecords.map((record) => record.id), [visibleRecords])

  const { data: sparklineMap } = useQuery({
    queryKey: ['sparklines', clientId, visibleRecordIds.join(',')],
    queryFn: () => getSparklines(clientId, visibleRecordIds),
    enabled: !!clientId && hasBackendRecords && visibleRecordIds.length > 0,
  })

  const bulkApproveMutation = useMutation({
    mutationFn: (ids) => bulkApprove(ids),
    onSuccess: (data) => {
      toast.success(`Successfully approved ${data.approved || 0} records.`)
      setSelectedIds([])
      queryClient.invalidateQueries({ queryKey: ['records'] })
      queryClient.invalidateQueries({ queryKey: ['summary'] })
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Bulk approval failed.')
    },
  })

  const bulkRejectMutation = useMutation({
    mutationFn: (ids) => bulkReject(ids),
    onSuccess: (data) => {
      toast.success(`Successfully rejected ${data.rejected || 0} records.`)
      setSelectedIds([])
      queryClient.invalidateQueries({ queryKey: ['records'] })
      queryClient.invalidateQueries({ queryKey: ['summary'] })
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Bulk rejection failed.')
    },
  })

  const clearFilters = () => {
    setLocalSource('')
    setLocalScope('')
    setLocalStatus('')
    setLocalDateFrom('')
    setLocalDateTo('')
    setLocalPage(1)
    setSearchParams(clientId ? { client: clientId } : {})
  }

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(visibleRecords.map((record) => record.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleSelectRow = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  const handleOpenRecordAtIndex = (index) => {
    if (!hasBackendRecords) return
    const record = visibleRecords[index]
    if (!record) return
    setHighlightedIndex(index)
    setActiveRecordId(record.id)
    setIsPanelOpen(true)
  }

  const handleAdvanceNext = () => {
    if (!hasBackendRecords || visibleRecords.length === 0) return
    const currentIndex = Math.max(visibleRecords.findIndex((record) => record.id === activeRecordId), 0)
    const nextIndex = currentIndex >= visibleRecords.length - 1 ? 0 : currentIndex + 1
    handleOpenRecordAtIndex(nextIndex)
  }

  const handleAdvancePrev = () => {
    if (!hasBackendRecords || visibleRecords.length === 0) return
    const currentIndex = Math.max(visibleRecords.findIndex((record) => record.id === activeRecordId), 0)
    const prevIndex = currentIndex <= 0 ? visibleRecords.length - 1 : currentIndex - 1
    handleOpenRecordAtIndex(prevIndex)
  }

  const triggerPanelAction = (action) => {
    document.querySelector(`[data-record-action="${action}"]`)?.click()
  }

  useEffect(() => {
    if (visibleRecords.length === 0) {
      setHighlightedIndex(0)
      return
    }
    setHighlightedIndex((current) => Math.min(current, visibleRecords.length - 1))
  }, [visibleRecords.length])

  useKeyboardNav({
    isPanelOpen,
    onApprove: () => triggerPanelAction('approve'),
    onReject: () => triggerPanelAction('reject'),
    onNext: handleAdvanceNext,
    onPrev: handleAdvancePrev,
    onOpenPanel: handleOpenRecordAtIndex,
    onClosePanel: () => {
      setIsPanelOpen(false)
      setActiveRecordId(null)
    },
    onShowHelp: () => setIsKeyboardHelpOpen(true),
    highlightedIndex,
    setHighlightedIndex,
    recordCount: visibleRecords.length,
  })

  const formatTco2e = (kgVal) => {
    if (!kgVal) return '0.00 tCO₂e'
    const tVal = Number(kgVal) / 1000
    return `${tVal.toFixed(2)} tCO₂e`
  }

  const formatPeriod = (start, end) => {
    if (!start) return '—'
    if (end && start !== end) return `${new Date(start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} – ${new Date(end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    return new Date(start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const isAdmin = user?.role === 'admin'
  const selectedCount = selectedIds.length

  return (
    <div className="px-8 py-8 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-[var(--text-primary)]">Analyst Review Queue</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Audit, edit, and approve tenant emission records.</p>
        </div>
        <button
          onClick={() => navigate('/ingest')}
          className="button-primary inline-flex h-10 items-center gap-2 px-5 text-sm font-medium"
        >
          <span className="text-base leading-none">+</span> New Analysis
        </button>
      </div>

      {selectedCount > 0 && (
        <div className="surface-card flex h-12 items-center justify-between gap-4 px-4 shadow-[var(--shadow-dropdown)] transition-all">
          <div className="text-sm text-[var(--text-secondary)]"><span className="font-semibold text-[var(--text-primary)]">{selectedCount}</span> records selected</div>
          <div className="flex items-center gap-2">
            <button onClick={() => bulkApproveMutation.mutate(selectedIds)} className="rounded-lg bg-[#ECFDF5] px-3 py-2 text-sm font-medium text-[#047857]">Approve Selected</button>
            <button onClick={() => bulkRejectMutation.mutate(selectedIds)} className="rounded-lg border border-[#EF4444] px-3 py-2 text-sm font-medium text-[#EF4444]">Reject Selected</button>
            <button onClick={() => setSelectedIds([])} className="text-sm font-medium text-[var(--brand-primary)]">Clear Selection</button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
        <aside className="surface-card h-fit p-5 xl:w-[240px] xl:flex-shrink-0">
          <h3 className="mb-4 text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">Queue Filters</h3>

          <div className="space-y-5">
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">Source Type</label>
              <div className="mt-2 relative">
                <select value={localSource} onChange={(e) => { setLocalSource(e.target.value); setLocalPage(1) }} className="input-base h-9 w-full appearance-none px-3 pr-8 text-sm">
                  <option value="">All Sources</option>
                  <option value="sap">SAP ERP</option>
                  <option value="utility">Utility API</option>
                  <option value="travel">Travel Portal</option>
                </select>
                <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-[var(--text-muted)]" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">Emissions Scope</label>
              <div className="mt-2 relative">
                <select value={localScope} onChange={(e) => { setLocalScope(e.target.value); setLocalPage(1) }} className="input-base h-9 w-full appearance-none px-3 pr-8 text-sm">
                  <option value="">All Scopes</option>
                  <option value="1">Scope 1 (Direct)</option>
                  <option value="2">Scope 2 (Indirect)</option>
                  <option value="3">Scope 3 (Value Chain)</option>
                </select>
                <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-[var(--text-muted)]" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">Status</label>
              <div className="mt-2 relative">
                <select value={localStatus} onChange={(e) => { setLocalStatus(e.target.value); setLocalPage(1) }} className="input-base h-9 w-full appearance-none px-3 pr-8 text-sm">
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="flagged">Flagged</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
                <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-[var(--text-muted)]" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">Date Range</label>
              <div className="mt-2 space-y-2">
                <input type="date" value={localDateFrom} onChange={(e) => { setLocalDateFrom(e.target.value); setLocalPage(1) }} className="input-base h-9 w-full px-3 text-sm" />
                <input type="date" value={localDateTo} onChange={(e) => { setLocalDateTo(e.target.value); setLocalPage(1) }} className="input-base h-9 w-full px-3 text-sm" />
              </div>
            </div>

            <button onClick={clearFilters} className="input-base h-9 w-full text-sm font-medium text-[var(--text-secondary)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]">Clear Filters</button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 space-y-6">
          {isError && (
            <div className="surface-card flex items-center justify-between border-l-4 border-l-[#EF4444] px-4 py-3">
              <p className="text-sm text-[#B91C1C]">{error?.message || 'Failed to fetch records. Connection issues detected.'}</p>
              <button onClick={() => refetch()} className="rounded-lg bg-[#FEF2F2] px-3 py-2 text-sm font-medium text-[#B91C1C]">Retry</button>
            </div>
          )}

          <section className="surface-card overflow-hidden">
            <div className="flex items-center justify-end border-b border-[var(--border-default)] px-6 py-4">
              {isAdmin && <button onClick={() => setIsExportOpen(true)} className="text-sm font-medium text-[var(--brand-primary)]">Export for auditors</button>}
            </div>

              <div className="overflow-x-auto">
                <table className="table-shell w-full min-w-[1100px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[var(--border-default)]">
                      <th className="px-4 py-3.5 w-10">
                        <input type="checkbox" onChange={handleSelectAll} checked={visibleRecords.length > 0 && selectedIds.length === visibleRecords.length} className="h-4 w-4 rounded border-[var(--border-strong)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]" />
                      </th>
                      <th className="w-6 px-0 py-3.5" />
                      <th className="px-4 py-3.5">Record ID</th>
                      <th className="px-4 py-3.5">Source</th>
                      <th className="px-4 py-3.5">Activity Description</th>
                      <th className="px-4 py-3.5">Period</th>
                      <th className="px-4 py-3.5 text-right">Raw Value</th>
                      <th className="px-4 py-3.5 text-right">Normalized (kgCO₂e)</th>
                      <th className="px-4 py-3.5">Scope</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr><td colSpan={11} className="px-6 py-16 text-center text-[var(--text-muted)]">Loading records...</td></tr>
                    ) : visibleRecords.length === 0 ? (
                      <tr><td colSpan={11} className="px-6 py-16 text-center text-[var(--text-muted)]">No records match your filters</td></tr>
                    ) : (
                      visibleRecords.map((record, index) => {
                        const isSelected = selectedIds.includes(record.id)
                        const sparklineData = sparklineMap?.[record.id]
                        const currentValue = Number(record.calculated_kgco2e || record.current || 0)
                        const sourceType = (record.source_type || record.source || '').toLowerCase()
                        const isFlagged = record.status === 'flagged'

                        return (
                          <tr
                            key={record.id}
                            onClick={() => handleOpenRecordAtIndex(index)}
                            style={{
                              borderLeft: isFlagged ? '3px solid #F59E0B' : '3px solid transparent',
                              backgroundColor: isFlagged ? '#FFFBEB' : 'transparent',
                              cursor: 'pointer',
                              transition: 'background 150ms',
                            }}
                            onMouseEnter={(e) => {
                              if (!isFlagged) e.currentTarget.style.background = '#F8FAFB'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = isFlagged ? '#FFFBEB' : 'transparent'
                            }}
                          >
                            <td className="px-4 py-4 align-middle" onClick={(e) => e.stopPropagation()}>
                              <input type="checkbox" checked={isSelected} onChange={() => handleSelectRow(record.id)} className="h-4 w-4 rounded border-[var(--border-strong)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]" />
                            </td>
                            <td className="w-6 px-0 py-4 align-middle">
                              {isFlagged && <span className="text-[14px] text-[#F59E0B]">⚠</span>}
                            </td>
                            <td className="px-4 py-4 font-mono text-[12px] font-medium text-[var(--text-primary)]">{record.id}</td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--brand-light)] text-[var(--brand-primary)] text-xs font-medium">{(sourceType || 's').slice(0, 1).toUpperCase()}</span>
                                <div>
                                  <div className="text-sm font-medium text-[var(--text-primary)]">{sourceLabelMap[sourceType] || record.source || 'Source'}</div>
                                  <div className="text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)]">{sourceType || 'sap'}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 max-w-[240px] truncate text-sm text-[var(--text-secondary)]">{record.description || '—'}</td>
                            <td className="px-4 py-4 text-sm text-[var(--text-secondary)]">{record.period || formatPeriod(record.period_start, record.period_end)}</td>
                            <td className="px-4 py-4 text-right text-sm text-[var(--text-secondary)]">{record.rawValue || `${Number(record.quantity || 0).toLocaleString()} ${record.unit || ''}`}</td>
                            <td className="px-4 py-4 text-right text-sm text-[var(--text-primary)]">
                              <div className="flex flex-col items-end gap-1">
                                <span className="font-medium">{record.normalized || formatTco2e(record.calculated_kgco2e || record.current)}</span>
                                {sparklineData && sparklineData.length > 0 && <TrendSparkline data={sparklineData} currentValue={currentValue} />}
                              </div>
                            </td>
                            <td className="px-4 py-4"><ScopeBadge scope={record.scope} /></td>
                            <td className="px-4 py-4"><StatusBadge status={record.status} /></td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2 text-[var(--brand-primary)]">
                                {hasBackendRecords && <button className="inline-flex items-center gap-1 text-sm font-medium"><EyeIcon className="h-4 w-4" />Open</button>}
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
        </main>
      </div>

      <RecordDetailPanel
        recordId={activeRecordId}
        isOpen={isPanelOpen}
        onClose={() => {
          setIsPanelOpen(false)
          setActiveRecordId(null)
        }}
        onAdvanceNext={handleAdvanceNext}
        onAdvancePrev={handleAdvancePrev}
      />

      <button type="button" onClick={() => setIsKeyboardHelpOpen(true)} className="fixed bottom-6 right-6 z-20 rounded-full border border-[var(--border-default)] bg-white px-3 py-2 text-xs font-medium text-[var(--text-secondary)] shadow-[var(--shadow-card)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]">Keyboard shortcuts</button>

      <KeyboardShortcutsModal isOpen={isKeyboardHelpOpen} onClose={() => setIsKeyboardHelpOpen(false)} />
      <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} clientId={clientId} />
    </div>
  )
}

export default ReviewQueue
