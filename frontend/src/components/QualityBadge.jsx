import React from 'react'

const GRADE_CONFIG = {
  A: {
    bg: 'bg-[#ECFDF5]',
    text: 'text-[#047857]',
    border: 'border-[#A7F3D0]',
    interpretation: 'Clean import — ready for review',
  },
  B: {
    bg: 'bg-[#E6F4F4]',
    text: 'text-[#0D6E6E]',
    border: 'border-[#BFE7E7]',
    interpretation: 'Minor issues — review flagged rows',
  },
  C: {
    bg: 'bg-[#FFFBEB]',
    text: 'text-[#92400E]',
    border: 'border-[#FDE68A]',
    interpretation: 'Multiple issues — careful review needed',
  },
  D: {
    bg: 'bg-[#FEF2F2]',
    text: 'text-[#B91C1C]',
    border: 'border-[#FECACA]',
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
        className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-medium cursor-default ${config.bg} ${config.text} ${config.border}`}
      >
        <span className="font-semibold">{grade}</span>
        {scoreDisplay && <span className="text-[10px] opacity-80">{scoreDisplay}</span>}
      </span>
      {showInterpretation && (
        <span className="text-[11px] font-normal text-[var(--text-muted)] mt-0.5">
          {config.interpretation}
        </span>
      )}
    </div>
  )
}

/** Export the config so ImportDetail can use interpretation text */
export { GRADE_CONFIG }
export default QualityBadge
