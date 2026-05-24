import React, { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getRecord, updateRecord, approveRecord, rejectRecord, dismissFlag } from '../api/records'
import StatusBadge from './StatusBadge'
import ScopeBadge from './ScopeBadge'
import useToast from '../hooks/useToast'

const RecordDetailPanel = ({ recordId, isOpen, onClose }) => {
  const queryClient = useQueryClient()
  const toast = useToast()

  // Fetch record details
  const {
    data: record,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['record-detail', recordId],
    queryFn: () => getRecord(recordId),
    enabled: isOpen && !!recordId,
  })

  // React Hook Form
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { isDirty },
  } = useForm({
    defaultValues: {
      description: '',
      quantity: 0,
      unit: '',
    },
  })

  // Watch quantity and unit live
  const watchedQuantity = useWatch({ control, name: 'quantity', defaultValue: 0 })

  // Re-populate form when record changes
  useEffect(() => {
    if (record) {
      reset({
        description: record.description || '',
        quantity: record.quantity || 0,
        unit: record.unit || '',
      })
    }
  }, [record, reset])

  // Mutation: Save Edits
  const saveMutation = useMutation({
    mutationFn: (data) => updateRecord(recordId, data),
    onSuccess: () => {
      toast.success('Record updated successfully.')
      queryClient.invalidateQueries(['records'])
      queryClient.invalidateQueries(['summary'])
      refetch()
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to update record.')
    },
  })

  // Mutation: Approve
  const approveMutation = useMutation({
    mutationFn: () => approveRecord(recordId),
    onSuccess: () => {
      toast.success('Record approved.')
      queryClient.invalidateQueries(['records'])
      queryClient.invalidateQueries(['summary'])
      onClose()
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to approve record.')
    },
  })

  // Mutation: Reject
  const rejectMutation = useMutation({
    mutationFn: () => rejectRecord(recordId),
    onSuccess: () => {
      toast.success('Record rejected.')
      queryClient.invalidateQueries(['records'])
      queryClient.invalidateQueries(['summary'])
      onClose()
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to reject record.')
    },
  })

  // Mutation: Dismiss Flag
  const dismissFlagMutation = useMutation({
    mutationFn: (flagId) => dismissFlag(recordId, flagId),
    onSuccess: () => {
      toast.success('Flag dismissed.')
      queryClient.invalidateQueries(['records'])
      queryClient.invalidateQueries(['summary'])
      refetch()
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to dismiss flag.')
    },
  })

  const onSubmit = (data) => {
    saveMutation.mutate({
      description: data.description,
      quantity: Number(data.quantity),
      unit: data.unit,
    })
  }

  // Calculate live emissions
  const emissionFactor = record?.emission_factor || 0
  const calculatedEmissions = (Number(watchedQuantity || 0) * emissionFactor).toFixed(2)

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-slate-900/40 z-40 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Slide-out drawer */}
      <div className="fixed top-0 right-0 h-screen w-full md:w-[560px] bg-white shadow-2xl z-50 border-l border-gray-200 overflow-y-auto flex flex-col font-sans">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex flex-col gap-1 items-start">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-gray-900 font-mono">REC-{recordId}</span>
              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded tracking-wider uppercase border border-blue-100">
                {record?.source_type || 'SOURCE'}
              </span>
              {record && <ScopeBadge scope={record.scope} />}
            </div>
            {record && (
              <span className="text-[10px] text-gray-400 font-semibold uppercase">
                Last updated {new Date(record.updated_at).toLocaleDateString()} by{' '}
                {record.edited_by ? 'Analyst' : 'System Automator'}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-slate-100"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-grow p-6 space-y-6 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-6 animate-pulse">
              <div className="h-6 w-32 bg-gray-200 rounded"></div>
              <div className="h-24 bg-gray-100 rounded-xl"></div>
              <div className="h-40 bg-gray-100 rounded-xl"></div>
              <div className="h-24 bg-gray-100 rounded-xl"></div>
            </div>
          ) : isError || !record ? (
            <div className="text-center py-12">
              <p className="text-sm font-semibold text-red-500">Failed to load record details.</p>
              <button onClick={() => refetch()} className="mt-4 px-4 py-2 bg-slate-100 rounded font-bold text-xs">
                Retry Load
              </button>
            </div>
          ) : (
            <>
              {/* Attention required / Flags section */}
              {record.flags && record.flags.length > 0 && (
                <div className="space-y-2 border-b border-gray-100 pb-4 text-left">
                  <span className="text-[10px] font-bold text-red-500 tracking-wider uppercase block">
                    ⚠ Attention Required
                  </span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {record.flags.map((flag) => (
                      <span
                        key={flag.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold rounded-lg shadow-sm"
                      >
                        <span>{flag.message}</span>
                        <button
                          onClick={() => dismissFlagMutation.mutate(flag.id)}
                          className="hover:text-amber-950 p-0.5 rounded-full hover:bg-amber-100/50"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Grid section: Raw Data & Form side-by-side or stacked */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                
                {/* Raw Data (Read-only) */}
                <div className="space-y-3 text-left">
                  <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase">Raw Data</h3>
                  <div className="bg-slate-50 border border-gray-200 rounded-xl p-4 text-xs font-medium text-gray-700 divide-y divide-gray-200/50 h-[300px] overflow-y-auto space-y-2.5">
                    {record.raw_data && Object.keys(record.raw_data).length > 0 ? (
                      Object.entries(record.raw_data).map(([key, val]) => (
                        <div key={key} className="pt-2.5 first:pt-0">
                          <span className="text-[10px] font-bold text-gray-400 block tracking-wider uppercase">{key}</span>
                          <span className="text-gray-900 block mt-0.5 break-all">{val?.toString() || '—'}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-gray-400 italic block py-4 text-center">No raw metadata records.</span>
                    )}
                  </div>
                </div>

                {/* Normalized Section */}
                <div className="space-y-3 text-left">
                  <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase">Normalized</h3>
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    
                    {/* Activity Description */}
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 tracking-wider uppercase mb-1">
                        Activity Description
                      </label>
                      <input
                        type="text"
                        {...register('description', { required: true })}
                        className="w-full text-xs font-medium border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>

                    {/* Quantity & Unit Row */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 tracking-wider uppercase mb-1">
                          Quantity
                        </label>
                        <input
                          type="number"
                          step="any"
                          {...register('quantity', { required: true, valueAsNumber: true })}
                          className="w-full text-xs font-medium border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 tracking-wider uppercase mb-1">
                          Unit
                        </label>
                        <select
                          {...register('unit', { required: true })}
                          className="w-full text-xs font-medium border border-gray-300 bg-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500"
                        >
                          {(record.unit_options || []).map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Emission Factor */}
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <label className="block text-[10px] font-bold text-gray-500 tracking-wider uppercase">
                          Emission Factor (kgCO₂e/Unit)
                        </label>
                        <span className="group relative cursor-help text-gray-400">
                          ℹ
                          <span className="pointer-events-none absolute bottom-full left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-[9px] rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 mb-1 font-semibold uppercase tracking-wider shadow">
                            Managed by admin
                          </span>
                        </span>
                      </div>
                      <input
                        type="text"
                        readOnly
                        value={record.emission_factor}
                        className="w-full text-xs font-medium bg-slate-50 border border-gray-200 text-gray-400 rounded-lg px-2.5 py-1.5 select-none"
                      />
                    </div>

                    {/* Display Impact (Live Calculation) */}
                    <div className="bg-teal-50/50 border border-teal-100 rounded-xl p-4 flex flex-col items-start gap-1 justify-center mt-6">
                      <span className="text-[10px] font-bold text-[#115e59] tracking-wider uppercase">Calculated Impact</span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-extrabold text-[#115e59]">{calculatedEmissions}</span>
                        <span className="text-xs font-bold text-[#115e59] uppercase tracking-wider">kgCO₂e</span>
                      </div>
                    </div>

                  </form>
                </div>

              </div>

              {/* Audit Trail Timeline */}
              <div className="space-y-4 text-left border-t border-gray-100 pt-6">
                <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase">Audit Trail</h3>
                
                <div className="relative pl-6 border-l border-gray-200 space-y-6 ml-2 text-xs">
                  {record.audit_trail && record.audit_trail.length > 0 ? (
                    record.audit_trail.map((event, idx) => (
                      <div key={event.id || idx} className="relative">
                        {/* Circle dot on timeline */}
                        <div className="absolute -left-[30px] top-0.5 w-3 h-3 rounded-full border-2 border-white bg-slate-400 flex items-center justify-center">
                          <div className="w-1 h-1 rounded-full bg-white"></div>
                        </div>
                        
                        <div>
                          <p className="font-semibold text-gray-900">
                            {event.event_type}
                          </p>
                          <p className="text-[11px] text-gray-500 mt-0.5 font-medium">
                            by {event.actor || 'System'} &bull; {new Date(event.timestamp).toLocaleString()}
                          </p>
                          {event.detail && Object.keys(event.detail).length > 0 && (
                            <p className="text-[10px] text-gray-400 mt-1 font-mono bg-slate-50 px-2 py-1 rounded">
                              {JSON.stringify(event.detail)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <span className="text-gray-400 italic block py-4 pl-2">No audit events logged.</span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer actions bar */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-slate-50/50">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 hover:bg-slate-50 text-gray-700 text-xs font-bold rounded-lg transition-colors"
          >
            Cancel
          </button>
          
          <div className="flex gap-2">
            <button
              onClick={() => rejectMutation.mutate()}
              disabled={isLoading || record?.locked || rejectMutation.isPending}
              className="px-4 py-2 border border-red-300 hover:bg-red-50 text-red-600 text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
            >
              Reject
            </button>
            <button
              onClick={() => approveMutation.mutate()}
              disabled={isLoading || record?.locked || approveMutation.isPending}
              className="px-4 py-2 bg-[#115e59] hover:bg-[#0f766e] text-white text-xs font-bold rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              Approve
            </button>
            <button
              onClick={handleSubmit(onSubmit)}
              disabled={isLoading || record?.locked || saveMutation.isPending || !isDirty}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              Save Edits
            </button>
          </div>
        </div>

      </div>
    </>
  )
}

export default RecordDetailPanel
