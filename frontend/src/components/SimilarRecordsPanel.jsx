import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { getSimilarRecords } from '../api/records'

const SimilarRecordsPanel = ({ recordId, activityCategory }) => {
  const {
    data: similarRecords,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['similar-records', recordId],
    queryFn: () => getSimilarRecords(recordId),
    enabled: !!recordId,
  })

  return (
    <div className="space-y-3 text-left border-t border-gray-100 pt-6">
      <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase">
        Similar Approved Records
      </h3>

      {isLoading ? (
        /* Skeleton loader */
        <div className="space-y-2 animate-pulse">
          <div className="h-4 w-64 bg-gray-200 rounded" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-gray-100 rounded" />
          ))}
        </div>
      ) : isError ? (
        <p className="text-xs text-red-500 font-medium">Failed to load similar records.</p>
      ) : !similarRecords || similarRecords.length === 0 ? (
        <div className="bg-slate-50 border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-500 italic">
            No approved records for this activity yet — this is the first.
          </p>
        </div>
      ) : (
        <>
          <p className="text-[11px] font-medium text-gray-500">
            Showing <span className="font-bold text-gray-700">{similarRecords.length}</span> approved
            records for <span className="font-bold text-gray-700">{activityCategory || 'this activity'}</span>
          </p>

          <div className="bg-slate-50 border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-3 py-2 text-left">Period</th>
                  <th className="px-3 py-2 text-right">Quantity</th>
                  <th className="px-3 py-2 text-right">kgCO₂e</th>
                  <th className="px-3 py-2 text-left">Approved by</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/50">
                {similarRecords.map((rec, idx) => (
                  <tr key={rec.id || idx} className="text-gray-500 font-medium">
                    <td className="px-3 py-2 whitespace-nowrap">
                      {rec.period_end
                        ? new Date(rec.period_end).toLocaleDateString('en-US', {
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—'}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {Number(rec.quantity).toLocaleString()} {rec.unit}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap font-semibold text-gray-700">
                      {Number(rec.calculated_kgco2e).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {rec.approved_by || 'System'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

export default SimilarRecordsPanel
