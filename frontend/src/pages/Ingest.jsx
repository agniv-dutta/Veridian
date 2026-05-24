import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getImports, ingestSAP, ingestUtility, ingestTravel, reingestImport } from '../api/imports'
import StatusBadge from '../components/StatusBadge'
import QualityBadge from '../components/QualityBadge'
import useToast from '../hooks/useToast'
import { DocumentIcon, BoltIcon, PaperAirplaneIcon } from '../components/ImportSourceIcon'
import { useClient } from '../context/ClientContext'

const Ingest = () => {
  const { clientId } = useClient()
  const queryClient = useQueryClient()
  const toast = useToast()
  const navigate = useNavigate()

  // State for files
  const [sapFile, setSapFile] = useState(null)
  const [utilityFile, setUtilityFile] = useState(null)
  const [travelFile, setTravelFile] = useState(null)
  
  // Travel Mode state: 'file' | 'json'
  const [travelMode, setTravelMode] = useState('file')
  const [travelJson, setTravelJson] = useState('')

  // Upload progress states (percentages)
  const [sapProgress, setSapProgress] = useState(0)
  const [utilityProgress, setUtilityProgress] = useState(0)
  const [travelProgress, setTravelProgress] = useState(0)

  // Fetch Import History
  const {
    data: importsData,
    isLoading: isLoadingImports,
    refetch: refetchImports,
  } = useQuery({
    queryKey: ['imports-history', clientId],
    queryFn: () => getImports({ client: clientId }),
    enabled: !!clientId,
  })

  // Re-ingest mutation
  const reingestMutation = useMutation({
    mutationFn: (importId) => reingestImport(importId),
    onSuccess: (data) => {
      toast.success('Successfully triggered re-ingestion job!')
      refetchImports()
      queryClient.invalidateQueries(['summary', clientId])
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Re-ingestion failed.')
    },
  })

  // SAP Ingestion Mutation
  const sapMutation = useMutation({
    mutationFn: ({ formData, config }) => ingestSAP(formData, config),
    onSuccess: (data) => {
      toast.success(`SAP Ingest success! Created ${data.records_count || 0} records.`)
      setSapFile(null)
      setSapProgress(0)
      refetchImports()
      queryClient.invalidateQueries(['summary', clientId])
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'SAP Ingestion failed.')
      setSapProgress(0)
    },
  })

  // Utility Ingestion Mutation
  const utilityMutation = useMutation({
    mutationFn: ({ formData, config }) => ingestUtility(formData, config),
    onSuccess: (data) => {
      toast.success(`Utility Ingest success! Created ${data.records_count || 0} records.`)
      setUtilityFile(null)
      setUtilityProgress(0)
      refetchImports()
      queryClient.invalidateQueries(['summary', clientId])
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Utility Ingestion failed.')
      setUtilityProgress(0)
    },
  })

  // Travel Ingestion Mutation
  const travelMutation = useMutation({
    mutationFn: ({ payload, config }) => ingestTravel(payload, config),
    onSuccess: (data) => {
      toast.success(`Travel Ingest success! Created ${data.records_count || 0} records.`)
      setTravelFile(null)
      setTravelJson('')
      setTravelProgress(0)
      refetchImports()
      queryClient.invalidateQueries(['summary', clientId])
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Travel Ingestion failed.')
      setTravelProgress(0)
    },
  })

  // SAP Upload Handler
  const handleSapUpload = () => {
    if (!sapFile) return toast.warning('Please select an IDoc file first.')
    const formData = new FormData()
    formData.append('file', sapFile)
    
    sapMutation.mutate({
      formData,
      config: {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          setSapProgress(percentCompleted)
        },
      },
    })
  }

  // Utility Upload Handler
  const handleUtilityUpload = () => {
    if (!utilityFile) return toast.warning('Please select a utility CSV file first.')
    const formData = new FormData()
    formData.append('file', utilityFile)

    utilityMutation.mutate({
      formData,
      config: {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          setUtilityProgress(percentCompleted)
        },
      },
    })
  }

  // Travel Upload/Paste Handler
  const handleTravelSubmit = () => {
    if (travelMode === 'file') {
      if (!travelFile) return toast.warning('Please select a travel export file first.')
      const formData = new FormData()
      formData.append('file', travelFile)
      
      travelMutation.mutate({
        payload: formData,
        config: {
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            setTravelProgress(percentCompleted)
          },
        },
      })
    } else {
      if (!travelJson.trim()) return toast.warning('Please paste a travel JSON object first.')
      try {
        const parsed = JSON.parse(travelJson)
        travelMutation.mutate({
          payload: parsed,
          config: {},
        })
      } catch (err) {
        toast.error('Invalid JSON structure. Please correct the formatting.')
      }
    }
  }

  const getSourceTableIcon = (source) => {
    const srcLower = (source || '').toLowerCase()
    if (srcLower.includes('sap')) {
      return <DocumentIcon className="w-5 h-5 text-slate-500" />
    } else if (srcLower.includes('utility')) {
      return <BoltIcon className="w-5 h-5 text-blue-500" />
    } else {
      return <PaperAirplaneIcon className="w-5 h-5 text-indigo-500" />
    }
  }

  const getImportBreakdown = (job) => ({
    parseFailures: job?.error_log?.length ?? job?.failed_records ?? 0,
    outliers: job?.outlier_count ?? 0,
    unitIssues: job?.unit_issue_count ?? 0,
  })

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8 text-left font-sans">
      
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Data Ingestion</h1>
        <p className="text-sm text-gray-500 mt-1">Streamline your environmental reporting by centralizing multi-source data streams.</p>
      </div>

      {/* Upload Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: SAP Ingest */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between h-[360px]">
          <div>
            <div className="flex items-center justify-between">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <DocumentIcon className="w-6 h-6" />
              </div>
              <button className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mt-4">SAP Fuel & Procurement</h3>
            <p className="text-xs text-gray-500 mt-1">Expects IDoc format with plant codes and document dates.</p>
          </div>

          <div className="mt-4 flex-grow flex flex-col justify-center">
            {sapProgress > 0 ? (
              <div className="w-full space-y-2">
                <div className="flex justify-between text-xs font-semibold text-gray-700">
                  <span>Uploading IDoc...</span>
                  <span>{sapProgress}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-600 h-full rounded-full transition-all duration-150" style={{ width: `${sapProgress}%` }}></div>
                </div>
              </div>
            ) : (
              <label className="border-2 border-dashed border-gray-300 hover:border-emerald-500 hover:bg-emerald-50/10 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all h-28">
                <svg className="w-8 h-8 text-gray-400 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                </svg>
                <span className="text-xs font-semibold text-gray-600">{sapFile ? sapFile.name : '.txt, .csv IDoc'}</span>
                <input
                  type="file"
                  accept=".txt,.csv"
                  className="hidden"
                  onChange={(e) => setSapFile(e.target.files[0])}
                />
              </label>
            )}
          </div>

          <button
            onClick={handleSapUpload}
            disabled={sapMutation.isPending || !sapFile}
            className="w-full mt-4 py-2.5 bg-[#115e59] hover:bg-[#0f766e] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
          >
            {sapMutation.isPending ? 'Ingesting SAP...' : 'Upload Data'}
          </button>
        </div>

        {/* Card 2: Utility Ingest */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between h-[360px]">
          <div>
            <div className="flex items-center justify-between">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <BoltIcon className="w-6 h-6" />
              </div>
              <span className="text-emerald-500 font-semibold text-xs flex items-center gap-0.5">
                🛡️ Verified
              </span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mt-4">Utility / Electricity</h3>
            <p className="text-xs text-gray-500 mt-1">Portal CSV export with meter ID, billing period, kWh consumed.</p>
          </div>

          <div className="mt-4 flex-grow flex flex-col justify-center">
            {utilityProgress > 0 ? (
              <div className="w-full space-y-2">
                <div className="flex justify-between text-xs font-semibold text-gray-700">
                  <span>Uploading CSV...</span>
                  <span>{utilityProgress}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full rounded-full transition-all duration-150" style={{ width: `${utilityProgress}%` }}></div>
                </div>
              </div>
            ) : (
              <label className="border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50/10 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all h-28">
                <svg className="w-8 h-8 text-gray-400 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
                <span className="text-xs font-semibold text-gray-600">{utilityFile ? utilityFile.name : '.csv files only'}</span>
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => setUtilityFile(e.target.files[0])}
                />
              </label>
            )}
          </div>

          <button
            onClick={handleUtilityUpload}
            disabled={utilityMutation.isPending || !utilityFile}
            className="w-full mt-4 py-2.5 bg-[#115e59] hover:bg-[#0f766e] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
          >
            {utilityMutation.isPending ? 'Ingesting Utility...' : 'Upload Data'}
          </button>
        </div>

        {/* Card 3: Corporate Travel */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between h-[360px]">
          <div>
            <div className="flex items-center justify-between">
              <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                <PaperAirplaneIcon className="w-6 h-6" />
              </div>
              <div className="bg-gray-100 rounded-lg p-0.5 flex text-[10px] font-bold text-gray-500">
                <button
                  onClick={() => setTravelMode('file')}
                  className={`px-2 py-0.5 rounded-md transition-colors ${travelMode === 'file' ? 'bg-white text-gray-800 shadow-sm' : ''}`}
                >
                  File
                </button>
                <button
                  onClick={() => setTravelMode('json')}
                  className={`px-2 py-0.5 rounded-md transition-colors ${travelMode === 'json' ? 'bg-white text-gray-800 shadow-sm' : ''}`}
                >
                  JSON
                </button>
              </div>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mt-4">Corporate Travel</h3>
            <p className="text-xs text-gray-500 mt-1">Concur / Navan export with trip segments.</p>
          </div>

          <div className="mt-4 flex-grow flex flex-col justify-center">
            {travelMode === 'file' ? (
              travelProgress > 0 ? (
                <div className="w-full space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-gray-700">
                    <span>Uploading Travel File...</span>
                    <span>{travelProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-indigo-600 h-full rounded-full transition-all duration-150" style={{ width: `${travelProgress}%` }}></div>
                  </div>
                </div>
              ) : (
                <label className="border-2 border-dashed border-gray-300 hover:border-indigo-500 hover:bg-indigo-50/10 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all h-28">
                  <svg className="w-8 h-8 text-gray-400 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                  </svg>
                  <span className="text-xs font-semibold text-gray-600">{travelFile ? travelFile.name : 'Upload travel export'}</span>
                  <input
                    type="file"
                    accept=".json,.csv"
                    className="hidden"
                    onChange={(e) => setTravelFile(e.target.files[0])}
                  />
                </label>
              )
            ) : (
              <textarea
                value={travelJson}
                onChange={(e) => setTravelJson(e.target.value)}
                placeholder='[{"flight_number": "BA202", "origin": "LHR", ...}]'
                className="w-full h-28 p-2 border border-gray-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            )}
          </div>

          <button
            onClick={handleTravelSubmit}
            disabled={travelMutation.isPending || (travelMode === 'file' ? !travelFile : !travelJson.trim())}
            className="w-full mt-4 py-2.5 bg-[#115e59] hover:bg-[#0f766e] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
          >
            {travelMutation.isPending ? 'Ingesting Travel...' : 'Submit Travel Data'}
          </button>
        </div>

      </div>

      {/* Import History Table */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden text-left">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-gray-900">Import History</h2>
          <button
            onClick={() => navigate('/review')}
            className="text-xs font-bold text-[#115e59] hover:text-[#0f766e] flex items-center gap-1"
          >
            View All Records <span>→</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-xs border-b border-gray-100">
              <tr>
                <th className="px-6 py-3.5 text-left">Source Name</th>
                <th className="px-6 py-3.5 text-left">Status</th>
                <th className="px-6 py-3.5 text-left">Quality</th>
                <th className="px-6 py-3.5 text-right">Record Count</th>
                <th className="px-6 py-3.5 text-left">Timestamp</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
              {isLoadingImports ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    Loading history...
                  </td>
                </tr>
              ) : !importsData || importsData.results?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-semibold">
                    No imports history found.
                  </td>
                </tr>
              ) : (
                importsData.results.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 flex items-center gap-3">
                      {getSourceTableIcon(job.source_type)}
                      <div>
                        <span className="font-semibold text-gray-900 block max-w-sm truncate">{job.filename || 'Direct API Ingestion'}</span>
                        <span className="text-[10px] text-gray-400 font-semibold uppercase">{job.source_type}</span>
                      </div>
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
                    <td className="px-6 py-4 text-right font-semibold text-gray-900">
                      {(job.records_count || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(job.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {job.status === 'failed' ? (
                        <button
                          onClick={() => reingestMutation.mutate(job.id)}
                          disabled={reingestMutation.isPending}
                          className="text-xs font-bold text-red-600 hover:text-red-800 disabled:opacity-50 hover:underline"
                        >
                          Retry
                        </button>
                      ) : (
                        <button
                          onClick={() => navigate(`/imports/${job.id}`)}
                          className="text-gray-400 hover:text-gray-600 inline-flex items-center"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}

export default Ingest
