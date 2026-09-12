const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'
const TOKEN_STORAGE_KEY = 'todoist-clone-token'

export function getStoredToken() {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY)
  } catch {
    return null
  }
}

export function setStoredToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token)
    else localStorage.removeItem(TOKEN_STORAGE_KEY)
  } catch {
    // storage unavailable (private browsing, etc.) - auth just won't persist across reloads
  }
}

// Requests that must NOT carry a stale/invalid Authorization header, and
// whose 401s must NOT trigger the auto-logout broadcast below - a failed
// login attempt is an expected, in-place error, not a session expiring.
const UNAUTHENTICATED_PATHS = ['/auth/login', '/auth/register']

async function request(path, options = {}) {
  const isAuthPath = UNAUTHENTICATED_PATHS.some((p) => path.startsWith(p))
  const token = isAuthPath ? null : getStoredToken()
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(`${BASE_URL}${path}`, { ...options, headers })

  if (response.status === 401 && !isAuthPath) {
    // Session expired or token invalid - broadcast so AuthContext can log
    // the user out and redirect to /login, without every call site having
    // to handle this individually.
    window.dispatchEvent(new CustomEvent('auth:unauthorized'))
  }

  if (!response.ok) {
    let detail = ''
    try {
      const body = await response.json()
      detail = body.detail ? ` - ${JSON.stringify(body.detail)}` : ''
    } catch {
      // response had no JSON body
    }
    throw new Error(`API request failed (${response.status})${detail}`)
  }
  if (response.status === 204) return null
  return response.json()
}

function qs(params) {
  const entries = Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== null && v !== '')
  if (entries.length === 0) return ''
  return '?' + new URLSearchParams(entries).toString()
}

export const api = {
  // Projects
  listProjects: () => request('/projects'),
  createProject: (data) => request('/projects', { method: 'POST', body: JSON.stringify(data) }),
  getProject: (id) => request(`/projects/${id}`),
  updateProject: (id, data) => request(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteProject: (id) => request(`/projects/${id}`, { method: 'DELETE' }),
  reorderProject: (id, sort_order) =>
    request(`/projects/${id}/reorder`, { method: 'PATCH', body: JSON.stringify({ sort_order }) }),

  // Sections
  listSections: (projectId) => request(`/projects/${projectId}/sections`),
  createSection: (projectId, data) =>
    request(`/projects/${projectId}/sections`, { method: 'POST', body: JSON.stringify(data) }),
  updateSection: (id, data) => request(`/sections/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteSection: (id) => request(`/sections/${id}`, { method: 'DELETE' }),

  // Tasks
  listTasks: (params) => request(`/tasks${qs(params)}`),
  createTask: (data) => request('/tasks', { method: 'POST', body: JSON.stringify(data) }),
  getTask: (id) => request(`/tasks/${id}`),
  updateTask: (id, data) => request(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteTask: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),
  completeTask: (id) => request(`/tasks/${id}/complete`, { method: 'POST' }),
  reopenTask: (id) => request(`/tasks/${id}/reopen`, { method: 'POST' }),
  reorderTask: (id, sort_order) =>
    request(`/tasks/${id}/reorder`, { method: 'PATCH', body: JSON.stringify({ sort_order }) }),

  // Labels
  listLabels: () => request('/labels'),
  createLabel: (data) => request('/labels', { method: 'POST', body: JSON.stringify(data) }),
  updateLabel: (id, data) => request(`/labels/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteLabel: (id) => request(`/labels/${id}`, { method: 'DELETE' }),

  // Filters
  listFilters: () => request('/filters'),
  createFilter: (data) => request('/filters', { method: 'POST', body: JSON.stringify(data) }),
  updateFilter: (id, data) => request(`/filters/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteFilter: (id) => request(`/filters/${id}`, { method: 'DELETE' }),

  // Views
  viewInbox: () => request('/views/inbox'),
  viewToday: () => request('/views/today'),
  viewUpcoming: (days = 7) => request(`/views/upcoming${qs({ days })}`),

  // Stats
  statsSummary: () => request('/stats/summary'),

  // Auth
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  me: () => request('/auth/me'),
}
