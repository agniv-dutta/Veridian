import React from 'react'

const DocumentIcon = ({ className = 'w-4 h-4' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
    />
  </svg>
)

const BoltIcon = ({ className = 'w-4 h-4' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z"
    />
  </svg>
)

const PaperAirplaneIcon = ({ className = 'w-4 h-4' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
    />
  </svg>
)

const ImportSourceIcon = ({ source, showLabel = true }) => {
  const normalizedSource = (source || '').toLowerCase()

  const configMap = {
    sap: {
      icon: <DocumentIcon className="w-4 h-4 text-emerald-600" />,
      label: 'SAP ERP',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
    },
    utility: {
      icon: <BoltIcon className="w-4 h-4 text-blue-600" />,
      label: 'Utility API',
      bg: 'bg-blue-50',
      border: 'border-blue-100',
    },
    travel: {
      icon: <PaperAirplaneIcon className="w-4 h-4 text-indigo-600" />,
      label: 'Travel Portal',
      bg: 'bg-indigo-50',
      border: 'border-indigo-100',
    },
  }

  const current = configMap[normalizedSource] || {
    icon: <DocumentIcon className="w-4 h-4 text-gray-500" />,
    label: source || 'Manual Upload',
    bg: 'bg-gray-50',
    border: 'border-gray-100',
  }

  if (!showLabel) {
    return current.icon
  }

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border ${current.bg} ${current.border}`}>
      {current.icon}
      <span className="text-xs font-medium text-gray-700">{current.label}</span>
    </div>
  )
}

export default ImportSourceIcon
export { DocumentIcon, BoltIcon, PaperAirplaneIcon }
