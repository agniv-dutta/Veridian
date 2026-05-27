import React from 'react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null, showDetails: false }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo })
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--surface-secondary)] px-4 py-8">
        <div className="surface-card w-full max-w-xl p-6">
          <h1 className="text-[18px] font-semibold text-[var(--text-primary)]">Something went wrong</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">The application hit an unexpected error. You can reload the page or inspect the details below.</p>
          <div className="mt-6 flex items-center gap-3">
            <button onClick={() => window.location.reload()} className="button-primary h-10 px-4 text-sm font-medium">Reload page</button>
            <button onClick={() => this.setState((s) => ({ showDetails: !s.showDetails }))} className="rounded-lg border border-[var(--border-default)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)]">
              {this.state.showDetails ? 'Hide details' : 'Show details'}
            </button>
          </div>
          {this.state.showDetails && (
            <pre className="mt-5 max-h-72 overflow-auto rounded-lg bg-slate-900 p-4 text-[13px] text-slate-200">
              {this.state.error?.stack || this.state.error?.message || 'Unknown error'}
              {this.state.errorInfo?.componentStack ? `\n\n${this.state.errorInfo.componentStack}` : ''}
            </pre>
          )}
        </div>
      </div>
    )
  }
}

export default ErrorBoundary