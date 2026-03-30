import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { FaBolt, FaCode, FaSignOutAlt, FaUser, FaTrophy, FaUserShield, FaChalkboard } from 'react-icons/fa'

const Navbar = () => {
    const { user, logout, isAuthenticated } = useAuth()
    const navigate = useNavigate()

    const handleLogout = () => { logout(); navigate('/') }

    return (
        <nav className="sticky top-0 z-50 bg-[#0f0f0f]/90 backdrop-blur border-b border-[#2a2a2a]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                {/* Logo */}
                <Link to="/" className="flex items-center gap-2 group">
                    <span className="text-orange-500 group-hover:text-orange-400 transition-colors"><FaBolt size={20} /></span>
                    <span className="text-white font-bold text-lg tracking-tight">Code<span className="text-orange-500">Master</span></span>
                </Link>

                {/* Nav links + auth */}
                <div className="flex items-center gap-1">
                    {/* Problems — always visible */}
                    <Link
                        to="/problems"
                        className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-white/5"
                    >
                        <FaCode size={13} /> Problems
                    </Link>

                    {/* Contests — always visible */}
                    <Link
                        to="/contests"
                        className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-white/5"
                    >
                        <FaTrophy size={13} /> Contests
                    </Link>

                    {isAuthenticated ? (
                        <>
                            {/* Teacher Dashboard link — only for teachers */}
                            {user?.role === 'teacher' && (
                                <Link
                                    to="/teacher"
                                    className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 transition-colors text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-indigo-500/10"
                                >
                                    <FaChalkboard size={13} /> Dashboard
                                </Link>
                            )}

                            {/* Admin link — only for admins */}
                            {user?.role === 'admin' && (
                                <Link
                                    to="/admin"
                                    className="flex items-center gap-1.5 text-yellow-400 hover:text-yellow-300 transition-colors text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-yellow-500/10"
                                >
                                    <FaUserShield size={13} /> Admin
                                </Link>
                            )}

                            {/* Profile — role-specific destination */}
                            <Link
                                to={user?.role === 'teacher' ? '/teacher' : user?.role === 'admin' ? '/admin' : '/profile'}
                                className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-white/5"
                            >
                                {user?.profilePicture
                                    ? <img src={user.profilePicture} alt={user.username} className="w-7 h-7 rounded-full object-cover border border-[#3a3a3a]" />
                                    : <FaUser size={14} />}
                                <span>{user?.username}</span>
                            </Link>

                            {/* Logout */}
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-1.5 text-gray-400 hover:text-red-400 transition-colors text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-red-500/10 border border-transparent hover:border-red-500/20"
                            >
                                <FaSignOutAlt size={13} /> Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <Link to="/login"    className="text-gray-400 hover:text-white transition-colors text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-white/5">Login</Link>
                            <Link to="/register" className="bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors">Sign Up</Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    )
}

export default Navbar
