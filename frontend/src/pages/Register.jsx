import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { FaBolt } from 'react-icons/fa'
import { FiAlertTriangle } from 'react-icons/fi'

const INPUT = "w-full px-4 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-orange-500/60 transition-colors"
const LABEL = "block text-xs font-semibold text-gray-400 mb-1.5"

const Register = () => {
    const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '' })
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const { register } = useAuth()
    const navigate = useNavigate()

    const onChange = e => setForm({ ...form, [e.target.name]: e.target.value })

    const onSubmit = async e => {
        e.preventDefault(); setError('')
        if (form.password !== form.confirmPassword) return setError('Passwords do not match.')
        if (form.password.length < 6) return setError('Password must be at least 6 characters.')
        setLoading(true)
        try { await register({ username: form.username, email: form.email, password: form.password }); navigate('/problems') }
        catch (err) { setError(err.response?.data?.message || 'Registration failed.') }
        finally { setLoading(false) }
    }

    const fields = [
        { id: 'username', label: 'Username', type: 'text', min: 3, placeholder: 'Choose a username' },
        { id: 'email', label: 'Email', type: 'email', min: null, placeholder: 'Enter your email' },
        { id: 'password', label: 'Password', type: 'password', min: 6, placeholder: 'Create a password (min. 6 chars)' },
        { id: 'confirmPassword', label: 'Confirm Password', type: 'password', min: null, placeholder: 'Confirm your password' }
    ]

    return (
        <div className="min-h-[calc(100vh-64px)] bg-[#0f0f0f] flex items-center justify-center px-4 py-16">
            <div className="w-full max-w-sm">
                <div className="flex flex-col items-center mb-8">
                    <span className="text-orange-500 mb-2"><FaBolt size={28} /></span>
                    <h1 className="text-2xl font-bold text-white">Join CodeMaster</h1>
                    <p className="text-gray-500 text-sm mt-1">Start your coding journey today</p>
                </div>
                <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 flex flex-col gap-4">
                    {error && <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-xs"><FiAlertTriangle size={13} />{error}</div>}
                    <form onSubmit={onSubmit} className="flex flex-col gap-4">
                        {fields.map(f => (
                            <div key={f.id}>
                                <label htmlFor={f.id} className={LABEL}>{f.label}</label>
                                <input id={f.id} name={f.id} type={f.type} required={true} minLength={f.min || undefined}
                                    value={form[f.id]} onChange={onChange} placeholder={f.placeholder} className={INPUT} />
                            </div>
                        ))}
                        <button type="submit" disabled={loading}
                            className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg text-sm transition-colors">
                            {loading ? 'Creating Account…' : 'Sign Up'}
                        </button>
                    </form>
                </div>
                <p className="text-center text-gray-500 text-xs mt-5">Already have an account? <Link to="/login" className="text-orange-400 hover:text-orange-300 font-medium">Log in</Link></p>
            </div>
        </div>
    )
}

export default Register
