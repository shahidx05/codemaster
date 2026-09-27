import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { submissionsAPI, contestsAPI, adminAPI } from '../services/api'

import {
    FaTrophy, FaPaperPlane, FaCheckCircle, FaChartLine,
    FaUsers, FaChalkboard, FaUserShield, FaCode
} from 'react-icons/fa'
import { MdOutlineLeaderboard } from 'react-icons/md'
import { Link } from 'react-router-dom'

// ── Activity Heatmap (last 30 days) ───────────────────────────────────────────
const ActivityHeatmap = ({ submissions }) => {
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    const days = Array.from({ length: 35 }, (_, i) => {
        const d = new Date(today)
        d.setDate(today.getDate() - (34 - i))
        return d
    })

    // Count submissions per day
    const countMap = {}
    submissions.forEach(s => {
        const key = new Date(s.createdAt).toDateString()
        countMap[key] = (countMap[key] || 0) + 1
    })

    const getColor = (count) => {
        if (!count)    return 'bg-[#1a1a1a]'
        if (count < 2) return 'bg-orange-500/30'
        if (count < 4) return 'bg-orange-500/55'
        if (count < 7) return 'bg-orange-500/80'
        return 'bg-orange-500'
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">Activity</h3>
                <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
                    Less
                    {['bg-[#1a1a1a]','bg-orange-500/30','bg-orange-500/55','bg-orange-500/80','bg-orange-500'].map(c => (
                        <span key={c} className={`w-2.5 h-2.5 rounded-sm ${c}`} />
                    ))}
                    More
                </div>
            </div>
            <div className="grid grid-cols-[repeat(35,minmax(0,1fr))] gap-1">
                {days.map((d, i) => {
                    const count = countMap[d.toDateString()] || 0
                    return (
                        <div key={i} title={`${d.toDateString()}: ${count} submission${count !== 1 ? 's' : ''}`}
                            className={`aspect-square rounded-sm transition-opacity hover:opacity-80 cursor-default ${getColor(count)}`} />
                    )
                })}
            </div>
            <p className="text-[10px] text-gray-700 mt-2">Last 35 days</p>
        </div>
    )
}

// ── Stat card ─────────────────────────────────────────────────────────────────
const StatCard = ({ icon, value, label, color }) => (
    <div className="flex flex-col items-center gap-1.5 p-5 bg-[#111] border border-[#1e1e1e] rounded-2xl text-center hover:border-[#2a2a2a] transition-colors">
        <span className={`text-2xl ${color}`}>{icon}</span>
        <span className="text-2xl font-bold text-white">{value}</span>
        <span className="text-xs text-gray-600">{label}</span>
    </div>
)

const STATUS_DOT = {
    'Accepted':            'bg-emerald-500',
    'Wrong Answer':        'bg-red-500',
    'Time Limit Exceeded': 'bg-yellow-500',
    'Runtime Error':       'bg-orange-500',
    'Compilation Error':   'bg-pink-500',
}

// ── Student Profile ────────────────────────────────────────────────────────────
const StudentProfile = ({ user }) => {
    const [submissions, setSubmissions] = useState([])
    const [loading,     setLoading]     = useState(true)
    const [stats,       setStats]       = useState({ total: 0, accepted: 0, rate: '0.0' })

    useEffect(() => {
        (async () => {
            try {
                const res  = await submissionsAPI.getAll()
                const subs = res.data.submissions
                setSubmissions(subs)
                const accepted = subs.filter(s => s.status === 'Accepted').length
                setStats({
                    total:    subs.length,
                    accepted,
                    rate:     subs.length > 0 ? ((accepted / subs.length) * 100).toFixed(1) : '0.0'
                })
            } catch {}
            finally { setLoading(false) }
        })()
    }, [])

    if (loading) return (
        <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
    )

    return (
        <>
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard icon={<FaTrophy />}     value={user?.solvedProblems?.length ?? 0} label="Solved"      color="text-orange-400" />
                <StatCard icon={<FaPaperPlane />} value={stats.total}                        label="Submissions" color="text-blue-400"   />
                <StatCard icon={<FaCheckCircle />} value={stats.accepted}                   label="Accepted"    color="text-emerald-400" />
                <StatCard icon={<FaChartLine />}  value={`${stats.rate}%`}                  label="Acc. Rate"   color="text-purple-400" />
            </div>

            {/* Heatmap */}
            <div className="p-5 bg-[#111] border border-[#1e1e1e] rounded-2xl">
                <ActivityHeatmap submissions={submissions} />
            </div>

            {/* Recent submissions */}
            <div>
                <h2 className="text-base font-bold text-white mb-4">Recent Submissions</h2>
                {submissions.length === 0 ? (
                    <div className="text-center py-12 bg-[#111] border border-[#1e1e1e] rounded-2xl text-gray-600">
                        <FaCode size={28} className="mx-auto mb-3 opacity-20" />
                        <p>No submissions yet. <Link to="/problems" className="text-orange-400 hover:underline">Start solving!</Link></p>
                    </div>
                ) : (
                    <div className="rounded-2xl border border-[#1e1e1e] overflow-hidden">
                        {submissions.slice(0, 10).map(s => (
                            <div key={s._id} className="flex items-center gap-3 px-4 py-3 bg-[#111] hover:bg-[#161616] border-b border-[#1a1a1a] transition-colors last:border-b-0">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[s.status] || 'bg-gray-500'}`} />
                                <span className="flex-1 text-gray-300 text-sm font-medium truncate">{s.problem?.title || 'Unknown'}</span>
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                                    s.status === 'Accepted' ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
                                }`}>{s.status}</span>
                                <span className="text-xs text-gray-700 shrink-0 hidden sm:block">
                                    {new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    )
}

// ── Teacher Profile ────────────────────────────────────────────────────────────
const STATUS_BADGE = {
    upcoming: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    active:   'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    ended:    'text-gray-500 bg-gray-500/10 border-gray-500/20'
}

const TeacherProfile = () => {
    const [contests, setContests] = useState([])
    const [loading,  setLoading]  = useState(true)

    useEffect(() => {
        (async () => {
            try {
                const res = await contestsAPI.getMy()
                setContests(res.data.contests || [])
            } catch {}
            finally { setLoading(false) }
        })()
    }, [])

    const totalParticipants = contests.reduce((a, c) => a + (c.participantCount || 0), 0)
    const totalProblems     = contests.reduce((a, c) => a + (c.problems?.length || 0), 0)

    if (loading) return (
        <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
    )

    return (
        <>
            <div className="grid grid-cols-3 gap-3">
                <StatCard icon={<MdOutlineLeaderboard size={22} />} value={contests.length}  label="Contests Created"   color="text-indigo-400"  />
                <StatCard icon={<FaTrophy />}                        value={totalProblems}    label="Problems Added"     color="text-orange-400"  />
                <StatCard icon={<FaUsers />}                         value={totalParticipants} label="Total Participants" color="text-emerald-400" />
            </div>

            <div>
                <h2 className="text-base font-bold text-white mb-4">My Contests</h2>
                {contests.length === 0 ? (
                    <div className="text-center py-12 bg-[#111] border border-[#1e1e1e] rounded-2xl text-gray-600">
                        <FaTrophy size={28} className="mx-auto mb-3 opacity-20" />
                        <p>No contests yet. <Link to="/teacher" className="text-orange-400 hover:underline">Create one!</Link></p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        {contests.map(c => {
                            const status = c.status || 'ended'
                            return (
                                <Link key={c._id} to={`/contests/${c._id}`}
                                    className="flex items-center justify-between gap-4 bg-[#111] border border-[#1e1e1e] rounded-xl px-5 py-4 hover:border-[#2a2a2a] transition-all group">
                                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                                        <span className="text-gray-200 font-semibold truncate group-hover:text-white transition-colors">{c.title}</span>
                                        <div className="flex items-center gap-3 text-xs text-gray-600">
                                            <span className="flex items-center gap-1"><FaUsers size={9} /> {c.participantCount || 0}</span>
                                            <span className="flex items-center gap-1"><FaTrophy size={9} /> {c.problems?.length || 0} problems</span>
                                        </div>
                                    </div>
                                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${STATUS_BADGE[status] || STATUS_BADGE.ended}`}>
                                        {status}
                                    </span>
                                </Link>
                            )
                        })}
                    </div>
                )}
            </div>
        </>
    )
}

// ── Admin Profile ─────────────────────────────────────────────────────────────
const AdminProfile = () => {
    const [stats,   setStats]   = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        (async () => {
            try {
                const res = await adminAPI.getStats()
                setStats(res.data)
            } catch {}
            finally { setLoading(false) }
        })()
    }, [])

    if (loading) return (
        <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
    )

    return (
        <>
            <div>
                <h2 className="text-base font-bold text-white mb-1">Platform Stats</h2>
                <p className="text-gray-600 text-sm mb-4">Live snapshot of all platform activity.</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard icon={<FaUsers />}      value={stats?.totalUsers       ?? 0} label="Total Users"       color="text-blue-400"   />
                <StatCard icon={<FaTrophy />}     value={stats?.totalProblems    ?? 0} label="Problems"          color="text-orange-400" />
                <StatCard icon={<FaPaperPlane />} value={stats?.totalSubmissions ?? 0} label="Submissions"       color="text-purple-400" />
                <StatCard icon={<MdOutlineLeaderboard size={22} />} value={stats?.totalContests ?? 0} label="Contests" color="text-emerald-400" />
            </div>
            <div className="p-5 bg-[#111] border border-[#1e1e1e] rounded-2xl">
                <p className="text-xs text-gray-600 mb-3 font-semibold uppercase tracking-wider">Platform Health</p>
                <div className="grid grid-cols-2 gap-3">
                    {[
                        { label: 'Active Contests',    value: stats?.activeContests   ?? 0 },
                        { label: 'Acceptance Rate',    value: stats?.totalSubmissions > 0 ? `${Math.round((stats.acceptedSubmissions ?? 0) / stats.totalSubmissions * 100)}%` : '—' },
                        { label: 'Teachers',           value: stats?.teacherCount     ?? '—' },
                        { label: 'Avg. Problems/Contest', value: stats?.totalContests > 0 ? Math.round((stats.totalProblems || 0) / stats.totalContests) : '—' }
                    ].map(r => (
                        <div key={r.label} className="flex items-center justify-between py-2 border-b border-[#1a1a1a]">
                            <span className="text-gray-600 text-xs">{r.label}</span>
                            <span className="text-white font-bold text-sm">{r.value}</span>
                        </div>
                    ))}
                </div>
            </div>
        </>
    )
}

// ── Role badge config ────────────────────────────────────────────────────────
const ROLE_BADGE = {
    admin:   { cls: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',   label: 'Admin',   icon: <FaUserShield size={10} /> },
    teacher: { cls: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',   label: 'Teacher', icon: <FaChalkboard size={10} /> }
}

// ── Main ProfilePage ──────────────────────────────────────────────────────────
const ProfilePage = () => {
    const { user } = useAuth()
    const badge = ROLE_BADGE[user?.role]

    return (
        <div className="min-h-screen bg-[#0f0f0f] py-10 px-4">
            <div className="max-w-3xl mx-auto flex flex-col gap-6">

                {/* Profile header card */}
                <div className="flex items-center gap-5 p-6 bg-[#111] border border-[#1e1e1e] rounded-2xl">
                    <div className="relative shrink-0">
                        <img
                            src={user?.profilePicture || `https://ui-avatars.com/api/?name=${user?.username}&background=random&size=120`}
                            alt={user?.username}
                            className="w-20 h-20 rounded-2xl border-2 border-[#2a2a2a] object-cover"
                        />
                        {badge && (
                            <span className={`absolute -bottom-2 -right-2 flex items-center gap-1 text-[10px] font-bold border px-1.5 py-0.5 rounded-full ${badge.cls}`}>
                                {badge.icon}
                            </span>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-xl font-bold text-white">{user?.username}</h1>
                            {badge && (
                                <span className={`inline-flex items-center gap-1 text-xs font-bold border px-2 py-0.5 rounded-full ${badge.cls}`}>
                                    {badge.icon} {badge.label}
                                </span>
                            )}
                        </div>
                        <p className="text-gray-500 text-sm mt-0.5">{user?.email}</p>
                        <p className="text-gray-700 text-xs mt-1">Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—'}</p>
                    </div>
                </div>

                {/* Role-specific content */}
                {user?.role === 'admin'                          && <AdminProfile />}
                {user?.role === 'teacher'                        && <TeacherProfile />}
                {(!user?.role || user?.role === 'user')          && <StudentProfile user={user} />}
            </div>
        </div>
    )
}

export default ProfilePage
