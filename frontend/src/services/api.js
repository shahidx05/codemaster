import axios from 'axios'

// Vite env: use import.meta.env.VITE_* instead of process.env.REACT_APP_*
const API_BASE_URL = import.meta.env.VITE_API_URL

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
    submit:  (data)   => api.post('/submissions', data),
    run:     (data)   => api.post('/submissions/run', data),
    getAll:  (params) => api.get('/submissions', { params }),
    getById: (id)     => api.get(`/submissions/${id}`)
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
