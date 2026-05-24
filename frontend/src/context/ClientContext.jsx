import React, { createContext, useState, useEffect, useContext } from 'react'
import apiClient from '../api/client'

const ClientContext = createContext(null)

export const ClientProvider = ({ children }) => {
  const [clientId, setClientIdState] = useState(() => {
    return localStorage.getItem('clientId') || ''
  })
  const [clientList, setClientList] = useState([])
  const [isLoadingClients, setIsLoadingClients] = useState(false)

  const setClientId = (id) => {
    setClientIdState(id)
    if (id) {
      localStorage.setItem('clientId', id)
    } else {
      localStorage.removeItem('clientId')
    }
  }

  const fetchClients = async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      setClientList([])
      return
    }
    setIsLoadingClients(true)
    try {
      const response = await apiClient.get('/api/clients/')
      setClientList(response.data)
      // If we don't have a client selected, select the first one by default
      if (!clientId && response.data.length > 0) {
        setClientId(response.data[0].slug)
      }
    } catch (error) {
      console.error('Failed to fetch clients', error)
    } finally {
      setIsLoadingClients(false)
    }
  }

  // Fetch client list when the component mounts or token changes
  useEffect(() => {
    fetchClients()
  }, [])

  return (
    <ClientContext.Provider value={{ clientId, setClientId, clientList, isLoadingClients, refetchClients: fetchClients }}>
      {children}
    </ClientContext.Provider>
  )
}

export const useClient = () => {
  const context = useContext(ClientContext)
  if (!context) {
    throw new Error('useClient must be used within a ClientProvider')
  }
  return context
}

export default ClientContext
