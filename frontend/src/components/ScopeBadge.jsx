import React from 'react'

const ScopeBadge = ({ scope }) => {
  const cleanScope = parseInt(scope, 10)

  const configMap = {
    1: {
      bg: 'bg-teal-50',
      text: 'text-teal-800',
      border: 'border-teal-200',
      label: 'SCOPE 1',
    },
    2: {
      bg: 'bg-blue-50',
      text: 'text-blue-800',
      border: 'border-blue-200',
      label: 'SCOPE 2',
    },
    3: {
      bg: 'bg-purple-50',
      text: 'text-purple-800',
      border: 'border-purple-200',
      label: 'SCOPE 3',
    },
  }

  const current = configMap[cleanScope] || {
    bg: 'bg-gray-50',
    text: 'text-gray-800',
    border: 'border-gray-200',
    label: `SCOPE ${scope}`,
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider border ${current.bg} ${current.text} ${current.border}`}
    >
      {current.label}
    </span>
  )
}

export default ScopeBadge
