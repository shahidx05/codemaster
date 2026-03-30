import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { contestsAPI, submissionsAPI, problemsAPI } from '../services/api'
import {
    FaCode, FaLaptopCode, FaClipboardCheck, FaChartBar,
    FaArrowRight, FaTrophy, FaBolt, FaCheckCircle,
    FaPaperPlane, FaClock, FaUsers, FaFire
} from 'react-icons/fa'
import { MdTimer } from 'react-icons/md'

// ── Countdown hook ─────────────────────────────────────────────────────────────
function useCountdown(target) {
    const calc = () => {
        const diff = new Date(target) - Date.now()
        if (diff <= 0) return null
        const h = Math.floor(diff / 3600000)
        const m = Math.floor((diff % 3600000) / 60000)
        const s = Math.floor((diff % 60000) / 1000)
        return { h, m, s }
    }
    const [time, setTime] = useState(calc)
    useEffect(() => {
        const id = setInterval(() => setTime(calc()), 1000)
        return () => clearInterval(id)
    }, [target])
    return time
}

// ── Active contest banner ──────────────────────────────────────────────────────
const ActiveContestBanner = ({ contest }) => {
    const time = useCountdown(contest.endTime)
    return (
        <Link to={`/contests/${contest._id}`}
            className="flex items-center justify-between gap-4 p-4 bg-gradient-to-r from-orange-500/10 to-amber-500/5 border border-orange-500/20 rounded-2xl hover:border-orange-500/40 transition-all group">
            <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                    <FaTrophy size={15} className="text-orange-400" />
                </div>
                <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE NOW
                        </span>
                    </div>
                    <p className="text-white font-semibold text-sm truncate">{contest.title}</p>
                    <p className="text-gray-500 text-xs">{contest.participantCount ?? 0} participants</p>
                </div>
            </div>
            <div className="flex items-center gap-4 shrink-0">
                {time && (
                    <div className="flex items-center gap-1.5 text-orange-400 font-mono font-bold text-sm">
                        <MdTimer size={15} />
                        {String(time.h).padStart(2,'0')}:{String(time.m).padStart(2,'0')}:{String(time.s).padStart(2,'0')}
                    </div>
                )}
                <span className="flex items-center gap-1.5 text-xs font-semibold text-white bg-orange-500 group-hover:bg-orange-400 px-3 py-1.5 rounded-lg transition-colors">
                    Enter <FaArrowRight size={10} />
                </span>
            </div>
        </Link>
    )
}

// ── Static features (for guests) ──────────────────────────────────────────────
const FEATURES = [
    { icon: <FaCode size={20} />, title: 'Curated Problems', desc: 'Handpicked algorithmic challenges across Easy, Medium, and Hard.', color: 'text-orange-400' },
    { icon: <FaLaptopCode size={20} />, title: 'Real Execution', desc: 'C++ runs on Piston API. JavaScript runs locally with instant feedback.', color: 'text-blue-400' },
    { icon: <FaClipboardCheck size={20} />, title: 'Instant Results', desc: 'Detailed per-test feedback with public and private test case visibility.', color: 'text-emerald-400' },
    { icon: <FaChartBar size={20} />, title: 'Live Contests', desc: 'Timed competitions with real-time leaderboards and point scoring.', color: 'text-purple-400' }
]

// ── Authenticated dashboard ────────────────────────────────────────────────────
const AuthenticatedHome = ({ user }) => {
    const [activeContests, setActiveContests] = useState([])
    const [submissions,    setSubmissions]     = useState([])
    const [problemCount,   setProblemCount]    = useState(0)
    const [loading,        setLoading]         = useState(true)

    useEffect(() => {
        Promise.all([
            contestsAPI.getAll().catch(() => ({ data: { contests: [] } })),
            submissionsAPI.getAll().catch(() => ({ data: { submissions: [] } })),
            problemsAPI.getAll().catch(() => ({ data: { problems: [] } }))
        ]).then(([c, s, p]) => {
            const now = Date.now()
            setActiveContests(c.data.contests.filter(x =>
                now >= new Date(x.startTime) && now <= new Date(x.endTime)
            ))
            setSubmissions(s.data.submissions.slice(0, 5))
            setProblemCount(p.data.problems.length)
        }).finally(() => setLoading(false))
    }, [])

    const solved    = user?.solvedProblems?.length ?? 0
    const totalSubs = submissions.length
    const accRate   = totalSubs > 0
        ? Math.round(submissions.filter(s => s.status === 'Accepted').length / totalSubs * 100)
        : 0

    const STATUS_COLOR = {
        'Accepted':             'text-emerald-400 bg-emerald-500/10',
        'Wrong Answer':         'text-red-400 bg-red-500/10',
        'Time Limit Exceeded':  'text-yellow-400 bg-yellow-500/10',
        'Runtime Error':        'text-orange-400 bg-orange-500/10',
        'Compilation Error':    'text-pink-400 bg-pink-500/10',
    }

    return (
        <div className="max-w-5xl mx-auto px-4 py-10 flex flex-col gap-8">
            {/* Welcome header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <p className="text-gray-500 text-sm">Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},</p>
                    <h1 className="text-3xl font-extrabold text-white mt-0.5">
                        Welcome back, <span className="text-orange-400">{user?.username}</span> 👋
                    </h1>
                </div>
                <Link to="/problems"
                    className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white font-semibold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-orange-500/20 text-sm">
                    Keep Coding <FaArrowRight size={12} />
                </Link>
            </div>

            {/* Live contest banner(s) */}
            {!loading && activeContests.length > 0 && (
                <div className="flex flex-col gap-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                        <FaFire className="text-orange-400" size={11} /> Active Contests
                    </p>
                    {activeContests.map(c => <ActiveContestBanner key={c._id} contest={c} />)}
                </div>
            )}

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { icon: <FaTrophy className="text-orange-400" />, value: solved,           label: 'Solved',         sub: `of ${problemCount}` },
                    { icon: <FaPaperPlane className="text-blue-400" />, value: totalSubs,      label: 'Submissions',    sub: 'total' },
                    { icon: <FaCheckCircle className="text-emerald-400" />, value: `${accRate}%`, label: 'Acceptance',  sub: 'rate' },
                    { icon: <FaTrophy className="text-purple-400" />, value: activeContests.length, label: 'Live',     sub: 'contests' }
                ].map(c => (
                    <div key={c.label} className="flex flex-col gap-1 p-4 bg-[#141414] border border-[#1e1e1e] rounded-2xl hover:border-[#2a2a2a] transition-colors">
                        <div className="flex items-center justify-between">
                            <span className="text-lg">{c.icon}</span>
                            <span className="text-xs text-gray-600">{c.sub}</span>
                        </div>
                        <span className="text-2xl font-bold text-white mt-1">{c.value}</span>
                        <span className="text-xs text-gray-500">{c.label}</span>
                    </div>
                ))}
            </div>

            {/* Bottom row: recent submissions + quick links */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Recent submissions */}
                <div className="lg:col-span-2 bg-[#141414] border border-[#1e1e1e] rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-white font-bold text-sm">Recent Submissions</h2>
                        <Link to="/profile" className="text-xs text-orange-400 hover:text-orange-300 transition-colors">View all →</Link>
                    </div>
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="w-6 h-6 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : submissions.length === 0 ? (
                        <p className="text-gray-600 text-sm text-center py-8">No submissions yet. Start solving! 🚀</p>
                    ) : (
                        <div className="flex flex-col divide-y divide-[#1a1a1a]">
                            {submissions.map(s => (
                                <div key={s._id} className="flex items-center justify-between py-2.5 gap-3">
                                    <span className="text-gray-300 text-sm font-medium truncate">{s.problem?.title || 'Unknown'}</span>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[s.status] || 'text-gray-500 bg-gray-500/10'}`}>
                                            {s.status}
                                        </span>
                                        <span className="text-xs text-gray-700 hidden sm:block">
                                            {new Date(s.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Quick links */}
                <div className="flex flex-col gap-3">
                    {[
                        { to: '/problems', icon: <FaCode className="text-orange-400" size={16} />, title: 'Browse Problems', desc: `${problemCount} problems available`, bg: 'hover:border-orange-500/20' },
                        { to: '/contests', icon: <FaTrophy className="text-purple-400" size={16} />, title: 'Join a Contest', desc: `${activeContests.length} live now`, bg: 'hover:border-purple-500/20' },
                        { to: '/profile',  icon: <FaChartBar className="text-blue-400" size={16} />,  title: 'Your Profile',    desc: 'Stats & history', bg: 'hover:border-blue-500/20' }
                    ].map(q => (
                        <Link key={q.to} to={q.to}
                            className={`flex items-center gap-3 p-4 bg-[#141414] border border-[#1e1e1e] rounded-xl transition-all group ${q.bg}`}>
                            <div className="w-9 h-9 rounded-lg bg-[#1e1e1e] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                {q.icon}
                            </div>
                            <div className="min-w-0">
                                <p className="text-white text-sm font-semibold">{q.title}</p>
                                <p className="text-gray-600 text-xs">{q.desc}</p>
                            </div>
                            <FaArrowRight size={11} className="text-gray-700 group-hover:text-gray-400 ml-auto shrink-0 transition-colors" />
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    )
}

// ── Guest landing page ─────────────────────────────────────────────────────────
const GuestHome = () => (
    <div className="min-h-screen bg-[#0f0f0f]">
        {/* Hero */}
        <section className="relative flex flex-col items-center justify-center text-center px-4 pt-28 pb-24 overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-orange-500/8 blur-[130px] rounded-full pointer-events-none" />
            <div className="relative max-w-3xl mx-auto">
                <span className="inline-flex items-center gap-1.5 text-orange-400 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border border-orange-500/20 bg-orange-500/10 mb-7">
                    <FaBolt size={9} /> College Coding Contest Platform
                </span>
                <h1 className="text-5xl sm:text-6xl font-extrabold text-white leading-tight mb-6 tracking-tight">
                    Compete. Learn.<br />
                    <span className="bg-gradient-to-r from-orange-400 to-amber-500 bg-clip-text text-transparent">Level Up.</span>
                </h1>
                <p className="text-gray-400 text-lg max-w-xl mx-auto mb-10 leading-relaxed">
                    Practice algorithmic problems, join timed contests, and climb the leaderboard — all in one platform built for your college.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                    <Link to="/register"
                        className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white font-bold px-7 py-3 rounded-xl transition-all shadow-lg shadow-orange-500/25 text-sm">
                        Get Started Free <FaArrowRight size={13} />
                    </Link>
                    <Link to="/problems"
                        className="flex items-center gap-2 text-gray-300 hover:text-white border border-[#2a2a2a] hover:border-[#3a3a3a] px-7 py-3 rounded-xl transition-all text-sm">
                        Browse Problems
                    </Link>
                </div>
            </div>
        </section>

        {/* Features */}
        <section className="py-20 px-4 border-t border-[#141414]">
            <div className="max-w-5xl mx-auto">
                <h2 className="text-2xl font-bold text-white text-center mb-12">
                    Everything you need to <span className="text-orange-400">excel</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {FEATURES.map(f => (
                        <div key={f.title}
                            className="flex flex-col gap-3 p-6 bg-[#141414] border border-[#1e1e1e] rounded-2xl hover:border-[#2a2a2a] transition-colors group">
                            <span className={`${f.color} group-hover:scale-110 transition-transform inline-block`}>{f.icon}</span>
                            <h3 className="text-white font-semibold text-sm">{f.title}</h3>
                            <p className="text-gray-600 text-xs leading-relaxed">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>

        {/* Stats */}
        <section className="py-16 px-4 border-t border-[#141414]">
            <div className="max-w-3xl mx-auto grid grid-cols-3 gap-8 text-center">
                {[
                    { value: '10+', label: 'Problems' },
                    { value: '2',   label: 'Languages' },
                    { value: '∞',   label: 'Contests' }
                ].map(s => (
                    <div key={s.label}>
                        <div className="text-4xl font-extrabold text-white mb-1">{s.value}</div>
                        <div className="text-gray-600 text-sm">{s.label}</div>
                    </div>
                ))}
            </div>
        </section>
    </div>
)

// ── Main ──────────────────────────────────────────────────────────────────────
const Home = () => {
    const { user, isAuthenticated, loading } = useAuth()
    if (loading) return (
        <div className="flex items-center justify-center h-[calc(100vh-64px)] bg-[#0f0f0f]">
            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
    )
    return isAuthenticated ? <AuthenticatedHome user={user} /> : <GuestHome />
}

export default Home
