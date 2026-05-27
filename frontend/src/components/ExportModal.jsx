import React, { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getExportCount } from '../api/summary'
import apiClient from '../api/client'
import useToast from '../hooks/useToast'
import { XMarkIcon, ArrowDownTrayIcon, InformationCircleIcon } from '@heroicons/react/24/outline'

const ExportModal = ({ isOpen, onClose, clientId }) => {
  const toast = useToast()
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [format, setFormat] = useState('csv')
  const [scopes, setScopes] = useState({ 1: true, 2: true, 3: true })
  const [isExporting, setIsExporting] = useState(false)
  const [debouncedFrom, setDebouncedFrom] = useState('')
  const [debouncedTo, setDebouncedTo] = useState('')
  const [debouncedScopes, setDebouncedScopes] = useState('1,2,3')

  useEffect(() => {
    const handler = window.setTimeout(() => {
      setDebouncedFrom(dateFrom)
      setDebouncedTo(dateTo)
      setDebouncedScopes(Object.entries(scopes).filter(([, value]) => value).map(([key]) => key).join(','))
    }, 400)
    return () => window.clearTimeout(handler)
  }, [dateFrom, dateTo, scopes])

  const {
    data: countData,
    isLoading: isLoadingCount,
    refetch: refetchCount,
  } = useQuery({
    queryKey: ['export-count', clientId, debouncedFrom, debouncedTo, debouncedScopes],
    queryFn: () => getExportCount({ client: clientId, from: debouncedFrom, to: debouncedTo, scopes: debouncedScopes }),
    enabled: isOpen && !!clientId && !!debouncedFrom && !!debouncedTo,
  })

  const recordCount = countData?.count ?? 0

  const handleScopeToggle = (scopeNum) => {
    setScopes((prev) => ({ ...prev, [scopeNum]: !prev[scopeNum] }))
  }

  const handleExport = async () => {
    if (!dateFrom || !dateTo || recordCount === 0) return
    setIsExporting(true)
    try {
      const params = new URLSearchParams({ client: clientId, from: dateFrom, to: dateTo, format, scopes: debouncedScopes })
      const response = await apiClient.get(`/api/export/?${params.toString()}`, { responseType: 'blob' })
      const blob = new Blob([response.data], { type: format === 'csv' ? 'text/csv' : 'application/json' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      const fileName = `veridian-export-${dateFrom}-to-${dateTo}.${format}`
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success(`Export prepared: ${fileName}`)
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Export failed. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const previewMessage = useMemo(() => {
    if (!dateFrom || !dateTo) return 'Select a date range to preview'
    if (isLoadingCount) return 'Counting locked records...'
    if (recordCount === 0) return 'No locked records in this range.'
    return `Estimated ${recordCount.toLocaleString()} locked records in this range`
  }, [dateFrom, dateTo, isLoadingCount, recordCount])

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/40" onClick={onClose} />
      <div className="fixed inset-0 z-[61] flex items-center justify-center p-4">
        <div className="surface-card w-full max-w-[480px] overflow-hidden p-0">
          <div className="flex items-start justify-between border-b border-[var(--border-default)] px-6 py-5">
            <div>
              <h2 className="text-[18px] font-semibold text-[var(--text-primary)]">Export Audit Report</h2>
              <p className="mt-1 text-[13px] text-[var(--text-muted)]">Generate audit-ready emission data exports</p>
            </div>
            <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-secondary)]">
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-5 px-6 py-6">
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">Date Range</label>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input-base h-10 px-3 text-sm" />
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input-base h-10 px-3 text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">Format</label>
              <div className="mt-2 inline-flex rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)] p-1">
                {['csv', 'json'].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setFormat(option)}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${format === option ? 'bg-white text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)]'}`}
                  >
                    {option.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">Scope</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {[1, 2, 3].map((scopeNum) => (
                  <label key={scopeNum} className="flex cursor-pointer items-center gap-2 rounded-full border border-[var(--border-default)] px-3 py-2 text-sm text-[var(--text-secondary)]">
                    <input type="checkbox" checked={scopes[scopeNum]} onChange={() => handleScopeToggle(scopeNum)} className="h-4 w-4 rounded border-[var(--border-strong)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]" />
                    Scope {scopeNum}
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-3 text-sm text-[#1D4ED8]">
              <div className="flex items-start gap-2">
                <InformationCircleIcon className="mt-0.5 h-5 w-5 flex-shrink-0" />
                <div>{previewMessage}</div>
              </div>
            </div>

            {recordCount === 0 && dateFrom && dateTo && (
              <div className="text-sm text-[#B91C1C]">No locked records in this range.</div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-[var(--border-default)] bg-[var(--surface-secondary)] px-6 py-4">
            <button onClick={onClose} className="rounded-lg border border-[var(--border-default)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)]">Cancel</button>
            <button
              onClick={handleExport}
              disabled={!dateFrom || !dateTo || recordCount === 0 || isExporting}
              className="button-primary inline-flex h-10 items-center gap-2 px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isExporting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Preparing export...
                </>
              ) : (
                <>
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  Download Report
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
