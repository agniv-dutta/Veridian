import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getRecords, bulkApprove, bulkReject } from '../api/records'
import StatusBadge from '../components/StatusBadge'
import ScopeBadge from '../components/ScopeBadge'
import RecordDetailPanel from '../components/RecordDetailPanel'
import useToast from '../hooks/useToast'
import { useClient } from '../context/ClientContext'

const ReviewQueue = () => {
  const { clientId } = useClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const toast = useToast()

  // Selected row IDs for bulk actions
  const [selectedIds, setSelectedIds] = useState([])

  // Sidebar Filter local states (initialized from URL params or defaults)
  const [localSource, setLocalSource] = useState(() => searchParams.get('source') || '')
  const [localScope, setLocalScope] = useState(() => searchParams.get('scope') || '')
  const [localStatus, setLocalStatus] = useState(() => searchParams.get('status') || '')
  const [localDateFrom, setLocalDateFrom] = useState(() => searchParams.get('date_from') || '')
  const [localDateTo, setLocalDateTo] = useState(() => searchParams.get('date_to') || '')
  const [localPage, setLocalPage] = useState(() => parseInt(searchParams.get('page') || '1', 10))

  // Detail panel active state
  const [activeRecordId, setActiveRecordId] = useState(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  // Sync local filters with searchParams on initial load
  useEffect(() => {
    setLocalSource(searchParams.get('source') || '')
    setLocalScope(searchParams.get('scope') || '')
    setLocalStatus(searchParams.get('status') || '')
    setLocalDateFrom(searchParams.get('date_from') || '')
    setLocalDateTo(searchParams.get('date_to') || '')
    setLocalPage(parseInt(searchParams.get('page') || '1', 10))
  }, [searchParams])

  // Debouncing filters update to URL parameters
  useEffect(() => {
    const handler = setTimeout(() => {
      const currentParams = {}
      if (localSource) currentParams.source = localSource
      if (localScope) currentParams.scope = localScope
      if (localStatus) currentParams.status = localStatus
      if (localDateFrom) currentParams.date_from = localDateFrom
      if (localDateTo) currentParams.date_to = localDateTo
      if (localPage > 1) currentParams.page = localPage.toString()
      if (clientId) currentParams.client = clientId

      setSearchParams(currentParams)
    }, 400) // 400ms debounce

    return () => clearTimeout(handler)
  }, [localSource, localScope, localStatus, localDateFrom, localDateTo, localPage, clientId, setSearchParams])

  // API query keyed on search params
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

  const {
    data: recordsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['records', queryParams],
    queryFn: () => getRecords(queryParams),
    enabled: !!clientId,
  })

  // Bulk Approve Mutation
  const bulkApproveMutation = useMutation({
    mutationFn: (ids) => bulkApprove(ids),
    onSuccess: (data) => {
      toast.success(`Successfully approved ${data.approved || 0} records.`)
      setSelectedIds([])
      queryClient.invalidateQueries(['records'])
      queryClient.invalidateQueries(['summary'])
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Bulk approval failed.')
    },
  })

  // Bulk Reject Mutation
  const bulkRejectMutation = useMutation({
    mutationFn: (ids) => bulkReject(ids),
    onSuccess: (data) => {
      toast.success(`Successfully rejected ${data.rejected || 0} records.`)
      setSelectedIds([])
      queryClient.invalidateQueries(['records'])
      queryClient.invalidateQueries(['summary'])
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Bulk rejection failed.')
    },
  })

  const handleBulkApprove = () => {
    if (selectedIds.length === 0) return
    const confirmed = window.confirm(
      `You are about to approve ${selectedIds.length} records. This cannot be undone once locked.`
    )
    if (confirmed) {
      bulkApproveMutation.mutate(selectedIds)
    }
  }

  const handleBulkReject = () => {
    if (selectedIds.length === 0) return
    const confirmed = window.confirm(
      `You are about to reject ${selectedIds.length} records. This cannot be undone.`
    )
    if (confirmed) {
      bulkRejectMutation.mutate(selectedIds)
    }
  }

  const handleSelectAll = (e) => {
    if (e.target.checked && recordsData?.results) {
      setSelectedIds(recordsData.results.map((r) => r.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleSelectRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const clearFilters = () => {
    setLocalSource('')
    setLocalScope('')
    setLocalStatus('')
    setLocalDateFrom('')
    setLocalDateTo('')
    setLocalPage(1)
    setSearchParams(clientId ? { client: clientId } : {})
  }

  // Row Highlights Mapper
  const getRowClassName = (record) => {
    const status = (record.status || '').toLowerCase()
    let classes = 'cursor-pointer hover:bg-slate-50/50 transition-colors '
    
    if (status === 'flagged') {
      classes += 'border-l-4 border-l-amber-400 bg-amber-50/10'
    } else if (status === 'approved') {
      classes += 'opacity-65 bg-slate-50/30'
    } else if (status === 'rejected') {
      classes += 'text-red-700 bg-red-50/5'
    }
    return classes
  }

  // Format kgCO2e to tCO2e
  const formatTco2e = (kgVal) => {
    if (!kgVal) return '0.00 tCO₂e'
    const tVal = Number(kgVal) / 1000
    return `${tVal.toFixed(2)} tCO₂e`
  }

  // Formats Period date range
  const formatPeriod = (start, end) => {
    if (!start) return '—'
    const sDate = new Date(start)
    return sDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col lg:flex-row gap-8 font-sans">
      
      {/* Left Sidebar Filters */}
      <aside className="w-full lg:w-64 flex-shrink-0 text-left bg-white border border-gray-200 rounded-2xl p-6 shadow-sm h-fit">
        <h3 className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-4">Queue Filters</h3>
        
        <div className="space-y-6">
          
          {/* Source Filter */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Source Type</label>
            <select
              value={localSource}
              onChange={(e) => {
                setLocalSource(e.target.value)
                setLocalPage(1)
              }}
              className="w-full text-xs font-medium border border-gray-300 rounded-lg p-2 focus:ring-1 focus:ring-teal-500 bg-white"
            >
              <option value="">All Sources</option>
              <option value="sap">SAP ERP</option>
              <option value="utility">Utility API</option>
              <option value="travel">Travel Portal</option>
            </select>
          </div>

          {/* Scope Filter */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Emissions Scope</label>
            <select
              value={localScope}
              onChange={(e) => {
                setLocalScope(e.target.value)
                setLocalPage(1)
              }}
              className="w-full text-xs font-medium border border-gray-300 rounded-lg p-2 focus:ring-1 focus:ring-teal-500 bg-white"
            >
              <option value="">All Scopes</option>
              <option value="1">Scope 1 (Direct)</option>
              <option value="2">Scope 2 (Indirect)</option>
              <option value="3">Scope 3 (Value Chain)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Status</label>
            <select
              value={localStatus}
              onChange={(e) => {
                setLocalStatus(e.target.value)
                setLocalPage(1)
              }}
              className="w-full text-xs font-medium border border-gray-300 rounded-lg p-2 focus:ring-1 focus:ring-teal-500 bg-white"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="flagged">Flagged</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Date range inputs */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Date Range</label>
            <div className="space-y-2">
              <div>
                <span className="text-[10px] text-gray-400 font-semibold block uppercase">From</span>
                <input
                  type="date"
                  value={localDateFrom}
                  onChange={(e) => {
                    setLocalDateFrom(e.target.value)
                    setLocalPage(1)
                  }}
                  className="w-full text-xs border border-gray-300 rounded-lg p-1.5 focus:ring-1 focus:ring-teal-500 bg-white"
                />
              </div>
              <div>
                <span className="text-[10px] text-gray-400 font-semibold block uppercase">To</span>
                <input
                  type="date"
                  value={localDateTo}
                  onChange={(e) => {
                    setLocalDateTo(e.target.value)
                    setLocalPage(1)
                  }}
                  className="w-full text-xs border border-gray-300 rounded-lg p-1.5 focus:ring-1 focus:ring-teal-500 bg-white"
                />
              </div>
            </div>
          </div>

          <button
            onClick={clearFilters}
            className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
          >
            Clear Filters
          </button>

        </div>
      </aside>

      {/* Main Table Panel */}
      <main className="flex-grow space-y-6 text-left">
        
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Analyst Review Queue</h1>
            <p className="text-sm text-gray-500 mt-1">Audit, edit, and approve tenant emission records.</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 border border-gray-300 hover:bg-slate-50 text-gray-700 text-xs font-bold rounded-lg transition-colors">
              Export Report
            </button>
            <button
              onClick={() => navigate('/ingest')}
              className="px-4 py-2 bg-[#115e59] hover:bg-[#0f766e] text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
            >
              + New Analysis
            </button>
          </div>
        </div>

        {/* Error State Banner */}
        {isError && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg flex items-center justify-between">
            <p className="text-xs text-red-700 font-medium">
              {error?.message || 'Failed to fetch records. Connection issues detected.'}
            </p>
            <button onClick={() => refetch()} className="px-3 py-1 bg-red-100 text-red-800 text-xs font-bold rounded">
              Retry
            </button>
          </div>
        )}

        {/* Bulk Actions Panel */}
        {selectedIds.length > 0 && (
          <div className="bg-slate-50 border border-gray-300 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all">
            <div className="text-xs font-semibold text-gray-700">
              <span className="text-[#115e59] font-bold">{selectedIds.length}</span> records selected
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkApprove}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg shadow-sm transition-colors"
              >
                ✓ Approve Selected
              </button>
              <button
                onClick={handleBulkReject}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-300 hover:bg-red-100 text-red-800 text-xs font-bold rounded-lg shadow-sm transition-colors"
              >
                ✗ Reject Selected
              </button>
            </div>
          </div>
        )}

        {/* Records Table Card */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-xs border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3.5 w-10">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={
                        recordsData?.results?.length > 0 &&
                        selectedIds.length === recordsData.results.length
                      }
                      className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                    />
                  </th>
                  <th className="px-4 py-3.5">Record ID</th>
                  <th className="px-4 py-3.5">Source</th>
                  <th className="px-4 py-3.5">Activity Description</th>
                  <th className="px-4 py-3.5">Period</th>
                  <th className="px-4 py-3.5 text-right">Raw Value</th>
                  <th className="px-4 py-3.5 text-right">Normalized</th>
                  <th className="px-4 py-3.5">Scope</th>
                  <th className="px-4 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-16 text-center text-gray-400">
                      <div className="space-y-4 animate-pulse">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div key={i} className="h-10 bg-gray-100 rounded"></div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ) : !recordsData || recordsData.results?.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <p className="text-gray-500 font-semibold">No records match your filters</p>
                        <button
                          onClick={clearFilters}
                          className="text-xs font-bold text-[#115e59] hover:underline"
                        >
                          Clear filters
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  recordsData.results.map((record) => {
                    const isSelected = selectedIds.includes(record.id)
                    const isFlagged = (record.status || '').toLowerCase() === 'flagged'
                    const isRejected = (record.status || '').toLowerCase() === 'rejected'

                    return (
                      <tr
                        key={record.id}
                        onClick={() => {
                          setActiveRecordId(record.id)
                          setIsPanelOpen(true)
                        }}
                        className={getRowClassName(record)}
                      >
                        <td
                          className="px-4 py-4 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center gap-1">
                            {isFlagged && (
                              <span className="text-amber-500 font-bold" title="Flagged record">
                                ⚠️
                              </span>
                            )}
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectRow(record.id)}
                              className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                            />
                          </div>
                        </td>
                        <td className={`px-4 py-4 font-mono font-bold text-xs ${isRejected ? 'text-red-700' : 'text-gray-900'}`}>
                          #RE-{record.id}
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-xs font-semibold px-2 py-0.5 bg-gray-100 rounded text-gray-600 uppercase border border-gray-200">
                            {record.source_type || 'sap'}
                          </span>
                        </td>
                        <td className={`px-4 py-4 max-w-[200px] truncate ${isRejected ? 'text-red-600 font-semibold' : ''}`}>
                          {record.description || '—'}
                        </td>
                        <td className="px-4 py-4 text-xs text-gray-500 whitespace-nowrap">
                          {formatPeriod(record.period_start, record.period_end)}
                        </td>
                        <td className="px-4 py-4 text-right text-xs text-gray-600 whitespace-nowrap">
                          {Number(record.quantity).toLocaleString()} {record.unit}
                        </td>
                        <td className={`px-4 py-4 text-right whitespace-nowrap ${isRejected ? 'text-red-600' : 'text-emerald-700 font-bold'}`}>
                          {formatTco2e(record.calculated_kgco2e)}
                        </td>
                        <td className="px-4 py-4">
                          <ScopeBadge scope={record.scope} />
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge status={record.status} />
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination Panel */}
        {recordsData && recordsData.count > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
            <div className="text-xs text-gray-500 font-semibold">
              Showing <span className="text-gray-900">{(localPage - 1) * 50 + 1}</span> -{' '}
              <span className="text-gray-900">{Math.min(localPage * 50, recordsData.count)}</span> of{' '}
              <span className="text-gray-900">{recordsData.count}</span> records
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <button
                  disabled={localPage === 1}
                  onClick={() => setLocalPage((p) => Math.max(p - 1, 1))}
                  className="px-2.5 py-1.5 border border-gray-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-xs"
                >
                  Prev
                </button>
                <span className="text-xs font-semibold px-3 py-1.5 bg-slate-100 border border-gray-300 rounded-lg">
                  {localPage}
                </span>
                <button
                  disabled={localPage * 50 >= recordsData.count}
                  onClick={() => setLocalPage((p) => p + 1)}
                  className="px-2.5 py-1.5 border border-gray-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-xs"
                >
                  Next
                </button>
              </div>

              {/* Jump to page */}
              <div className="flex items-center gap-1 text-xs">
                <span className="text-gray-500 font-semibold">Go to page:</span>
                <input
                  type="number"
                  min="1"
                  max={Math.ceil(recordsData.count / 50)}
                  value={localPage}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10)
                    if (val > 0) setLocalPage(val)
                  }}
                  className="w-12 text-center border border-gray-300 rounded-lg p-1 font-semibold"
                />
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Record detail panel sliding drawer */}
      <RecordDetailPanel
        recordId={activeRecordId}
        isOpen={isPanelOpen}
        onClose={() => {
          setIsPanelOpen(false)
          setActiveRecordId(null)
        }}
      />

    </div>
  )
}

export default ReviewQueue
