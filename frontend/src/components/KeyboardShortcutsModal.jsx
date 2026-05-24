import React from 'react'

const SHORTCUTS = [
  {
    section: 'When Detail Panel is Open',
    items: [
      { key: 'a', description: 'Approve current record and advance to next' },
      { key: 'r', description: 'Reject current record and advance to next' },
      { key: 'j', description: 'Advance to next record without acting' },
      { key: 'k', description: 'Go to previous record' },
      { key: 'Esc', description: 'Close the detail panel' },
    ],
  },
  {
    section: 'When Panel is Closed (Table Focus)',
    items: [
      { key: 'j', description: 'Move highlight down one row' },
      { key: 'k', description: 'Move highlight up one row' },
      { key: '↵', description: 'Open detail panel for highlighted row' },
      { key: '?', description: 'Show this help dialog' },
    ],
  },
]

const KeyboardShortcutsModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 z-[60] transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[61] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-md w-full overflow-hidden font-sans animate-slide-in">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Keyboard Shortcuts
            </h2>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-slate-100"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-6 max-h-[60vh] overflow-y-auto">
            {SHORTCUTS.map((section) => (
              <div key={section.section}>
                <h3 className="text-[10px] font-bold text-gray-400 tracking-wider uppercase mb-3">
                  {section.section}
                </h3>
                <div className="space-y-2">
                  {section.items.map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between"
                    >
                      <span className="text-xs text-gray-600 font-medium">
                        {item.description}
                      </span>
                      <kbd className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 bg-slate-100 border border-slate-200 rounded text-[10px] font-bold text-slate-700 font-mono shadow-sm">
                        {item.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-gray-100 bg-slate-50/50">
            <p className="text-[10px] text-gray-400 font-medium text-center">
              Shortcuts are disabled when typing in text fields
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export default KeyboardShortcutsModal
