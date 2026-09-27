import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const AdminRoute = ({ children }) => {
    const { user, loading, isAuthenticated } = useAuth()
    if (loading) return (
        <div className="flex items-center justify-center h-screen bg-[#0f0f0f]">
            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
    )
    if (!isAuthenticated) return <Navigate to="/login" replace />
    if (user?.role !== 'admin') return <Navigate to="/" replace />
    return children
}

export default AdminRoute
