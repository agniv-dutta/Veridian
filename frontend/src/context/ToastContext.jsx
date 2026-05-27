import React, { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)))
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 180)
  }, [])

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9)
    
    setToasts((prev) => [...prev, { id, message, type }])

    setTimeout(() => {
      removeToast(id)
    }, 4000)
  }, [removeToast])

  const success = useCallback((msg) => addToast(msg, 'success'), [addToast])
  const error = useCallback((msg) => addToast(msg, 'error'), [addToast])
  const warning = useCallback((msg) => addToast(msg, 'warning'), [addToast])

  const getToastIcon = (type) => {
    switch (type) {
      case 'success':
        return (
          <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'error':
        return (
          <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'warning':
        return (
          <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        )
      default:
        return null
    }
  }

  const getToastClasses = (type) => {
    switch (type) {
      case 'success':
        return 'bg-white border-emerald-100 shadow-emerald-50'
      case 'error':
        return 'bg-white border-red-100 shadow-red-50'
      case 'warning':
        return 'bg-white border-amber-100 shadow-amber-50'
      default:
        return 'bg-white border-gray-100'
    }
  }

  return (
    <ToastContext.Provider value={{ success, error, warning }}>
      {children}
      
      {/* Floating container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-3 rounded-lg border p-4 shadow-lg pointer-events-auto ${t.exiting ? 'animate-toast-exit' : 'animate-slide-in'} ${getToastClasses(t.type)}`}
          >
            <div className="flex-shrink-0 mt-0.5">{getToastIcon(t.type)}</div>
            <div className="flex-grow">
              <p className="text-sm font-medium text-gray-900">{t.message}</p>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
