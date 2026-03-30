import { useState, useEffect, useCallback } from 'react'
import { adminAPI, contestsAPI } from '../services/api'
import {
    FaUserShield, FaSearch, FaCheck, FaSpinner,
    FaUsers, FaTrophy, FaPaperPlane, FaChartBar,
    FaBars, FaTimes as FaX
} from 'react-icons/fa'
import { MdOutlineAdminPanelSettings, MdDashboard, MdVideoLabel } from 'react-icons/md'

// ── Helpers ────────────────────────────────────────────────────────────────────
function getStatus(c) {
    const now = Date.now()
    if (now < new Date(c.startTime)) return 'upcoming'
    if (now <= new Date(c.endTime))  return 'active'
    return 'ended'
}
function fmtDate(iso) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Shared components ─────────────────────────────────────────────────────────
const StatCard = ({ icon, value, label, sub, color = 'text-orange-400' }) => (
    <div className="flex flex-col gap-2 p-5 bg-[#111] border border-[#1e1e1e] rounded-2xl hover:border-[#2a2a2a] transition-colors">
        <div className={`text-2xl ${color}`}>{icon}</div>
        <div className="text-2xl font-bold text-white">{value ?? '—'}</div>
        <div className="text-xs text-gray-600">{label}</div>
        {sub && <div className="text-[10px] text-gray-700">{sub}</div>}
    </div>
)

const ROLE_STYLES = {
    user:    'text-gray-400 bg-gray-500/10 border-gray-500/20',
    teacher: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    admin:   'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
}
const RoleBadge = ({ role }) => (
    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${ROLE_STYLES[role] || ROLE_STYLES.user}`}>{role}</span>
)

const STATUS_BADGE = {
    upcoming: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    active:   'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    ended:    'text-gray-500 bg-gray-500/10 border-gray-500/20'
}

// ── Section: Platform Overview ────────────────────────────────────────────────
const OverviewSection = () => {
    const [stats,   setStats]   = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        adminAPI.getStats()
            .then(r => setStats(r.data))
            .catch(() => {})
            .finally(() => setLoading(false))
    }, [])

    if (loading) return <div className="flex justify-center py-20"><div className="w-7 h-7 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" /></div>

    const accRate = stats?.totalSubmissions > 0
        ? Math.round((stats.acceptedSubmissions ?? 0) / stats.totalSubmissions * 100)
        : 0

    return (
        <div className="flex flex-col gap-6">
            <h2 className="text-lg font-bold text-white">Platform Overview</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <StatCard icon={<FaUsers />}        value={stats?.totalUsers}       label="Total Users"       color="text-blue-400" />
                <StatCard icon={<FaChartBar />}      value={stats?.totalProblems}    label="Problems"          color="text-orange-400" />
                <StatCard icon={<FaPaperPlane />}    value={stats?.totalSubmissions} label="Submissions"       color="text-purple-400" />
                <StatCard icon={<FaTrophy />}        value={stats?.totalContests}    label="Contests"          color="text-emerald-400" />
                <StatCard icon={<FaCheck />}         value={`${accRate}%`}           label="Acceptance Rate"   color="text-green-400" />
            </div>
            <div className="p-4 bg-[#111] border border-[#1e1e1e] rounded-2xl">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">Quick Summary</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                    {[
                        { label: 'Users',             value: stats?.totalUsers ?? 0 },
                        { label: 'Active Contests',   value: stats?.activeContests ?? 0 },
                        { label: 'Problems Seeded',   value: stats?.totalProblems ?? 0 },
                        { label: 'Total Submissions', value: stats?.totalSubmissions ?? 0 }
                    ].map(r => (
                        <div key={r.label} className="flex items-center justify-between py-2 border-b border-[#1a1a1a]">
                            <span className="text-gray-500 text-xs">{r.label}</span>
                            <span className="text-white font-bold text-sm">{r.value}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

// ── Section: User Management ──────────────────────────────────────────────────
const UserManagementSection = () => {
    const [query,   setQuery]   = useState('')
    const [users,   setUsers]   = useState([])
    const [loading, setLoading] = useState(false)
    const [error,   setError]   = useState('')
    const [saving,  setSaving]  = useState({})
    const [saved,   setSaved]   = useState({})
    const [pending, setPending] = useState({})

    const search = useCallback(async () => {
        setLoading(true); setError('')
        try {
            const res = await adminAPI.searchUsers(query)
            setUsers(res.data.users)
            const init = {}
            res.data.users.forEach(u => { init[u._id] = u.role })
            setPending(init)
        } catch (err) {
            setError(err.response?.data?.message || 'Search failed')
        } finally { setLoading(false) }
    }, [query])

    const updateRole = async (userId) => {
        const newRole = pending[userId]
        if (!window.confirm(`Change role to "${newRole}"?`)) return
        setSaving(s => ({ ...s, [userId]: true }))
        try {
            await adminAPI.updateUserRole(userId, newRole)
            setUsers(prev => prev.map(u => u._id === userId ? { ...u, role: newRole } : u))
            setSaved(s => ({ ...s, [userId]: true }))
            setTimeout(() => setSaved(s => ({ ...s, [userId]: false })), 2000)
        } catch (err) {
            setError(err.response?.data?.message || 'Update failed')
        } finally { setSaving(s => ({ ...s, [userId]: false })) }
    }

    const isDirty = (u) => pending[u._id] !== undefined && pending[u._id] !== u.role

    return (
        <div className="flex flex-col gap-5">
            <h2 className="text-lg font-bold text-white">User Management</h2>

            {/* Search bar */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <FaSearch size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                    <input
                        id="admin-user-search"
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && search()}
                        placeholder="Search by username or email…"
                        className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-yellow-500/50 transition-colors"
                    />
                </div>
                <button
                    id="admin-search-btn"
                    onClick={search}
                    disabled={loading}
                    className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black text-sm font-bold px-5 py-2.5 rounded-xl transition-colors"
                >
                    {loading ? <FaSpinner className="animate-spin" size={13} /> : <FaSearch size={13} />} Search
                </button>
            </div>

            {error && <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>}

            {/* Results */}
            {users.length > 0 && (
                <div className="overflow-x-auto rounded-2xl border border-[#1e1e1e]">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-[#1e1e1e] bg-[#0d0d0d]">
                                {['User', 'Email', 'Current Role', 'Change Role', ''].map(h => (
                                    <th key={h} className="text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider px-4 py-3">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#141414]">
                            {users.map(u => (
                                <tr key={u._id} className="bg-[#111] hover:bg-[#161616] transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <img src={u.profilePicture || `https://ui-avatars.com/api/?name=${u.username}&background=random`}
                                                alt={u.username} className="w-7 h-7 rounded-full border border-[#2a2a2a]" />
                                            <span className="text-gray-200 font-medium">{u.username}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-gray-600 text-xs">{u.email}</td>
                                    <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                                    <td className="px-4 py-3">
                                        <select value={pending[u._id] || u.role}
                                            onChange={e => setPending(p => ({ ...p, [u._id]: e.target.value }))}
                                            className="bg-[#1a1a1a] border border-[#2a2a2a] text-gray-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-yellow-500/50 cursor-pointer">
                                            <option value="user">user</option>
                                            <option value="teacher">teacher</option>
                                            <option value="admin">admin</option>
                                        </select>
                                    </td>
                                    <td className="px-4 py-3">
                                        {saved[u._id] ? (
                                            <span className="flex items-center gap-1 text-emerald-400 text-xs font-bold"><FaCheck size={11} /> Saved</span>
                                        ) : (
                                            <button onClick={() => updateRole(u._id)}
                                                disabled={!isDirty(u) || saving[u._id]}
                                                className="flex items-center gap-1.5 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-30 disabled:cursor-not-allowed text-black text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
                                                {saving[u._id] ? <FaSpinner className="animate-spin" size={11} /> : <FaUserShield size={11} />} Update
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {users.length === 0 && !loading && query && (
                <p className="text-gray-600 text-sm text-center py-8">No users found for "{query}"</p>
            )}
        </div>
    )
}

// ── Section: Contest Monitor ──────────────────────────────────────────────────
const ContestMonitorSection = () => {
    const [contests, setContests] = useState([])
    const [loading,  setLoading]  = useState(true)

    useEffect(() => {
        contestsAPI.getAll()
            .then(r => setContests(r.data.contests || []))
            .catch(() => {})
            .finally(() => setLoading(false))
    }, [])

    if (loading) return <div className="flex justify-center py-20"><div className="w-7 h-7 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" /></div>

    const active   = contests.filter(c => getStatus(c) === 'active').length
    const upcoming = contests.filter(c => getStatus(c) === 'upcoming').length
    const ended    = contests.filter(c => getStatus(c) === 'ended').length

    return (
        <div className="flex flex-col gap-5">
            <h2 className="text-lg font-bold text-white">Contest Monitor</h2>
            <div className="grid grid-cols-3 gap-3">
                <StatCard icon={<FaTrophy />} value={active}   label="Live Now"  color="text-emerald-400" />
                <StatCard icon={<FaTrophy />} value={upcoming} label="Upcoming"  color="text-indigo-400" />
                <StatCard icon={<FaTrophy />} value={ended}    label="Ended"     color="text-gray-500"   />
            </div>
            {contests.length === 0 ? (
                <p className="text-gray-600 text-center py-12">No contests on the platform yet.</p>
            ) : (
                <div className="overflow-x-auto rounded-2xl border border-[#1e1e1e]">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-[#1e1e1e] bg-[#0d0d0d]">
                                {['Title', 'Created By', 'Status', 'Start', 'Participants', 'Problems'].map(h => (
                                    <th key={h} className="text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider px-4 py-3">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#141414]">
                            {contests.map(c => {
                                const status = getStatus(c)
                                return (
                                    <tr key={c._id} className="bg-[#111] hover:bg-[#161616] transition-colors">
                                        <td className="px-4 py-3 text-gray-200 font-medium max-w-xs truncate">{c.title}</td>
                                        <td className="px-4 py-3 text-gray-500 text-xs">{c.createdBy?.username || '—'}</td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${STATUS_BADGE[status]}`}>{status}</span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{fmtDate(c.startTime)}</td>
                                        <td className="px-4 py-3 text-gray-500 text-xs">
                                            <span className="flex items-center gap-1"><FaUsers size={10} /> {c.participantCount ?? 0}</span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500 text-xs text-center">{c.problemCount ?? 0}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}

// ── Nav items ─────────────────────────────────────────────────────────────────
const NAV = [
    { id: 'overview',  label: 'Platform Overview', icon: <MdDashboard size={16} /> },
    { id: 'users',     label: 'User Management',   icon: <FaUsers size={14} /> },
    { id: 'contests',  label: 'Contest Monitor',   icon: <FaTrophy size={13} /> }
]

// ── Main ──────────────────────────────────────────────────────────────────────
const AdminPage = () => {
    const [active,      setActive]      = useState('overview')
    const [sidebarOpen, setSidebarOpen] = useState(true)

    const section = {
        'overview': <OverviewSection />,
        'users':    <UserManagementSection />,
        'contests': <ContestMonitorSection />
    }

    return (
        <div className="flex h-[calc(100vh-64px)] bg-[#0f0f0f] overflow-hidden">
            {/* Sidebar */}
            <aside className={`flex flex-col border-r border-[#1a1a1a] bg-[#0d0d0d] transition-all duration-200 shrink-0 ${sidebarOpen ? 'w-56' : 'w-0 overflow-hidden'}`}>
                <div className="px-4 pt-5 pb-3">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-1 h-5 bg-yellow-500 rounded-full" />
                        <span className="text-sm font-bold text-white">Admin</span>
                    </div>
                    <p className="text-[10px] text-gray-600 pl-3">Control Panel</p>
                </div>
                <nav className="flex-1 px-2 pb-4 space-y-0.5">
                    {NAV.map(n => (
                        <button key={n.id} onClick={() => setActive(n.id)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left ${
                                active === n.id
                                    ? 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/20'
                                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                            }`}>
                            <span className={active === n.id ? 'text-yellow-400' : 'text-gray-600'}>{n.icon}</span>
                            {n.label}
                        </button>
                    ))}
                </nav>
            </aside>

            {/* Toggle */}
            <button onClick={() => setSidebarOpen(v => !v)}
                className="w-4 bg-[#0d0d0d] border-r border-[#1a1a1a] flex items-center justify-center text-gray-700 hover:text-gray-400 hover:bg-[#141414] transition-colors shrink-0">
                <div className={`transition-transform ${sidebarOpen ? '' : 'rotate-180'}`}>
                    {sidebarOpen ? <FaX size={7} /> : <FaBars size={7} />}
                </div>
            </button>

            {/* Content */}
            <main className="flex-1 overflow-y-auto p-6 lg:p-8">
                {section[active]}
            </main>
        </div>
    )
}

export default AdminPage
