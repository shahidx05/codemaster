import axios from 'axios'

// Vite env: use import.meta.env.VITE_* instead of process.env.REACT_APP_*
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: { 'Content-Type': 'application/json' }
})

// Attach JWT on every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
})

// Auto-logout on 401 (expired / invalid token)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token')
            window.location.href = '/login'
        }
        return Promise.reject(error)
    }
)

export const authAPI = {
    register:   (userData)    => api.post('/auth/register', userData),
    login:      (credentials) => api.post('/auth/login', credentials),
    getProfile: ()            => api.get('/auth/profile')
}

export const problemsAPI = {
    getAll:  (params) => api.get('/problems', { params }),
    getById: (id)     => api.get(`/problems/${id}`),
    create:  (data)   => api.post('/problems', data),
    update:  (id, data) => api.put(`/problems/${id}`, data),
    delete:  (id)     => api.delete(`/problems/${id}`)
}

export const submissionsAPI = {
    submit:    (data)   => api.post('/submissions', data),
    run:       (data)   => api.post('/submissions/run', data),
    runCustom: (data)   => api.post('/submissions/run-custom', data),
    getAll:    (params) => api.get('/submissions', { params }),
    getById:   (id)     => api.get(`/submissions/${id}`),
    getStatus: (id)     => api.get(`/submissions/${id}/status`),
}

// Terminal statuses — polling stops when any of these is received
const TERMINAL_STATUSES = new Set([
    'Accepted', 'Wrong Answer', 'Runtime Error',
    'Time Limit Exceeded', 'Memory Limit Exceeded',
    'Compilation Error', 'Error',
])

/**
 * pollUntilDone(submissionId, onUpdate, options)
 *
 * Polls GET /submissions/:id/status with gentle exponential backoff until:
 *   - The submission reaches a terminal status  → resolves with the full result
 *   - `timeoutMs` has elapsed                   → rejects with a timeout error
 *   - `signal` is aborted (e.g. component unmount) → rejects with AbortError
 *
 * Backoff: starts at `intervalMs` (default 1.5 s), doubles each attempt up to
 * `maxIntervalMs` (default 8 s). This is gentle enough to not miss a fast result
 * but cuts request volume roughly in half for submissions that take >10 s.
 *
 * onUpdate(status) is called on every poll so the UI can show 'Queued' vs
 * 'Processing' transitions while waiting.
 */
export async function pollUntilDone(
    submissionId,
    onUpdate = () => {},
    { intervalMs = 1500, maxIntervalMs = 8000, timeoutMs = 120_000, signal } = {}
) {
    const deadline = Date.now() + timeoutMs
    let currentInterval = intervalMs

    while (true) {
        if (signal?.aborted) {
            throw new DOMException('Polling aborted', 'AbortError')
        }
        if (Date.now() > deadline) {
            throw new Error('Submission timed out — please check My Submissions for the result.')
        }

        const { data } = await submissionsAPI.getStatus(submissionId)
        onUpdate(data.status)

        if (data.isTerminal) {
            return data // { submissionId, status, isTerminal: true, submission: {...} }
        }

        // Exponential backoff — doubles each poll, capped at maxIntervalMs
        await new Promise((resolve, reject) => {
            const t = setTimeout(resolve, currentInterval)
            signal?.addEventListener('abort', () => { clearTimeout(t); reject(new DOMException('Polling aborted', 'AbortError')) }, { once: true })
        })
        currentInterval = Math.min(currentInterval * 2, maxIntervalMs)
    }
}


export const contestsAPI = {
    getAll:      ()           => api.get('/contests'),
    getMy:       ()           => api.get('/contests/my'),
    getById:     (id)         => api.get(`/contests/${id}`),
    create:      (data)       => api.post('/contests', data),
    update:      (id, data)   => api.put(`/contests/${id}`, data),
    delete:      (id)         => api.delete(`/contests/${id}`),
    join:        (id)         => api.post(`/contests/${id}/join`),
    leaderboard: (id)         => api.get(`/contests/${id}/leaderboard`)
}

export const adminAPI = {
    searchUsers:    (search) => api.get('/auth/users', { params: { search } }),
    updateUserRole: (id, role) => api.patch(`/auth/users/${id}/role`, { role }),
    getStats:       () => api.get('/auth/admin/stats')
}

export default api
