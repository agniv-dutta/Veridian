import React from 'react'

const StatusBadge = ({ status }) => {
  const normalizedStatus = (status || '').toLowerCase()

  const configMap = {
    pending: {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      border: 'border-gray-200',
      label: 'Pending',
    },
    flagged: {
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
      label: 'Flagged',
    },
    approved: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-200',
      label: 'Approved',
    },
    rejected: {
      bg: 'bg-red-50',
      text: 'text-red-800',
      border: 'border-red-200',
      label: 'Rejected',
    },
    processing: {
      bg: 'bg-blue-50',
      text: 'text-blue-800',
      border: 'border-blue-200',
      label: 'Processing',
    },
    failed: {
      bg: 'bg-red-50',
      text: 'text-red-800',
      border: 'border-red-200',
      label: 'Failed',
    },
    completed: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-200',
      label: 'Completed',
    },
  }

  const current = configMap[normalizedStatus] || {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    border: 'border-gray-200',
    label: status || 'Unknown',
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${current.bg} ${current.text} ${current.border}`}
    >
      {current.label}
    </span>
  )
}

export default StatusBadge
