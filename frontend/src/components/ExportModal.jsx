import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getExportCount } from '../api/summary'
import apiClient from '../api/client'
import useToast from '../hooks/useToast'

const ExportModal = ({ isOpen, onClose, clientId }) => {
  const toast = useToast()

  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [format, setFormat] = useState('csv')
  const [scopes, setScopes] = useState({ 1: true, 2: true, 3: true })
  const [isExporting, setIsExporting] = useState(false)

  // Debounced count query
  const [debouncedFrom, setDebouncedFrom] = useState(dateFrom)
  const [debouncedTo, setDebouncedTo] = useState(dateTo)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedFrom(dateFrom)
      setDebouncedTo(dateTo)
    }, 500)
    return () => clearTimeout(handler)
  }, [dateFrom, dateTo])

  const selectedScopes = Object.entries(scopes)
    .filter(([, v]) => v)
    .map(([k]) => k)
    .join(',')

  const {
    data: countData,
    isLoading: isLoadingCount,
  } = useQuery({
    queryKey: ['export-count', clientId, debouncedFrom, debouncedTo, selectedScopes],
    queryFn: () =>
      getExportCount({
        client: clientId,
        from: debouncedFrom,
        to: debouncedTo,
        scopes: selectedScopes,
      }),
    enabled: isOpen && !!clientId && !!debouncedFrom && !!debouncedTo,
  })

  const recordCount = countData?.count ?? null

  const handleScopeToggle = (scopeNum) => {
    setScopes((prev) => ({ ...prev, [scopeNum]: !prev[scopeNum] }))
  }

  const handleExport = async () => {
    if (!dateFrom || !dateTo) return

    setIsExporting(true)
    try {
      const params = new URLSearchParams({
        client: clientId,
        from: dateFrom,
        to: dateTo,
        format,
        scopes: selectedScopes,
      })

      const response = await apiClient.get(`/api/export/?${params.toString()}`, {
        responseType: 'blob',
      })

      // Create download link
      const blob = new Blob([response.data], {
        type: format === 'csv' ? 'text/csv' : 'application/json',
      })
      const url = window.URL.createObjectURL(blob)
      const fileName = `veridian-export-${dateFrom}-to-${dateTo}.${format}`
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast.success(`Export complete: ${fileName}`)
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Export failed. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 z-[60] transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[61] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-lg w-full overflow-hidden font-sans animate-slide-in">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-gray-900">Export for Auditors</h2>
              <p className="text-[10px] text-gray-400 font-medium mt-0.5">Generate audit-ready emission data exports</p>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-slate-100"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-5">
            {/* Date Range */}
            <div>
              <label className="block text-[10px] font-bold text-gray-500 tracking-wider uppercase mb-2">
                Date Range
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] text-gray-400 font-semibold block uppercase mb-1">From</span>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2 focus:ring-1 focus:ring-teal-500 bg-white"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-semibold block uppercase mb-1">To</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2 focus:ring-1 focus:ring-teal-500 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Format */}
            <div>
              <label className="block text-[10px] font-bold text-gray-500 tracking-wider uppercase mb-2">
                Format
              </label>
              <div className="flex gap-4">
                {[
                  { value: 'csv', label: 'CSV' },
                  { value: 'json', label: 'JSON' },
                ].map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="format"
                      value={opt.value}
                      checked={format === opt.value}
                      onChange={() => setFormat(opt.value)}
                      className="text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-xs font-semibold text-gray-700">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Scope Filter */}
            <div>
              <label className="block text-[10px] font-bold text-gray-500 tracking-wider uppercase mb-2">
                Scope Filter
              </label>
              <div className="flex gap-4">
                {[1, 2, 3].map((s) => (
                  <label key={s} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scopes[s]}
                      onChange={() => handleScopeToggle(s)}
                      className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-xs font-semibold text-gray-700">Scope {s}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Preview Count */}
            <div className="bg-slate-50 border border-gray-200 rounded-xl p-3 text-center">
              {!dateFrom || !dateTo ? (
                <span className="text-xs text-gray-400 font-medium">Select a date range to preview</span>
              ) : isLoadingCount ? (
                <span className="text-xs text-gray-400 font-medium animate-pulse">Counting records...</span>
              ) : recordCount === 0 ? (
                <span className="text-xs text-amber-600 font-semibold">No locked records in this date range.</span>
              ) : (
                <span className="text-xs text-gray-700 font-medium">
                  Estimated <span className="font-bold text-[#115e59]">{recordCount?.toLocaleString()}</span> locked records in this range
                </span>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 bg-slate-50/50 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 hover:bg-slate-50 text-gray-700 text-xs font-bold rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={!dateFrom || !dateTo || recordCount === 0 || isExporting}
              className="px-4 py-2 bg-[#115e59] hover:bg-[#0f766e] text-white text-xs font-bold rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isExporting ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default ExportModal
