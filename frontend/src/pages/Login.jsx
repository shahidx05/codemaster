import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { FaBolt } from 'react-icons/fa'
import { FiAlertTriangle } from 'react-icons/fi'

const INPUT = "w-full px-4 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-orange-500/60 transition-colors"
const LABEL = "block text-xs font-semibold text-gray-400 mb-1.5"

const Login = () => {
    const [form, setForm] = useState({ email: '', password: '' })
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const { login } = useAuth()
    const navigate = useNavigate()

    const onChange = e => setForm({ ...form, [e.target.name]: e.target.value })

    const onSubmit = async e => {
        e.preventDefault(); setError(''); setLoading(true)
        try { await login(form); navigate('/problems') }
        catch (err) { setError(err.response?.data?.message || 'Login failed.') }
        finally { setLoading(false) }
    }

    return (
        <div className="min-h-[calc(100vh-64px)] bg-[#0f0f0f] flex items-center justify-center px-4 py-16">
            <div className="w-full max-w-sm">
                <div className="flex flex-col items-center mb-8">
                    <span className="text-orange-500 mb-2"><FaBolt size={28} /></span>
                    <h1 className="text-2xl font-bold text-white">Welcome Back</h1>
                    <p className="text-gray-500 text-sm mt-1">Log in to continue your coding journey</p>
                </div>
                <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 flex flex-col gap-4">
                    {error && <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-xs"><FiAlertTriangle size={13} />{error}</div>}
                    <form onSubmit={onSubmit} className="flex flex-col gap-4">
                        <div><label htmlFor="email" className={LABEL}>Email</label>
                            <input id="email" name="email" type="email" required value={form.email} onChange={onChange} placeholder="Enter your email" className={INPUT} /></div>
                        <div><label htmlFor="password" className={LABEL}>Password</label>
                            <input id="password" name="password" type="password" required value={form.password} onChange={onChange} placeholder="Enter your password" className={INPUT} /></div>
                        <button type="submit" disabled={loading}
                            className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg text-sm transition-colors">
                            {loading ? 'Logging in…' : 'Log In'}
                        </button>
                    </form>
                </div>
                <p className="text-center text-gray-500 text-xs mt-5">Don&apos;t have an account? <Link to="/register" className="text-orange-400 hover:text-orange-300 font-medium">Sign up</Link></p>
            </div>
        </div>
    )
}

export default Login
