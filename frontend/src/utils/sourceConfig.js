export const SOURCE_CONFIG = {
  sap: {
    label: 'SAP Fuel & Procurement',
    sublabel: 'SAP',
    color: '#0D6E6E',
    bgColor: '#E6F4F4',
  },
  utility: {
    label: 'Utility / Electricity',
    sublabel: 'UTILITY',
    color: '#2563EB',
    bgColor: '#EFF6FF',
  },
  travel: {
    label: 'Corporate Travel',
    sublabel: 'TRAVEL',
    color: '#7C3AED',
    bgColor: '#F5F3FF',
  },
}

export function getSourceLabel(sourceType) {
  return SOURCE_CONFIG[sourceType]?.label ?? sourceType ?? '—'
}