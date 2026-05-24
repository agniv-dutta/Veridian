import { useEffect, useCallback } from 'react'

/**
 * useKeyboardNav — keyboard shortcuts for analyst review workflow
 *
 * @param {Object} config
 * @param {boolean} config.isPanelOpen - Whether the detail panel is currently open
 * @param {Function} config.onApprove - Approve the current record
 * @param {Function} config.onReject - Reject the current record
 * @param {Function} config.onNext - Advance to next record
 * @param {Function} config.onPrev - Go to previous record
 * @param {Function} config.onOpenPanel - Open the detail panel for highlighted row
 * @param {Function} config.onClosePanel - Close the detail panel
 * @param {Function} config.onShowHelp - Show keyboard shortcuts help modal
 * @param {number} config.highlightedIndex - Currently highlighted row index
 * @param {Function} config.setHighlightedIndex - Setter for highlighted row index
 * @param {number} config.recordCount - Total number of records in the table
 * @param {boolean} config.enabled - Whether keyboard nav is enabled (default true)
 */
const useKeyboardNav = ({
  isPanelOpen = false,
  onApprove,
  onReject,
  onNext,
  onPrev,
  onOpenPanel,
  onClosePanel,
  onShowHelp,
  highlightedIndex = 0,
  setHighlightedIndex,
  recordCount = 0,
  enabled = true,
}) => {
  const handleKeyDown = useCallback(
    (e) => {
      if (!enabled) return

      // Suppress keybindings when focus is inside a text input, textarea, or select
      const tag = document.activeElement?.tagName?.toUpperCase()
      const isEditable = document.activeElement?.isContentEditable
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || isEditable) {
        // Allow Escape even in inputs to close panel
        if (e.key === 'Escape' && isPanelOpen && onClosePanel) {
          e.preventDefault()
          onClosePanel()
        }
        return
      }

      if (isPanelOpen) {
        // Panel is open
        switch (e.key) {
          case 'a':
            e.preventDefault()
            if (onApprove) onApprove()
            break
          case 'r':
            e.preventDefault()
            if (onReject) onReject()
            break
          case 'j':
            e.preventDefault()
            if (onNext) onNext()
            break
          case 'k':
            e.preventDefault()
            if (onPrev) onPrev()
            break
          case 'Escape':
            e.preventDefault()
            if (onClosePanel) onClosePanel()
            break
          default:
            break
        }
      } else {
        // Panel is closed — table navigation
        switch (e.key) {
          case 'j':
            e.preventDefault()
            if (setHighlightedIndex && recordCount > 0) {
              setHighlightedIndex((prev) => Math.min(prev + 1, recordCount - 1))
            }
            break
          case 'k':
            e.preventDefault()
            if (setHighlightedIndex && recordCount > 0) {
              setHighlightedIndex((prev) => Math.max(prev - 1, 0))
            }
            break
          case 'Enter':
            e.preventDefault()
            if (onOpenPanel) onOpenPanel(highlightedIndex)
            break
          case '?':
            e.preventDefault()
            if (onShowHelp) onShowHelp()
            break
          default:
            break
        }
      }
    },
    [
      enabled,
      isPanelOpen,
      onApprove,
      onReject,
      onNext,
      onPrev,
      onOpenPanel,
      onClosePanel,
      onShowHelp,
      highlightedIndex,
      setHighlightedIndex,
      recordCount,
    ]
  )

  useEffect(() => {
    if (!enabled) return
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enabled, handleKeyDown])
}

export default useKeyboardNav
