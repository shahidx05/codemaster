import { createContext, useState, useEffect, useContext, useMemo, useCallback } from 'react'
import { authAPI } from '../services/api'

const AuthContext = createContext()

export const useAuth = () => {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within AuthProvider')
    return ctx
}

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const token = localStorage.getItem('token')
        if (token) loadUser()
        else setLoading(false)
    }, [])

    const loadUser = async () => {
        try {
            const res = await authAPI.getProfile()
            setUser(res.data.user)
        } catch {
            localStorage.removeItem('token')
        } finally {
            setLoading(false)
        }
    }

    const login = useCallback(async (credentials) => {
        const res = await authAPI.login(credentials)
        localStorage.setItem('token', res.data.token)
        setUser(res.data.user)
        return res.data
    }, [])

    const register = useCallback(async (userData) => {
        const res = await authAPI.register(userData)
        localStorage.setItem('token', res.data.token)
        setUser(res.data.user)
        return res.data
    }, [])

    const logout = useCallback(() => {
        localStorage.removeItem('token')
        setUser(null)
    }, [])

    const value = useMemo(() => ({
        user, loading, login, register, logout,
        isAuthenticated: !!user
    }), [user, loading, login, register, logout])

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
