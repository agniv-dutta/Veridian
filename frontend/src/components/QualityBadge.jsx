import React from 'react'

const GRADE_CONFIG = {
  A: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    interpretation: 'Clean import — ready for review',
  },
  B: {
    bg: 'bg-teal-50',
    text: 'text-teal-800',
    border: 'border-teal-200',
    interpretation: 'Minor issues — review flagged rows',
  },
  C: {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    interpretation: 'Multiple issues — careful review needed',
  },
  D: {
    bg: 'bg-red-50',
    text: 'text-red-800',
    border: 'border-red-200',
    interpretation: 'Significant problems — consider re-ingesting',
  },
}

const QualityBadge = ({
  grade,
  score,
  parseFailures = 0,
  outliers = 0,
  unitIssues = 0,
  showInterpretation = false,
}) => {
  const config = GRADE_CONFIG[grade] || GRADE_CONFIG.D

  const tooltipText = `Parse failures: ${parseFailures} · Outliers: ${outliers} · Unit issues: ${unitIssues}`
  const scoreValue = score == null ? null : Number(score)
  const scoreDisplay = scoreValue == null ? '' : `${Math.round(scoreValue <= 1 ? scoreValue * 100 : scoreValue)}%`

  return (
    <div className={showInterpretation ? 'flex flex-col gap-1' : 'inline-flex'}>
      <span
        title={tooltipText}
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border cursor-default ${config.bg} ${config.text} ${config.border}`}
      >
        {grade}{scoreDisplay && ` · ${scoreDisplay}`}
      </span>
      {showInterpretation && (
        <span className="text-[11px] font-medium text-gray-500 mt-0.5">
          {config.interpretation}
        </span>
      )}
    </div>
  )
}

/** Export the config so ImportDetail can use interpretation text */
export { GRADE_CONFIG }
export default QualityBadge
