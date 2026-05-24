import React, { useState } from 'react'

const ConversionLog = ({ conversionLog }) => {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!conversionLog || conversionLog.length === 0) return null

  return (
    <div className="mt-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1.5 text-[11px] font-bold text-blue-700 hover:text-blue-900 transition-colors"
      >
        <svg
          className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
        </svg>
        How was this converted?
      </button>

      {isExpanded && (
        <div className="mt-2 bg-blue-50/60 border border-blue-200 border-l-4 border-l-blue-400 rounded-lg p-3 space-y-1.5">
          {conversionLog.map((step, idx) => (
            <div key={idx} className="flex items-baseline gap-1.5">
              <span className="text-[10px] font-bold text-blue-400 w-4 flex-shrink-0">{idx + 1}.</span>
              <span className="text-[11px] font-mono text-blue-900 leading-relaxed">
                {step.from_value} {step.from_unit}
                <span className="text-blue-400 mx-1">→</span>
                {step.to_value} {step.to_unit}
                <span className="text-blue-500 ml-1.5 font-sans text-[10px]">
                  (× {step.factor}: 1 {step.from_unit} = {step.factor} {step.to_unit})
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ConversionLog
