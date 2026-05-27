import React, { createContext, useState, useEffect, useContext } from 'react'
import apiClient from '../api/client'

const AuthContext = createContext(null)

const decodeJWT = (token) => {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch (e) {
    return null
  }
}

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('token') || null)
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user')
    return savedUser ? JSON.parse(savedUser) : null
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // If token exists, validate or keep it
    if (token) {
      const decoded = decodeJWT(token)
      // Check expiry if exp is in decoded
      if (decoded && decoded.exp * 1000 < Date.now()) {
        logout()
      } else if (decoded) {
        setUser({
          id: decoded.user_id,
          role: decoded.role,
          clientSlug: decoded.client_slug,
          email: decoded.email || '',
          name: decoded.username || 'Emissions Analyst',
        })
      }
    } else {
      setUser(null)
    }
    setIsLoading(false)
  }, [token])

  const login = async (email, password) => {
    const username = email.trim()
    try {
      const response = await apiClient.post('/api/auth/login/', {
        username, // DRF SimpleJWT defaults to username for credentials mapping
        password,
      })
      const { access } = response.data
      localStorage.setItem('token', access)

      const decoded = decodeJWT(access)
      const userData = {
        id: decoded?.user_id,
        role: decoded?.role,
        clientSlug: decoded?.client_slug,
        email: username,
        name: decoded?.username || 'Emissions Analyst',
      }
      localStorage.setItem('user', JSON.stringify(userData))

      // Also set the default clientId context if client_slug is present
      if (decoded?.client_slug) {
        localStorage.setItem('clientId', decoded.client_slug)
      }

      setToken(access)
      setUser(userData)
      return { success: true }
    } catch (error) {
      console.error('Login failed', error)
      const isNetworkError = !error.response
      return {
        success: false,
        error: isNetworkError
          ? 'Cannot reach backend API. Confirm backend is running on http://127.0.0.1:8000 and restart the frontend dev server.'
          : error.response?.data?.detail || 'Invalid email or password',
      }
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('clientId')
    setToken(null)
    setUser(null)
    // Redirect to login page
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext
