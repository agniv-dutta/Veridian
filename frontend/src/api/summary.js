import apiClient from './client'

export const getSummary = async (clientId = null) => {
  const params = clientId ? { client: clientId } : {}
  const response = await apiClient.get('/api/summary/', { params })
  return response.data
}

export const getScopeTrend = async (clientId = null) => {
  const params = clientId ? { client: clientId } : {}
  const response = await apiClient.get('/api/summary/scope-trend/', { params })
  return response.data
}

export const getExportCount = async (params = {}) => {
  const response = await apiClient.get('/api/export/count/', { params })
  return response.data
}
