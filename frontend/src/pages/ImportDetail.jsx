import React, { useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getImport, getImportPreview, reingestImport } from '../api/imports'
import apiClient from '../api/client'
import StatusBadge from '../components/StatusBadge'
import QualityBadge from '../components/QualityBadge'
import ScopeBadge from '../components/ScopeBadge'
import RecordDetailPanel from '../components/RecordDetailPanel'
import useToast from '../hooks/useToast'
import { useClient } from '../context/ClientContext'

const ImportDetail = () => {
  const { importId } = useParams()
  const { clientId } = useClient()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const toast = useToast()

  // Selected tab: 'all' | 'failed' | 'flagged'
  const activeTab = searchParams.get('status') || 'all'

  // Selected record for details slide-in
  const [activeRecordId, setActiveRecordId] = useState(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  // Fetch Import Job Metadata
  const {
    data: importJob,
    isLoading: isLoadingJob,
    isError: isErrorJob,
    refetch: refetchJob,
  } = useQuery({
    queryKey: ['import-job', importId],
    queryFn: () => getImport(importId),
    enabled: !!importId,
  })

  // Fetch Import Records based on activeTab status
  const {
    data: importRecords,
    isLoading: isLoadingRecords,
    refetch: refetchRecords,
  } = useQuery({
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

  // Fetch Raw File Preview
  const { data: previewData, isLoading: isLoadingPreview } = useQuery({
    queryKey: ['import-preview', importId],
    queryFn: () => getImportPreview(importId),
    enabled: !!importId,
  })

  // Mutation: Re-ingest
  const reingestMutation = useMutation({
    mutationFn: () => reingestImport(importId),
    onSuccess: (data) => {
      toast.success('Successfully triggered re-ingestion job!')
      queryClient.invalidateQueries(['records'])
      queryClient.invalidateQueries(['summary', clientId])
      refetchJob()
      refetchRecords()
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Re-ingestion failed.')
    },
  })

  const handleTabChange = (tabName) => {
    setSearchParams({ status: tabName })
  }

  // Formatting helper
  const formatNum = (val) => {
    if (val === undefined || val === null) return '0'
    return Number(val).toLocaleString()
  }

  const qualityScoreDisplay = importJob?.quality_score == null
    ? '—'
    : `${Math.round((Number(importJob.quality_score) <= 1 ? Number(importJob.quality_score) * 100 : Number(importJob.quality_score)))}%`

  if (isLoadingJob) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6 animate-pulse text-left">
        <div className="h-8 w-64 bg-gray-200 rounded"></div>
        <div className="h-32 bg-gray-100 rounded-xl"></div>
        <div className="h-64 bg-gray-100 rounded-xl"></div>
      </div>
    )
  }

  if (isErrorJob || !importJob) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12 text-center font-sans">
        <h2 className="text-lg font-semibold text-red-500">Failed to load import job details.</h2>
        <button onClick={() => refetchJob()} className="mt-4 px-4 py-2 bg-slate-100 rounded font-bold text-xs">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8 text-left font-sans">
      
      {/* Breadcrumbs / Back button */}
      <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
        <button onClick={() => navigate('/ingest')} className="hover:text-gray-600">
          Data Ingestion
        </button>
        <span>/</span>
        <span className="text-gray-600 font-bold uppercase">Import #{importId.substring(0, 8)}</span>
      </div>

      {/* Header Stats */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-gray-900 truncate max-w-lg">
              {importJob.filename || 'Direct API Ingestion'}
            </h1>
            <StatusBadge status={importJob.status} />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Uploaded by {importJob.uploaded_by_email || 'System'} &bull; {new Date(importJob.uploaded_at).toLocaleString()}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-xs font-bold text-gray-500">
          <div className="bg-slate-50 border p-3 rounded-xl min-w-[100px] text-center">
            <span className="block text-gray-400 uppercase tracking-wider text-[9px] mb-0.5">Total Records</span>
            <span className="text-lg text-gray-900">{formatNum(importJob.total_records)}</span>
          </div>
          <div className="bg-slate-50 border p-3 rounded-xl min-w-[140px] text-center">
            <span className="block text-gray-400 uppercase tracking-wider text-[9px] mb-0.5">Quality</span>
            <div className="flex items-center justify-center">
              <QualityBadge
                grade={importJob.grade}
                score={importJob.quality_score}
                parseFailures={importJob.error_log?.length ?? importJob.failed_records ?? 0}
                outliers={importJob.outlier_count ?? 0}
                unitIssues={importJob.unit_issue_count ?? 0}
                showInterpretation
              />
            </div>
            <span className="mt-1 block text-[10px] font-semibold text-gray-500">{qualityScoreDisplay}</span>
          </div>
          <div className="bg-emerald-50/50 border border-emerald-100 p-3 rounded-xl min-w-[100px] text-center text-emerald-800">
            <span className="block text-emerald-600/70 uppercase tracking-wider text-[9px] mb-0.5">Successful</span>
            <span className="text-lg text-emerald-950">{formatNum(importJob.successful_records)}</span>
          </div>
          <div className="bg-red-50/50 border border-red-100 p-3 rounded-xl min-w-[100px] text-center text-red-800">
            <span className="block text-red-600/70 uppercase tracking-wider text-[9px] mb-0.5">Failed / Errors</span>
            <span className="text-lg text-red-950">{formatNum(importJob.failed_records)}</span>
          </div>

          {importJob.status === 'failed' && (
            <button
              onClick={() => reingestMutation.mutate()}
              disabled={reingestMutation.isPending}
              className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
            >
              {reingestMutation.isPending ? 'Re-ingesting...' : 'Re-ingest'}
            </button>
          )}
        </div>
      </div>

      {/* Main Layout: Records table & raw file preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Import Records and tabs */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Tab Bar */}
          <div className="border-b border-gray-200">
            <nav className="flex gap-6 text-sm font-semibold">
              {[
                { id: 'all', label: 'All Records' },
                { id: 'failed', label: 'Failed / Rejected' },
                { id: 'flagged', label: 'Flagged' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`pb-4 border-b-2 font-bold px-1 transition-all ${
                    activeTab === tab.id
                      ? 'border-teal-600 text-[#115e59]'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Records Table */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-xs border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3.5">ID</th>
                    <th className="px-6 py-3.5">Description</th>
                    <th className="px-6 py-3.5 text-right">Value</th>
                    <th className="px-6 py-3.5 text-right">kgCO₂e</th>
                    <th className="px-6 py-3.5">Scope</th>
                    <th className="px-6 py-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                  {isLoadingRecords ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                        Loading records...
                      </td>
                    </tr>
                  ) : !importRecords || importRecords.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-semibold">
                        No records match the selected tab.
                      </td>
                    </tr>
                  ) : (
                    importRecords.map((record) => (
                      <tr
                        key={record.id}
                        onClick={() => {
                          setActiveRecordId(record.id)
                          setIsPanelOpen(true)
                        }}
                        className="cursor-pointer hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="px-6 py-4 font-mono font-bold text-xs text-gray-900">
                          #RE-{record.id.substring(0, 8)}
                        </td>
                        <td className="px-6 py-4 truncate max-w-[200px]">
                          {record.description}
                        </td>
                        <td className="px-6 py-4 text-right text-xs text-gray-500 whitespace-nowrap">
                          {Number(record.quantity).toLocaleString()} {record.unit}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-emerald-800 whitespace-nowrap">
                          {Number(record.calculated_kgco2e).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4">
                          <ScopeBadge scope={record.scope} />
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={record.status} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Side: Raw File Preview & Error Log */}
        <div className="space-y-6">
          
          {/* Error Log Block */}
          {importJob.error_log && importJob.error_log.length > 0 && (
            <div className="bg-red-50/50 border border-red-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-red-950 mb-3 tracking-tight">Ingest Error Log</h3>
              <div className="max-h-[160px] overflow-y-auto space-y-2 text-xs font-medium text-red-800">
                {importJob.error_log.map((log, idx) => (
                  <div key={idx} className="bg-white border border-red-100 rounded-lg p-3">
                    <span className="block text-[10px] font-bold text-red-400 tracking-wider uppercase mb-0.5">Row {log.row_index || idx + 1}</span>
                    <p className="leading-relaxed font-mono">{log.error || log.message || JSON.stringify(log)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Raw File Preview */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col gap-3">
            <h3 className="text-sm font-bold text-gray-900 tracking-tight">Raw File Preview</h3>
            <p className="text-[11px] text-gray-400 font-semibold uppercase leading-none mb-1">First 10 lines of file</p>
            
            {isLoadingPreview ? (
              <div className="h-40 bg-gray-50 rounded-xl animate-pulse"></div>
            ) : previewData?.lines && previewData.lines.length > 0 ? (
              <pre className="bg-slate-900 text-slate-100 font-mono text-[10px] leading-relaxed p-4 rounded-xl overflow-x-auto text-left max-h-[300px]">
                {previewData.lines.slice(0, 10).map((line, idx) => (
                  <div key={idx} className="whitespace-pre">
                    <span className="text-slate-500 select-none mr-2 font-bold inline-block w-4 text-right">
                      {idx + 1}
                    </span>
                    {line}
                  </div>
                ))}
              </pre>
            ) : (
              <div className="bg-slate-50 rounded-xl p-6 text-center text-xs text-gray-400 font-medium">
                No preview data available for this ingestion source.
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Record details panel slideout */}
      <RecordDetailPanel
        recordId={activeRecordId}
        isOpen={isPanelOpen}
        onClose={() => {
          setIsPanelOpen(false)
          setActiveRecordId(null)
          refetchRecords()
          refetchJob()
        }}
      />

    </div>
  )
}

export default ImportDetail
