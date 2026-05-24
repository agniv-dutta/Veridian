import React, { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useClient } from '../context/ClientContext'

const Navbar = () => {
  const { user, logout } = useAuth()
  const { clientId, setClientId, clientList, isLoadingClients } = useClient()
  
  const [isClientOpen, setIsClientOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  const clientRef = useRef(null)
  const profileRef = useRef(null)

  // Find active client name
  const activeClient = clientList.find((c) => c.slug === clientId) || { name: 'Select Client' }

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
    <header className="sticky top-0 z-40 w-full bg-white border-b border-gray-200">
      <div className="mx-auto px-6 h-16 flex items-center justify-between">
        
        {/* Left Section: Logo */}
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-[#115e59] tracking-tight">Veridian</span>
            <span className="text-xs text-gray-400 font-medium px-1.5 py-0.5 bg-gray-100 rounded">Breathe ESG</span>
          </div>
        </div>

        {/* Center Section: Client Selector */}
        <div className="flex-1 flex justify-center" ref={clientRef}>
          <div className="relative w-64">
            <button
              onClick={() => setIsClientOpen(!isClientOpen)}
              className="w-full flex items-center justify-between gap-2 px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-700 font-medium hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span className="truncate">{activeClient.name}</span>
              </div>
              <svg className={`w-4 h-4 text-gray-400 transition-transform ${isClientOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isClientOpen && (
              <div className="absolute left-0 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
                {isLoadingClients ? (
                  <div className="px-4 py-2 text-sm text-gray-400">Loading clients...</div>
                ) : clientList.length === 0 ? (
                  <div className="px-4 py-2 text-sm text-gray-400">No clients available</div>
                ) : (
                  clientList.map((client) => (
                    <button
                      key={client.id}
                      onClick={() => {
                        setClientId(client.slug)
                        setIsClientOpen(false)
                        // Trigger page reload or query refetch on client change
                        window.location.reload()
                      }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                        clientId === client.slug
                          ? 'bg-teal-50 text-[#115e59] font-semibold'
                          : 'text-gray-700 hover:bg-gray-50'
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

        {/* Right Section: Icons & User Avatar */}
        <div className="flex items-center gap-4">
          {/* Notification Bell */}
          <button className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-50 transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>

          {/* Help Center */}
          <button className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-50 transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          {/* Vertical divider */}
          <div className="h-6 w-px bg-gray-200"></div>

          {/* User Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 focus:outline-none"
            >
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&h=100&q=80"
                alt="User avatar"
                className="w-9 h-9 rounded-full object-cover border border-gray-200"
              />
              <div className="hidden md:flex flex-col items-start text-left">
                <span className="text-sm font-semibold text-gray-800 leading-none">{user?.name || 'Analyst'}</span>
                <span className="text-[10px] text-gray-400 font-medium tracking-wide uppercase mt-0.5">
                  {user?.role || 'Emissions Analyst'}
                </span>
              </div>
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-xs text-gray-400 font-semibold uppercase">Logged in as</p>
                  <p className="text-sm font-medium text-gray-900 truncate">{user?.email}</p>
                </div>
                <button
                  onClick={logout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
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
