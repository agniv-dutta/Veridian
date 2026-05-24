import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { getSummary, getScopeTrend } from '../api/summary'
import { getImports } from '../api/imports'
import StatusBadge from '../components/StatusBadge'
import QualityBadge from '../components/QualityBadge'
import ScopeBreakdownChart from '../components/ScopeBreakdownChart'
import ExportModal from '../components/ExportModal'
import { DocumentIcon, BoltIcon, PaperAirplaneIcon } from '../components/ImportSourceIcon'
import { useAuth } from '../context/AuthContext'
import { useClient } from '../context/ClientContext'

const Dashboard = () => {
  const { clientId } = useClient()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isExportOpen, setIsExportOpen] = React.useState(false)

  // Fetch summary metrics
  const {
    data: summaryData,
    isLoading: isLoadingSummary,
    isError: isErrorSummary,
    error: summaryError,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ['summary', clientId],
    queryFn: () => getSummary(clientId),
    enabled: !!clientId,
  })

  // Fetch recent imports (limit 10)
  const {
    data: importsData,
    isLoading: isLoadingImports,
    isError: isErrorImports,
    error: importsError,
    refetch: refetchImports,
  } = useQuery({
    queryKey: ['recent-imports', clientId],
    queryFn: () => getImports({ client: clientId, limit: 10 }),
    enabled: !!clientId,
  })

  const {
    data: scopeTrendData,
    isLoading: isLoadingScopeTrend,
  } = useQuery({
    queryKey: ['scope-trend', clientId],
    queryFn: () => getScopeTrend(clientId),
    enabled: !!clientId,
  })

  const handleRetryAll = () => {
    refetchSummary()
    refetchImports()
  }

  // Format Helper
  const formatNum = (val) => {
    if (val === undefined || val === null) return '0'
    return Number(val).toLocaleString()
  }

  // Source logo renderer
  const renderSourceIcon = (source) => {
    const srcLower = (source || '').toLowerCase()
    if (srcLower.includes('sap')) {
      return (
        <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
          <DocumentIcon className="w-5 h-5" />
        </div>
      )
    } else if (srcLower.includes('utility') || srcLower.includes('elec')) {
      return (
        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
          <BoltIcon className="w-5 h-5" />
        </div>
      )
    } else {
      return (
        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
          <PaperAirplaneIcon className="w-5 h-5" />
        </div>
      )
    }
  }

  // Skeleton Loader Component
  const MetricSkeleton = () => (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm animate-pulse space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-4 w-28 bg-gray-200 rounded"></div>
        <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
      </div>
      <div className="h-8 w-24 bg-gray-200 rounded"></div>
      <div className="h-4 w-40 bg-gray-200 rounded"></div>
    </div>
  )

  const TableSkeleton = () => (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-14 bg-gray-100 rounded-xl"></div>
      ))}
    </div>
  )

  const hasErrors = isErrorSummary || isErrorImports
  const isAnyLoading = isLoadingSummary || isLoadingImports
  const isAdmin = user?.role === 'admin'

  const getImportBreakdown = (job) => ({
    parseFailures: job?.error_log?.length ?? job?.failed_records ?? 0,
    outliers: job?.outlier_count ?? 0,
    unitIssues: job?.unit_issue_count ?? 0,
  })

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8 text-left font-sans">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Data Integrity Overview</h1>
          <p className="text-sm text-gray-500 mt-1">Monitoring sustainability metrics and ingestion pipeline performance.</p>
        </div>
        <div>
          {isAdmin && (
            <button
              onClick={() => setIsExportOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 hover:bg-slate-50 text-gray-700 text-sm font-semibold rounded-lg shadow-sm transition-colors mr-2"
            >
              Export for auditors
            </button>
          )}
          <button
            onClick={() => navigate('/review')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#115e59] hover:bg-[#0f766e] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Analysis
          </button>
        </div>
      </div>

      <ScopeBreakdownChart data={scopeTrendData} isLoading={isLoadingScopeTrend} />

      {/* Error State Banner */}
      {hasErrors && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg flex items-start gap-3">
          <div className="text-red-500">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-grow">
            <h3 className="text-sm font-bold text-red-800">Connection Failed</h3>
            <p className="text-xs text-red-700 mt-1">
              {summaryError?.message || importsError?.message || 'Unable to communicate with the REST API. Ensure the server is online.'}
            </p>
          </div>
          <button
            onClick={handleRetryAll}
            className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-bold rounded transition-colors"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isAnyLoading ? (
          <>
            <MetricSkeleton />
            <MetricSkeleton />
            <MetricSkeleton />
            <MetricSkeleton />
          </>
        ) : (
          <>
            {/* Card 1: Total Imports */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col justify-between h-40">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-500 tracking-wide uppercase">Total Imports</span>
                <div className="p-2 bg-teal-50 text-[#115e59] rounded-lg">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </div>
              </div>
              <div className="mt-4">
                <div className="text-3xl font-extrabold text-gray-900">{formatNum(summaryData?.total_imports)}</div>
                <div className="text-xs font-medium text-emerald-600 mt-1 flex items-center gap-1">
                  <span>↗ 12.5%</span> <span className="text-gray-400">from last month</span>
                </div>
              </div>
            </div>

            {/* Card 2: Pending Review */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between h-40">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-500 tracking-wide uppercase">Pending Review</span>
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
              </div>
              <div className="mt-4">
                <div className="text-3xl font-extrabold text-gray-900">{formatNum(summaryData?.pending_review)}</div>
                <div className="text-xs font-medium text-amber-600 mt-1 flex items-center gap-1">
                  <span>⏰ 8</span> <span className="text-gray-400">requiring immediate action</span>
                </div>
              </div>
            </div>

            {/* Card 3: Flagged Records */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm border-l-4 border-l-red-500 flex flex-col justify-between h-40">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-500 tracking-wide uppercase">Flagged Records</span>
                <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
              <div className="mt-4">
                <div className="text-3xl font-extrabold text-gray-900">{formatNum(summaryData?.flagged_records)}</div>
                <div className="text-xs font-medium text-red-600 mt-1 flex items-center gap-1">
                  <span>⚠️</span> <span className="text-gray-400 font-semibold">Data variance detected</span>
                </div>
              </div>
            </div>

            {/* Card 4: Approved & Locked */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between h-40">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-500 tracking-wide uppercase">Approved & Locked</span>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>
              <div className="mt-4">
                <div className="text-3xl font-extrabold text-gray-900">{formatNum(summaryData?.approved_locked)}</div>
                <div className="text-xs font-medium text-emerald-600 mt-1 flex items-center gap-1">
                  <span>✓</span> <span className="text-gray-400">Ready for audit reporting</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Main Content Layout (Table left, Stats/Alerts right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Recent Imports */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-gray-900">Recent Imports</h2>
              <div className="flex items-center gap-2">
                <button className="p-1.5 hover:bg-gray-50 rounded text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                </button>
                <button className="p-1.5 hover:bg-gray-50 rounded text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-xs border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3.5">Source</th>
                    <th className="px-6 py-3.5">Import Date</th>
                    <th className="px-6 py-3.5 text-right">Records</th>
                    <th className="px-6 py-3.5 text-right">Flagged</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Quality</th>
                    <th className="px-6 py-3.5">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                  {isAnyLoading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8">
                        <TableSkeleton />
                      </td>
                    </tr>
                  ) : !importsData || importsData.results?.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-400 font-semibold">
                        No recent imports found.
                      </td>
                    </tr>
                  ) : (
                    importsData.results?.slice(0, 4).map((job) => (
                      <tr key={job.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 flex items-center gap-3">
                          {renderSourceIcon(job.source_type || 'SAP')}
                          <div>
                            <span className="font-semibold text-gray-900 block max-w-[120px] truncate">{job.filename || 'Direct API'}</span>
                            <span className="text-[10px] text-gray-400 font-semibold uppercase">{job.source_type || 'SAP'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">
                          {new Date(job.created_at).toLocaleDateString()} {new Date(job.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-gray-900">
                          {formatNum(job.records_count)}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-red-500">
                          {formatNum(job.flags_count || 0)}
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={job.status} />
                        </td>
                        <td className="px-6 py-4">
                          <QualityBadge
                            grade={job.grade}
                            score={job.quality_score}
                            {...getImportBreakdown(job)}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <Link
                            to={`/imports/${job.id}`}
                            className="text-xs font-bold text-[#115e59] hover:underline"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="border-t border-gray-100 bg-gray-50/50 p-4 text-center">
            <Link
              to="/ingest"
              className="text-xs font-bold text-[#115e59] hover:text-[#0f766e] flex items-center justify-center gap-1"
            >
              Show All Imports <span>→</span>
            </Link>
          </div>
        </div>

        {/* Right Side: Integrity Score & Active Alerts */}
        <div className="space-y-6">
          
          {/* Integrity Score */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-between h-[230px]">
            <h3 className="w-full text-left text-sm font-bold text-gray-900 tracking-tight">Integrity Score</h3>
            
            {/* SVG circular progress ring */}
            <div className="relative flex items-center justify-center mt-2">
              <svg className="w-28 h-28 transform -rotate-90">
                {/* Background Ring */}
                <circle
                  cx="56"
                  cy="56"
                  r="45"
                  className="stroke-gray-100"
                  strokeWidth="8"
                  fill="transparent"
                />
                {/* Progress Ring */}
                <circle
                  cx="56"
                  cy="56"
                  r="45"
                  className="stroke-[#115e59]"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 45}
                  strokeDashoffset={2 * Math.PI * 45 * (1 - 0.92)}
                  strokeLinecap="round"
                />
              </svg>
              {/* Inner score indicator */}
              <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-extrabold text-[#115e59]">92</span>
                <span className="text-[9px] font-bold text-emerald-600 tracking-widest uppercase mt-0.5">OPTIMAL</span>
              </div>
            </div>
            
            <p className="text-xs text-gray-500 font-medium mt-4">
              Data accuracy is up <strong className="text-emerald-600">4%</strong> this week.
            </p>
          </div>

          {/* Active Alerts */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col gap-4 text-left">
            <h3 className="text-sm font-bold text-gray-900 tracking-tight">Active Alerts</h3>
            
            {/* Alert 1 */}
            <div className="bg-red-50/50 border border-red-100 rounded-xl p-4 flex gap-3">
              <div className="p-1.5 bg-red-100 text-red-600 rounded-full h-fit flex-shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h4 className="text-xs font-bold text-red-900 leading-normal">Critical Schema Mismatch</h4>
                <p className="text-[11px] text-red-700 font-medium mt-0.5 leading-normal">
                  Utility API source changed headers.
                </p>
              </div>
            </div>

            {/* Alert 2 */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex gap-3">
              <div className="p-1.5 bg-slate-200 text-slate-600 rounded-full h-fit flex-shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800 leading-normal">Maintenance Window</h4>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-normal">
                  Tonight 02:00 - 04:00 UTC.
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        clientId={clientId}
      />

    </div>
  )
}

export default Dashboard
