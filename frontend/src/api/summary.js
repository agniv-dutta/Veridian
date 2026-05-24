import apiClient from './client'

export const getSummary = async (clientId = null) => {
  const params = clientId ? { client: clientId } : {}
  const response = await apiClient.get('/api/summary/', { params })
  return response.data
}
