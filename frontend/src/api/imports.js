import apiClient from './client'

export const getImports = async (params = {}) => {
  const response = await apiClient.get('/api/imports/', { params })
  return response.data
}

export const getImport = async (id) => {
  const response = await apiClient.get(`/api/imports/${id}/`)
  return response.data
}

export const getImportPreview = async (id) => {
  const response = await apiClient.get(`/api/imports/${id}/preview/`)
  return response.data
}

export const reingestImport = async (id) => {
  const response = await apiClient.post(`/api/imports/${id}/reingest/`)
  return response.data
}

export const ingestSAP = async (formData, config = {}) => {
  const response = await apiClient.post('/api/ingest/sap/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    ...config,
  })
  return response.data
}

export const ingestUtility = async (formData, config = {}) => {
  const response = await apiClient.post('/api/ingest/utility/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    ...config,
  })
  return response.data
}

export const ingestTravel = async (payload, config = {}) => {
  const isFormData = payload instanceof FormData
  const response = await apiClient.post('/api/ingest/travel/', payload, {
    headers: {
      'Content-Type': isFormData ? 'multipart/form-data' : 'application/json',
    },
    ...config,
  })
  return response.data
}
