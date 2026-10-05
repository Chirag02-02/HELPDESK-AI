import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'
const api = axios.create({ baseURL: API_BASE_URL, timeout: 15000 })
// Attach JWT to protected requests only
api.interceptors.request.use(config => {
  if (!config.url.includes('/auth/login') && !config.url.includes('/auth/register')) {
    const token = localStorage.getItem('hd_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Redirect to login on 401
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('hd_token')
      localStorage.removeItem('hd_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ── Auth ─────────────────────────────────────────────────────
export const authApi = {
  register: data => api.post('/auth/register', data),
  login: data => api.post('/auth/login', data),
}

// ── Tickets ──────────────────────────────────────────────────
export const ticketApi = {
  create: data => api.post('/tickets', data),
  myList: () => api.get('/tickets/my'),
  allTickets: (params) => api.get('/admin/tickets', { params }),
  getOne: id => api.get(`/tickets/${id}`),
  close: id => api.put(`/tickets/${id}/close`),
  reopen: id => api.put(`/tickets/${id}/reopen`),
  getMessages: id => api.get(`/tickets/${id}/messages`),
  escalate: (id, targetAgent) => api.put(`/tickets/${id}/escalate${targetAgent ? `?targetAgent=${encodeURIComponent(targetAgent)}` : ''}`),
  getAgents: () => api.get('/tickets/agents'),
  getSupportAgents: () => api.get('/tickets/support-agents'),
  assignAgent: (id, assigneeId) => api.post(`/tickets/${id}/assign-agent`, { assigneeId }),
}

// ── Chat ─────────────────────────────────────────────────────
export const chatApi = {
  send: (ticketId, message) => api.post(`/chat/${ticketId}`, { message }),
  direct: (message) => api.post('/chat/direct', { message }),
}

// ── Admin ────────────────────────────────────────────────────
export const adminApi = {
  dashboard: () => api.get('/admin/dashboard'),
  allTickets: (params) => api.get('/admin/tickets', { params }),
  assign: (id, data) => api.put(`/admin/tickets/${id}/assign`, data),
  setPriority: (id, data) => api.put(`/admin/tickets/${id}/priority`, data),
  closeTicket: id => api.put(`/admin/tickets/${id}/close`),
  replyTicket: (id, data) => api.post(`/admin/tickets/${id}/reply`, data),
  humanSupportTickets: () => api.get('/admin/tickets/human-support'),
  datasetStats: () => api.get('/admin/dataset/stats'),
  datasetPreview: (format) => api.get(`/admin/dataset/preview?format=${format}`),
  downloadDataset: (format) => api.get(`/admin/dataset/download?format=${format}`, { responseType: 'blob' }),
}

// ── Knowledge Base ──────────────────────────────────────────
export const knowledgeApi = {
  getAll: () => api.get('/admin/knowledge'),
  getOne: id => api.get(`/admin/knowledge/${id}`),
  create: data => api.post('/admin/knowledge', data),
  update: (id, data) => api.put(`/admin/knowledge/${id}`, data),
  delete: id => api.delete(`/admin/knowledge/${id}`),
}

// ── Profile Management ──────────────────────────────────────
export const profileApi = {
  get: () => api.get('/profile'),
  update: data => api.put('/profile', data),
  uploadPhoto: formData => api.post('/profile/upload-photo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
}

export const getProfilePhotoUrl = (url) => {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
    return url
  }
  const apiUrl = import.meta.env.VITE_API_URL || ''
  if (apiUrl && apiUrl.startsWith('http')) {
    const origin = new URL(apiUrl).origin
    return `${origin}${url.startsWith('/') ? '' : '/'}${url}`
  }
  return url
}

export default api

