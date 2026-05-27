import React, { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getImports, ingestSAP, ingestUtility, ingestTravel, reingestImport } from '../api/imports'
import StatusBadge from '../components/StatusBadge'
import QualityBadge from '../components/QualityBadge'
import useToast from '../hooks/useToast'
import { DocumentIcon, BoltIcon, PaperAirplaneIcon } from '../components/ImportSourceIcon'
import SourceIcon from '../components/SourceIcon'
import { useClient } from '../context/ClientContext'
import { SOURCE_CONFIG, getSourceLabel } from '../utils/sourceConfig'
import { formatImportDate } from '../utils/formatDate'
import {
  ArrowUpTrayIcon,
  CloudArrowUpIcon,
  InformationCircleIcon,
  XMarkIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'

const MOCK_IMPORT_HISTORY = [
  { id: 'sap-1', sourceType: 'sap', filename: 'SAP Fuel & Procurement', created_at: '2023-12-15T09:24:00Z', records_count: 30, flags_count: 5, status: 'pending_review', quality_score: 84, grade: 'B' },
  { id: 'utility-1', sourceType: 'utility', filename: 'Utility / Electricity', created_at: '2023-12-12T11:10:00Z', records_count: 12, flags_count: 3, status: 'flagged', quality_score: 71, grade: 'C' },
  { id: 'travel-1', sourceType: 'travel', filename: 'Corporate Travel', created_at: '2023-12-10T14:05:00Z', records_count: 18, flags_count: 2, status: 'completed', quality_score: 93, grade: 'A' },
]

const formatBytes = (bytes = 0) => {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`
}

const Ingest = () => {
  const { clientId } = useClient()
  const queryClient = useQueryClient()
  const toast = useToast()

  const [sapFile, setSapFile] = useState(null)
  const [utilityFile, setUtilityFile] = useState(null)
  const [travelFile, setTravelFile] = useState(null)
  const [travelMode, setTravelMode] = useState('file')
  const [travelJson, setTravelJson] = useState('')
  const [sapProgress, setSapProgress] = useState(0)
  const [utilityProgress, setUtilityProgress] = useState(0)
  const [travelProgress, setTravelProgress] = useState(0)
  const [dragZone, setDragZone] = useState(null)
  const [travelSuccess, setTravelSuccess] = useState(false)
  const [sapSuccess, setSapSuccess] = useState(false)
  const [utilitySuccess, setUtilitySuccess] = useState(false)

  const { data: importsData, refetch: refetchImports } = useQuery({
    queryKey: ['imports-history', clientId],
    queryFn: () => getImports({ client: clientId }),
    enabled: !!clientId,
  })

  const importHistory = importsData?.results?.length ? importsData.results : MOCK_IMPORT_HISTORY

  const resetSuccess = (setter) => {
    setter(true)
    window.setTimeout(() => setter(false), 2000)
  }

  const commonUploadSuccess = () => {
    refetchImports()
    queryClient.invalidateQueries({ queryKey: ['summary', clientId] })
  }

  const reingestMutation = useMutation({
    mutationFn: (importId) => reingestImport(importId),
    onSuccess: () => {
      toast.success('Successfully triggered re-ingestion job!')
      refetchImports()
      queryClient.invalidateQueries({ queryKey: ['summary', clientId] })
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Re-ingestion failed.')
    },
  })

  const sapMutation = useMutation({
    mutationFn: ({ formData, config }) => ingestSAP(formData, config),
    onSuccess: (data) => {
      handleIngestSuccess(data, 'SAP Fuel & Procurement')
      setSapFile(null)
      setSapProgress(0)
      resetSuccess(setSapSuccess)
      commonUploadSuccess()
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'SAP ingestion failed.')
      setSapProgress(0)
    },
  })

  const utilityMutation = useMutation({
    mutationFn: ({ formData, config }) => ingestUtility(formData, config),
    onSuccess: (data) => {
      handleIngestSuccess(data, 'Utility / Electricity')
      setUtilityFile(null)
      setUtilityProgress(0)
      resetSuccess(setUtilitySuccess)
      commonUploadSuccess()
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Utility ingestion failed.')
      setUtilityProgress(0)
    },
  })

  const travelMutation = useMutation({
    mutationFn: ({ payload, config }) => ingestTravel(payload, config),
    onSuccess: (data) => {
      handleIngestSuccess(data, 'Corporate Travel')
      setTravelFile(null)
      setTravelJson('')
      setTravelProgress(0)
      resetSuccess(setTravelSuccess)
      commonUploadSuccess()
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Travel ingestion failed.')
      setTravelProgress(0)
    },
  })

  const handleSapUpload = () => {
    if (!sapFile) return toast.warning('Please select an IDoc file first.')
    const formData = new FormData()
    formData.append('file', sapFile)

    sapMutation.mutate({
      formData,
      config: {
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          setSapProgress(percent)
        },
      },
    })
  }

  const handleUtilityUpload = () => {
    if (!utilityFile) return toast.warning('Please select a utility CSV file first.')
    const formData = new FormData()
    formData.append('file', utilityFile)

    utilityMutation.mutate({
      formData,
      config: {
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          setUtilityProgress(percent)
        },
      },
    })
  }

  const handleTravelSubmit = () => {
    if (travelMode === 'file') {
      if (!travelFile) return toast.warning('Please select a travel export file first.')
      const formData = new FormData()
      formData.append('file', travelFile)

      travelMutation.mutate({
        payload: formData,
        config: {
          onUploadProgress: (progressEvent) => {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            setTravelProgress(percent)
          },
        },
      })
      return
    }

    if (!travelJson.trim()) return toast.warning('Please paste a travel JSON object first.')

    try {
      const parsed = JSON.parse(travelJson)
      travelMutation.mutate({ payload: parsed, config: {} })
    } catch (err) {
      toast.error('Invalid JSON structure. Please correct the formatting.')
    }
  }

  const fileMeta = (file) =>
    file
      ? `${file.name} • ${formatBytes(file.size)}`
      : null

  const handleIngestSuccess = (data, sourceLabel) => {
    if (data.successful === 0) {
      toast.error(`${sourceLabel}: Upload accepted but 0 records were created. Check the file format or contact support.`)
      return
    }

    toast.success(
      `${sourceLabel}: ${data.successful} records ingested successfully.${data.failed > 0 ? ` ${data.failed} rows failed — check import log.` : ''}`
    )
  }

  const renderDropZone = ({
    file,
    onPick,
    accept,
    helperText,
    zoneKey,
    progress,
    onRemove,
    dragTintClass,
    icon,
  }) => {
    const isActive = dragZone === zoneKey
    const hasFile = !!file
    const Icon = icon

    return (
      <label
        onDragOver={(e) => {
          e.preventDefault()
          setDragZone(zoneKey)
        }}
        onDragLeave={() => setDragZone(null)}
        onDrop={(e) => {
          e.preventDefault()
          setDragZone(null)
          const dropped = e.dataTransfer.files?.[0]
          if (dropped) onPick(dropped)
        }}
        className={`flex h-20 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-4 text-center transition-colors ${
          hasFile ? 'border-[var(--brand-primary)] bg-[var(--brand-light)]' : isActive ? `border-[var(--brand-primary)] ${dragTintClass}` : 'border-[var(--border-strong)] bg-white hover:bg-[var(--surface-secondary)] hover:border-[var(--brand-primary)]'
        }`}
      >
        {progress > 0 ? (
          <div className="w-full space-y-2">
            <div className="flex items-center justify-between text-[12px] text-[var(--text-secondary)]">
              <span>Uploading...</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-tertiary)]">
              <div className="h-full rounded-full bg-[var(--brand-primary)] transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : hasFile ? (
          <div className="w-full">
            <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border-strong)] bg-white px-3 py-2 text-left">
              <div className="min-w-0">
                <div className="truncate text-[13px] font-medium text-[var(--brand-primary)]">{file.name}</div>
                <div className="text-[11px] text-[var(--text-muted)]">{formatBytes(file.size)}</div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  onRemove()
                }}
                className="grid h-6 w-6 place-items-center rounded-full text-[var(--text-muted)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-secondary)]"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <>
            <Icon className="h-5 w-5 text-[var(--text-muted)]" />
            <div className="mt-2 text-[12px] text-[var(--text-muted)]">{helperText}</div>
            <input type="file" accept={accept} className="hidden" onChange={(e) => onPick(e.target.files[0])} />
          </>
        )}
      </label>
    )
  }

  const renderUploadButton = (label, isPending, isSuccess) => (
    <button
      type="button"
      onClick={label === 'SAP' ? handleSapUpload : label === 'Utility' ? handleUtilityUpload : handleTravelSubmit}
      disabled={isPending}
      className={`flex h-10 w-full items-center justify-center rounded-lg text-sm font-medium text-white transition-colors ${
        isSuccess ? 'bg-[#10B981]' : 'button-primary'
      } disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {isPending ? 'Uploading...' : isSuccess ? '✓ Upload Successful' : 'Upload Data'}
    </button>
  )

  return (
    <div className="px-8 py-8 space-y-6">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight text-[var(--text-primary)]">Data Ingestion</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Streamline your environmental reporting by centralizing multi-source data streams.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="surface-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--brand-light)]">
                <DocumentIcon className="h-6 w-6 text-[var(--brand-primary)]" />
              </div>
              <div>
                <h2 className="text-[16px] font-semibold text-[var(--text-primary)]">SAP Fuel & Procurement</h2>
                <p className="mt-1 text-[13px] text-[var(--text-muted)]">Expects IDoc format with plant codes and document dates.</p>
              </div>
            </div>
            <button className="grid h-8 w-8 place-items-center rounded-full text-[var(--text-muted)] hover:bg-[var(--surface-secondary)]">
              <InformationCircleIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-6">
            {renderDropZone({
              file: sapFile,
              onPick: setSapFile,
              accept: '.txt,.csv',
              helperText: '.txt, .csv IDoc',
              zoneKey: 'sap',
              progress: sapProgress,
              onRemove: () => setSapFile(null),
              dragTintClass: 'bg-[var(--brand-light)]',
              icon: CloudArrowUpIcon,
            })}
          </div>

          <div className="mt-4">{renderUploadButton('SAP', sapMutation.isPending, sapSuccess)}</div>
        </section>

        <section className="surface-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#EFF6FF]">
                <BoltIcon className="h-6 w-6 text-[var(--scope-2)]" />
              </div>
              <div>
                <h2 className="text-[16px] font-semibold text-[var(--text-primary)]">Utility / Electricity</h2>
                <p className="mt-1 text-[13px] text-[var(--text-muted)]">Portal CSV export with meter ID, billing period, kWh consumed.</p>
              </div>
            </div>
            <span className="pill bg-[#EFF6FF] px-3 py-1 text-[11px] font-medium text-[#2563EB]">Verified</span>
          </div>

          <div className="mt-6">
            {renderDropZone({
              file: utilityFile,
              onPick: setUtilityFile,
              accept: '.csv',
              helperText: '.csv files only',
              zoneKey: 'utility',
              progress: utilityProgress,
              onRemove: () => setUtilityFile(null),
              dragTintClass: 'bg-[#EFF6FF]',
              icon: CloudArrowUpIcon,
            })}
          </div>

          <div className="mt-4">{renderUploadButton('Utility', utilityMutation.isPending, utilitySuccess)}</div>
        </section>

        <section className="surface-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#F5F3FF]">
                <PaperAirplaneIcon className="h-6 w-6 text-[var(--scope-3)]" />
              </div>
              <div>
                <h2 className="text-[16px] font-semibold text-[var(--text-primary)]">Corporate Travel</h2>
                <p className="mt-1 text-[13px] text-[var(--text-muted)]">Concur / Navan export with trip segments.</p>
              </div>
            </div>
            <div className="flex items-center gap-1 rounded-full bg-[var(--surface-secondary)] p-1 text-[11px] font-medium text-[var(--text-muted)]">
              <button
                type="button"
                onClick={() => setTravelMode('file')}
                className={`pill px-3 py-1 ${travelMode === 'file' ? 'bg-white text-[var(--text-primary)] shadow-sm' : ''}`}
              >
                File
              </button>
              <button
                type="button"
                onClick={() => setTravelMode('json')}
                className={`pill px-3 py-1 ${travelMode === 'json' ? 'bg-white text-[var(--text-primary)] shadow-sm' : ''}`}
              >
                JSON
              </button>
            </div>
          </div>

          <div className="mt-6">
            {travelMode === 'file' ? (
              renderDropZone({
                file: travelFile,
                onPick: setTravelFile,
                accept: '.json,.csv',
                helperText: 'Upload travel export',
                zoneKey: 'travel',
                progress: travelProgress,
                onRemove: () => setTravelFile(null),
                dragTintClass: 'bg-[#F5F3FF]',
                icon: CloudArrowUpIcon,
              })
            ) : (
              <textarea
                value={travelJson}
                onChange={(e) => setTravelJson(e.target.value)}
                placeholder='{ "trips": [ ... ] }'
                className="input-base h-[120px] w-full resize-none bg-[var(--surface-secondary)] px-4 py-3 font-mono text-[13px] text-[var(--text-secondary)]"
              />
            )}
          </div>

          <div className="mt-4">{renderUploadButton('Travel', travelMutation.isPending, travelSuccess)}</div>
        </section>
      </div>

      <section className="surface-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--border-default)] px-6 py-5">
          <h2 className="text-[18px] font-semibold text-[var(--text-primary)]">Import History</h2>
          <button className="text-sm font-medium text-[var(--brand-primary)] hover:text-[var(--brand-secondary)]">View All Records →</button>
        </div>

        <div className="overflow-x-auto">
          <table className="table-shell w-full min-w-[820px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--border-default)]">
                <th className="px-4 py-3.5">Source Name</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Quality</th>
                <th className="px-4 py-3.5 text-right">Record Count</th>
                <th className="px-4 py-3.5">Timestamp</th>
                <th className="px-4 py-3.5">Action</th>
              </tr>
            </thead>
            <tbody>
              {importHistory.map((job) => (
                <tr key={job.id} className="border-b border-[var(--border-default)] last:border-b-0">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <SourceIcon sourceType={job.source_type || job.sourceType} />
                      <div>
                        <div className="text-sm font-medium text-[var(--text-primary)]">{SOURCE_CONFIG[(job.source_type || job.sourceType || '').toLowerCase()]?.label || getSourceLabel(job.source_type || job.sourceType)}</div>
                        <div className="mt-0.5 text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)]">{SOURCE_CONFIG[(job.source_type || job.sourceType || '').toLowerCase()]?.sublabel || ''}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5"><StatusBadge status={job.status} /></td>
                  <td className="px-4 py-3.5"><QualityBadge grade={job.grade || 'B'} score={job.quality_score} /></td>
                  <td className="px-4 py-3.5 text-right text-sm text-[var(--text-secondary)]">{job.total_records ?? job.records_count ?? job.successful_records ?? 0}</td>
                  <td className="px-4 py-3.5 text-sm text-[var(--text-secondary)]">{formatImportDate(job.uploaded_at || job.created_at)}</td>
                  <td className="px-4 py-3.5">
                    <button
                      type="button"
                      onClick={() => reingestMutation.mutate(job.id)}
                      className="text-sm font-medium text-[var(--brand-primary)] hover:text-[var(--brand-secondary)]"
                    >
                      Reprocess →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export default Ingest
