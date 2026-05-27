import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  BuildingOffice2Icon,
  BellIcon,
  QuestionMarkCircleIcon,
  ChevronDownIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../context/AuthContext'
import { useClient } from '../context/ClientContext'

const Navbar = ({ onMenuClick }) => {
  const { user, logout } = useAuth()
  const { clientId, setClientId, clientList, isLoadingClients } = useClient()
  
  const [isClientOpen, setIsClientOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  const clientRef = useRef(null)
  const profileRef = useRef(null)

  const clients = Array.isArray(clientList) ? clientList : []
  const activeClient = clients.find((c) => c.slug === clientId) || null

  const initials = useMemo(() => {
    const source = user?.name || user?.email || 'EA'
    return source
      .split(/\s+|@/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('')
      .slice(0, 2) || 'EA'
  }, [user])

  const roleLabel = user?.role ? user.role.replace(/_/g, ' ') : 'analyst'

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (clientRef.current && !clientRef.current.contains(e.target)) {
        setIsClientOpen(false)
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setIsProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 border-b border-[var(--border-default)] bg-[var(--surface-primary)] md:left-[220px]">
      <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-4">
        <button onClick={onMenuClick} className="grid h-9 w-9 place-items-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] md:hidden">
          <Bars3Icon className="h-5 w-5" />
        </button>
        <div className="flex-1 flex justify-center" ref={clientRef}>
          <div className="relative w-[200px]">
            <button
              onClick={() => setIsClientOpen(!isClientOpen)}
              className="input-base h-9 w-full px-3 flex items-center justify-between gap-2 text-sm text-[var(--text-secondary)]"
            >
              <div className="flex items-center gap-2 min-w-0">
                <BuildingOffice2Icon className="h-4 w-4 text-[var(--text-muted)] flex-shrink-0" />
                <span className={`truncate ${activeClient ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
                  {activeClient?.name || 'Select client'}
                </span>
              </div>
              <ChevronDownIcon className={`h-4 w-4 text-[var(--text-muted)] transition-transform ${isClientOpen ? 'rotate-180' : ''}`} />
            </button>

            {isClientOpen && (
              <div className="absolute left-0 mt-2 w-full overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] shadow-[var(--shadow-dropdown)]">
                {isLoadingClients ? (
                  <div className="px-3 py-2 text-sm text-[var(--text-muted)]">Loading clients...</div>
                ) : clients.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-[var(--text-muted)]">No clients available</div>
                ) : (
                  clients.map((client) => (
                    <button
                      key={client.id}
                      onClick={() => {
                        setClientId(client.slug)
                        setIsClientOpen(false)
                        window.location.reload()
                      }}
                      className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                        clientId === client.slug
                          ? 'bg-[var(--brand-light)] text-[var(--brand-primary)]'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]'
                      }`}
                    >
                      {client.name}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="relative grid h-9 w-9 place-items-center rounded-full text-[var(--text-muted)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-secondary)] transition-colors">
            <BellIcon className="h-5 w-5" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
          </button>

          <button className="grid h-9 w-9 place-items-center rounded-full text-[var(--text-muted)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-secondary)] transition-colors">
            <QuestionMarkCircleIcon className="h-5 w-5" />
          </button>

          <div className="h-6 w-px bg-[var(--border-default)]" />

          <div className="relative" ref={profileRef}>
            <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center gap-3 text-left">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-[var(--brand-primary)] text-[13px] font-semibold text-white">
                {initials}
              </div>
              <div className="hidden sm:flex flex-col leading-tight">
                <span className="text-[13px] font-medium text-[var(--text-primary)]">{user?.name || 'Emissions Analyst'}</span>
                <span className="text-[11px] text-[var(--text-muted)] uppercase">{roleLabel}</span>
              </div>
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] shadow-[var(--shadow-dropdown)]">
                <div className="border-b border-[var(--border-default)] px-4 py-3">
                  <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">Logged in as</p>
                  <p className="truncate text-sm font-medium text-[var(--text-primary)]">{user?.email || 'No email'}</p>
                </div>
                <button
                  onClick={logout}
                  className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Navbar
