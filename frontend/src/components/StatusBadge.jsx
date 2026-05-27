import React from 'react'

const StatusBadge = ({ status }) => {
  const normalizedStatus = (status || '').toLowerCase()

  const configMap = {
    pending_review: {
      bg: 'bg-[#FFFBEB]',
      text: 'text-[#92400E]',
      border: 'border-[#FDE68A]',
      label: 'Pending',
    },
    pending: {
      bg: 'bg-[#FFFBEB]',
      text: 'text-[#92400E]',
      border: 'border-[#FDE68A]',
      label: 'Pending',
    },
    flagged: {
      bg: 'bg-[#FEF2F2]',
      text: 'text-[#B91C1C]',
      border: 'border-[#FECACA]',
      label: 'Flagged',
    },
    approved: {
      bg: 'bg-[#ECFDF5]',
      text: 'text-[#047857]',
      border: 'border-[#A7F3D0]',
      label: 'Approved',
    },
    rejected: {
      bg: 'bg-[#F9FAFB]',
      text: 'text-[#6B7280]',
      border: 'border-[#E5E7EB]',
      label: 'Rejected',
    },
    processing: {
      bg: 'bg-[#EFF6FF]',
      text: 'text-[#2563EB]',
      border: 'border-[#BFDBFE]',
      label: 'Processing',
    },
    failed: {
      bg: 'bg-[#FEF2F2]',
      text: 'text-[#B91C1C]',
      border: 'border-[#FECACA]',
      label: 'Failed',
    },
    completed: {
      bg: 'bg-[#ECFDF5]',
      text: 'text-[#047857]',
      border: 'border-[#A7F3D0]',
      label: 'Completed',
    },
  }

  const current = configMap[normalizedStatus] || {
    bg: 'bg-[#F9FAFB]',
    text: 'text-[#374151]',
    border: 'border-[#E5E7EB]',
    label: status || 'Unknown',
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-medium ${current.bg} ${current.text} ${current.border}`}
    >
      {current.label}
    </span>
  )
}

export default StatusBadge
