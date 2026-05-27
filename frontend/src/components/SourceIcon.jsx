import React from 'react'
import { DocumentIcon, BoltIcon, PaperAirplaneIcon } from './ImportSourceIcon'
import { SOURCE_CONFIG } from '../utils/sourceConfig'

const ICONS = {
  sap: DocumentIcon,
  utility: BoltIcon,
  travel: PaperAirplaneIcon,
}

const SourceIcon = ({ sourceType }) => {
  const normalized = (sourceType || '').toLowerCase()
  const Icon = ICONS[normalized] || DocumentIcon
  const config = SOURCE_CONFIG[normalized]

  return (
    <div
      className="flex h-8 w-8 items-center justify-center rounded-lg"
      style={{ backgroundColor: config?.bgColor ?? '#F1F5F9' }}
    >
      <Icon className="h-4 w-4" style={{ color: config?.color ?? '#64748B' }} />
    </div>
  )
}

export default SourceIcon