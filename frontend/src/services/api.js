import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('vm_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

export const auth = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
}

export const agent = {
  ask: (question) => api.post('/agent/ask', { question }),
  dashboard: () => api.get('/agent/dashboard'),
  whyChain: (question, chain_history) => api.post('/agent/why-chain', { question, chain_history }),
  riskRadar: () => api.get('/agent/risk-radar'),
  knowledgeGaps: () => api.get('/agent/knowledge-gaps'),
  conflicts: () => api.get('/agent/conflicts'),
  freshness: () => api.get('/agent/freshness'),
  whoKnows: (system) => api.get(`/agent/who-knows?system=${encodeURIComponent(system)}`),
  whatChanged: (from, to) => api.get(`/agent/what-changed?from=${from}&to=${to}`),
  health: () => api.get('/agent/health'),
  onboarding: (data) => api.post('/agent/onboarding', data),
  handover: (data) => api.post('/agent/handover', data),
  decisionEvolution: (topic) => api.get(`/agent/decision-evolution?topic=${encodeURIComponent(topic)}`),
  impact: (topic) => api.post('/agent/impact', { topic }),
}

export const memories = {
  list: () => api.get('/memory/'),
  get: (id) => api.get(`/memory/${id}`),
  retain: (data) => api.post('/memory/retain', data),
  recall: (query) => api.post('/memory/recall', { query }),
  delete: (id) => api.delete(`/memory/${id}`),
  timeline: () => api.get('/memory/timeline/events'),
}

export const documents = {
  upload: (data) => api.post('/documents/upload', data),
  list: () => api.get('/documents/'),
}

export const auditApi = {
  list: () => api.get('/audit/'),
}

export const adminApi = {
  users: () => api.get('/admin/users'),
  setRole: (userId, role) => api.patch(`/admin/users/${userId}/role`, { role }),
}

export default api
