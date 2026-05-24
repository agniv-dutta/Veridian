import apiClient from './client'

export const getRecords = async (params = {}) => {
  const response = await apiClient.get('/api/records/', { params })
  return response.data
}

export const getRecord = async (id) => {
  const response = await apiClient.get(`/api/records/${id}/`)
  return response.data
}

export const approveRecord = async (id) => {
  const response = await apiClient.post(`/api/records/${id}/approve/`)
  return response.data
}

export const rejectRecord = async (id) => {
  const response = await apiClient.post(`/api/records/${id}/reject/`)
  return response.data
}

export const updateRecord = async (id, data) => {
  const response = await apiClient.patch(`/api/records/${id}/`, data)
  return response.data
}

export const bulkApprove = async (ids) => {
  const response = await apiClient.post('/api/records/bulk-approve/', { ids })
  return response.data
}

export const bulkReject = async (ids) => {
  const response = await apiClient.post('/api/records/bulk-reject/', { ids })
  return response.data
}

export const dismissFlag = async (recordId, flagId) => {
  const response = await apiClient.delete(`/api/records/${recordId}/flags/${flagId}/`)
  return response.data
}

export const getSimilarRecords = async (recordId) => {
  const response = await apiClient.get(`/api/records/${recordId}/similar/`)
  return response.data
}

export const getComments = async (recordId) => {
  const response = await apiClient.get(`/api/records/${recordId}/comments/`)
  return response.data
}

export const postComment = async (recordId, data) => {
  const response = await apiClient.post(`/api/records/${recordId}/comments/`, data)
  return response.data
}

export const updateComment = async (recordId, commentId, data) => {
  const response = await apiClient.patch(`/api/records/${recordId}/comments/${commentId}/`, data)
  return response.data
}

export const deleteComment = async (recordId, commentId) => {
  const response = await apiClient.delete(`/api/records/${recordId}/comments/${commentId}/`)
  return response.data
}

export const getSparklines = async (clientId, ids) => {
  const response = await apiClient.get('/api/records/sparklines/', {
    params: { client: clientId, ids: ids.join(',') },
  })
  return response.data
}

