import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, Outlet } from 'react-router-dom'
import NProgress from 'nprogress'
import {
  Squares2X2Icon,
  CloudArrowUpIcon,
  ClipboardDocumentCheckIcon,
  Cog6ToothIcon,
  LifebuoyIcon,
} from '@heroicons/react/24/outline'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ClientProvider } from './context/ClientContext'
import { ToastProvider } from './context/ToastContext'
import Navbar from './components/Navbar'
import ErrorBoundary from './components/ErrorBoundary'

const Landing = lazy(() => import('./pages/Landing'))
const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Ingest = lazy(() => import('./pages/Ingest'))
const ReviewQueue = lazy(() => import('./pages/ReviewQueue'))
const ImportDetail = lazy(() => import('./pages/ImportDetail'))

const ProtectedRoute = ({ children }) => {
  const { token, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface-secondary)] font-sans">
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-[var(--border-default)] bg-white px-6 py-8 shadow-[var(--shadow-card)]">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--brand-primary)] border-t-transparent" />
          <span className="text-sm font-medium text-[var(--text-muted)]">Checking credentials...</span>
        </div>
      </div>
    )
  }

  if (!token) {
    return <Navigate to="/landing" replace />
  }

  return children
}

const AppLayout = () => {
  const location = useLocation()
  const [mobileDrawerOpen, setMobileDrawerOpen] = React.useState(false)

  React.useEffect(() => {
    NProgress.configure({ showSpinner: false })
  }, [])

  React.useEffect(() => {
    NProgress.start()
    const timer = window.setTimeout(() => NProgress.done(), 120)
    return () => window.clearTimeout(timer)
  }, [location.pathname, location.search])

  const navItems = [
    { path: '/', label: 'Dashboard', icon: Squares2X2Icon },
    { path: '/ingest', label: 'Data Ingestion', icon: CloudArrowUpIcon },
    { path: '/review', label: 'Review Queue', icon: ClipboardDocumentCheckIcon },
  ]

  const isActive = (path) => (path === '/' ? location.pathname === '/' : location.pathname.startsWith(path))

  return (
    <div className="app-shell font-sans">
      <Navbar onMenuClick={() => setMobileDrawerOpen(true)} />

      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[220px] flex-col justify-between border-r border-[var(--border-default)] bg-white md:flex">
        <div className="pt-[72px]">
          <div className="px-4 pb-4">
            <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">Veridian Platform</div>
            <div className="text-[10px] font-normal text-[#C4C9D4]">SUSTAINABILITY ANALYTICS</div>
          </div>

          <nav className="px-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-all ${
                    isActive(item.path)
                      ? 'border-l-2 border-[var(--brand-primary)] bg-[var(--brand-light)] text-[var(--brand-primary)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]'
                  }`}
                >
                  <Icon className={`h-[18px] w-[18px] ${isActive(item.path) ? 'text-[var(--brand-primary)]' : 'text-[var(--text-muted)]'}`} />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="border-t border-[var(--border-default)] p-4">
          <button className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]">
            <Cog6ToothIcon className="h-[18px] w-[18px] text-[var(--text-muted)]" />
            Settings
          </button>
          <button className="mt-1 flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]">
            <LifebuoyIcon className="h-[18px] w-[18px] text-[var(--text-muted)]" />
            Support
          </button>
        </div>
      </aside>

      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 md:hidden" onClick={() => setMobileDrawerOpen(false)}>
          <aside className="h-full w-[280px] bg-white p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-4">
              <div>
                <div className="text-[16px] font-semibold text-[var(--text-primary)]">Veridian</div>
                <div className="text-[11px] text-[var(--text-muted)]">Breathe ESG</div>
              </div>
              <button className="rounded-lg border border-[var(--border-default)] px-3 py-2 text-sm" onClick={() => setMobileDrawerOpen(false)}>Close</button>
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link key={item.path} to={item.path} onClick={() => setMobileDrawerOpen(false)} className="flex h-10 items-center gap-3 rounded-lg px-3 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]">
                    <Icon className="h-4 w-4 text-[var(--text-muted)]" />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </aside>
        </div>
      )}

      <div className="min-h-screen pl-0 md:pl-[220px]">
        <main className="min-h-screen bg-[var(--surface-secondary)] pt-14 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ClientProvider>
          <ToastProvider>
            <ErrorBoundary>
              <Suspense
                fallback={
                  <div className="flex min-h-screen items-center justify-center bg-[var(--surface-secondary)] font-sans">
                    <div className="flex flex-col items-center gap-4 rounded-2xl border border-[var(--border-default)] bg-white px-6 py-8 shadow-[var(--shadow-card)]">
                      <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--brand-primary)] border-t-transparent" />
                      <span className="text-sm font-medium text-[var(--text-muted)]">Loading workspace...</span>
                    </div>
                  </div>
                }
              >
                <Routes>
                  <Route path="/landing" element={<Landing />} />
                  <Route path="/login" element={<Login />} />
                  <Route
                    element={
                      <ProtectedRoute>
                        <AppLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/ingest" element={<Ingest />} />
                    <Route path="/review" element={<ReviewQueue />} />
                    <Route path="/imports/:importId" element={<ImportDetail />} />
                  </Route>
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </ToastProvider>
        </ClientProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
