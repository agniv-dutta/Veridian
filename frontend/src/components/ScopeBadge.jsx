import React from 'react'

const ScopeBadge = ({ scope }) => {
  const cleanScope = parseInt(scope, 10)

  const configMap = {
    1: {
      bg: 'bg-[var(--brand-light)]',
      text: 'text-[var(--scope-1)]',
      border: 'border-[rgba(13,110,110,0.18)]',
      label: 'SCOPE 1',
    },
    2: {
      bg: 'bg-[#EFF6FF]',
      text: 'text-[var(--scope-2)]',
      border: 'border-[rgba(37,99,235,0.18)]',
      label: 'SCOPE 2',
    },
    3: {
      bg: 'bg-[#F5F3FF]',
      text: 'text-[var(--scope-3)]',
      border: 'border-[rgba(124,58,237,0.18)]',
      label: 'SCOPE 3',
    },
  }

  const current = configMap[cleanScope] || {
    bg: 'bg-[var(--surface-tertiary)]',
    text: 'text-[var(--text-secondary)]',
    border: 'border-[var(--border-default)]',
    label: `SCOPE ${scope}`,
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-medium tracking-[0.08em] ${current.bg} ${current.text} ${current.border}`}
    >
      {current.label}
    </span>
  )
}

export default ScopeBadge
