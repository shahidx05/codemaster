import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { contestsAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import {
    FaTrophy, FaUsers, FaClock, FaLock, FaSearch,
    FaChevronRight, FaFire, FaCalendarAlt
} from 'react-icons/fa'
import { MdTimer } from 'react-icons/md'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso) {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    })
}

function getDuration(start, end) {
    const ms = new Date(end) - new Date(start)
    const h  = Math.floor(ms / 3600000)
    const m  = Math.floor((ms % 3600000) / 60000)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function getStatus(c) {
    const now = Date.now()
    if (now < new Date(c.startTime)) return 'upcoming'
    if (now <= new Date(c.endTime))  return 'active'
    return 'ended'
}

const STATUS_CONFIG = {
    upcoming: { cls: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',   dot: 'bg-indigo-400',   label: 'Upcoming' },
    active:   { cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', dot: 'bg-emerald-400 animate-pulse', label: 'Live' },
    ended:    { cls: 'text-gray-500 bg-gray-500/10 border-gray-500/20',          dot: 'bg-gray-500',     label: 'Ended'   }
}

// ── Countdown hook ────────────────────────────────────────────────────────────

function useCountdown(target) {
    const calc = () => {
        const diff = new Date(target) - Date.now()
        if (diff <= 0) return null
        const h = Math.floor(diff / 3600000)
        const m = Math.floor((diff % 3600000) / 60000)
        const s = Math.floor((diff % 60000) / 1000)
        return { h, m, s }
    }
    const [t, set] = useState(calc)
    useEffect(() => {
        const id = setInterval(() => set(calc()), 1000)
        return () => clearInterval(id)
    }, [target])
    return t
}

// ── Contest Card ──────────────────────────────────────────────────────────────

const ContestCard = ({ contest }) => {
    const status = getStatus(contest)
    const cfg    = STATUS_CONFIG[status]
    const countdownTarget = status === 'upcoming' ? contest.startTime : contest.endTime
    const time   = useCountdown(countdownTarget)

    return (
        <Link to={`/contests/${contest._id}`}
            className={`group block bg-[#111] border rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${
                status === 'active'
                    ? 'border-emerald-500/15 hover:border-emerald-500/30 hover:shadow-emerald-500/5'
                    : 'border-[#1e1e1e] hover:border-[#2a2a2a]'
            }`}>

            {/* Top row */}
            <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex flex-col gap-2 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full border ${cfg.cls}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                        </span>
                        {!contest.isPublic && (
                            <span className="flex items-center gap-1 text-[10px] text-gray-600 border border-gray-700/40 px-2 py-0.5 rounded-full">
                                <FaLock size={8} /> Private
                            </span>
                        )}
                    </div>
                    <h2 className="text-white font-bold text-base group-hover:text-orange-400 transition-colors line-clamp-1">
                        {contest.title}
                    </h2>
                    {contest.description && (
                        <p className="text-gray-600 text-xs line-clamp-2 leading-relaxed">{contest.description}</p>
                    )}
                </div>
                <FaChevronRight size={13} className="text-gray-700 group-hover:text-orange-500 transition-colors mt-1 shrink-0" />
            </div>

            {/* Countdown timer */}
            {time && status !== 'ended' && (
                <div className={`flex items-center gap-2 mb-4 px-3 py-2 rounded-xl ${
                    status === 'active'
                        ? 'bg-emerald-500/8 border border-emerald-500/15'
                        : 'bg-indigo-500/8 border border-indigo-500/15'
                }`}>
                    <MdTimer size={13} className={status === 'active' ? 'text-emerald-400' : 'text-indigo-400'} />
                    <span className={`text-xs ${status === 'active' ? 'text-emerald-300' : 'text-indigo-300'}`}>
                        {status === 'active' ? 'Ends in' : 'Starts in'}
                    </span>
                    <span className={`font-mono font-bold text-sm ml-auto ${status === 'active' ? 'text-emerald-400' : 'text-indigo-400'}`}>
                        {String(time.h).padStart(2,'0')}:{String(time.m).padStart(2,'0')}:{String(time.s).padStart(2,'0')}
                    </span>
                </div>
            )}

            {/* Meta row */}
            <div className="flex items-center gap-4 text-xs text-gray-600 pt-3 border-t border-[#1a1a1a] flex-wrap">
                <span className="flex items-center gap-1.5">
                    <FaTrophy size={10} className="text-orange-400/50" />
                    {contest.problemCount ?? 0} problem{contest.problemCount !== 1 ? 's' : ''}
                </span>
                <span className="flex items-center gap-1.5">
                    <FaUsers size={10} />
                    {contest.participantCount ?? 0} participants
                </span>
                <span className="flex items-center gap-1.5">
                    <FaClock size={10} />
                    {status === 'ended'
                        ? `${getDuration(contest.startTime, contest.endTime)} · Ended`
                        : status === 'active'
                        ? `Ends ${fmtDate(contest.endTime)}`
                        : `Starts ${fmtDate(contest.startTime)}`
                    }
                </span>
                {contest.createdBy?.username && (
                    <span className="ml-auto text-gray-700">by {contest.createdBy.username}</span>
                )}
            </div>
        </Link>
    )
}

// ── Section heading ───────────────────────────────────────────────────────────
const SectionHeading = ({ label, count, color }) => (
    <div className="flex items-center gap-2 mt-4">
        <span className={`text-xs font-bold uppercase tracking-wider ${color}`}>{label}</span>
        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${color} bg-current/10`}>{count}</span>
        <div className="flex-1 h-px bg-[#1a1a1a]" />
    </div>
)

// ── Main page ─────────────────────────────────────────────────────────────────

const ContestsPage = () => {
    const { isAuthenticated } = useAuth()
    const [contests, setContests] = useState([])
    const [loading,  setLoading]  = useState(true)
    const [error,    setError]    = useState('')
    const [filter,   setFilter]   = useState('all')
    const [search,   setSearch]   = useState('')

    const load = useCallback(async () => {
        setLoading(true); setError('')
        try {
            const res = await contestsAPI.getAll()
            setContests(res.data.contests)
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load contests')
        } finally { setLoading(false) }
    }, [])

    useEffect(() => { load() }, [load])

    const filtered = contests.filter(c => {
        const status = getStatus(c)
        const matchFilter = filter === 'all' || status === filter
        const matchSearch = c.title.toLowerCase().includes(search.toLowerCase())
        return matchFilter && matchSearch
    })

    const counts = {
        all:      contests.length,
        upcoming: contests.filter(c => getStatus(c) === 'upcoming').length,
        active:   contests.filter(c => getStatus(c) === 'active').length,
        ended:    contests.filter(c => getStatus(c) === 'ended').length
    }

    // Group by status for "all" view
    const active   = filtered.filter(c => getStatus(c) === 'active')
    const upcoming = filtered.filter(c => getStatus(c) === 'upcoming')
    const ended    = filtered.filter(c => getStatus(c) === 'ended')

    return (
        <div className="min-h-screen bg-[#0f0f0f] py-10 px-4">
            <div className="max-w-4xl mx-auto flex flex-col gap-6">

                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="w-1.5 h-8 bg-orange-500 rounded-full" />
                            <h1 className="text-2xl font-bold text-white">Contests</h1>
                        </div>
                        <p className="text-gray-600 text-sm pl-5">Compete, climb the leaderboard, sharpen your skills.</p>
                    </div>
                    <div className="flex gap-2">
                        {[
                            { key: 'active',   label: 'Live',     count: counts.active,   style: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
                            { key: 'upcoming', label: 'Upcoming', count: counts.upcoming,  style: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20'   }
                        ].map(s => (
                            <button key={s.key} onClick={() => setFilter(f => f === s.key ? 'all' : s.key)}
                                className={`px-3 py-2 rounded-xl border transition-all text-center ${s.style} ${filter === s.key ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}>
                                <div className="text-lg font-bold leading-none mb-0.5">{s.count}</div>
                                <div className="text-[10px] opacity-80">{s.label}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Search + filter tabs */}
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="relative flex-1 min-w-48">
                        <FaSearch size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                        <input
                            id="contests-search"
                            type="text"
                            placeholder="Search contests…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full bg-[#141414] border border-[#1e1e1e] rounded-lg pl-8 pr-3 py-2 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-orange-500/40 transition-colors"
                        />
                    </div>
                    <div className="flex items-center gap-1.5">
                        {['all', 'upcoming', 'active', 'ended'].map(f => (
                            <button key={f} onClick={() => setFilter(f)}
                                className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                                    filter === f
                                        ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                                        : 'bg-transparent border-[#1e1e1e] text-gray-600 hover:text-gray-400 hover:border-[#2a2a2a]'
                                }`}>
                                {f.charAt(0).toUpperCase() + f.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : error ? (
                    <div className="text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm">{error}</div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20">
                        <FaTrophy size={36} className="mx-auto text-gray-800 mb-4" />
                        <p className="text-gray-600">
                            {search ? `No contests match "${search}"` : `No ${filter === 'all' ? '' : filter} contests.`}
                        </p>
                    </div>
                ) : filter === 'all' ? (
                    <div className="flex flex-col gap-3">
                        {active.length > 0 && (
                            <>
                                <SectionHeading label="Live Now" count={active.length} color="text-emerald-400" />
                                {active.map(c => <ContestCard key={c._id} contest={c} />)}
                            </>
                        )}
                        {upcoming.length > 0 && (
                            <>
                                <SectionHeading label="Upcoming" count={upcoming.length} color="text-indigo-400" />
                                {upcoming.map(c => <ContestCard key={c._id} contest={c} />)}
                            </>
                        )}
                        {ended.length > 0 && (
                            <>
                                <SectionHeading label="Past Contests" count={ended.length} color="text-gray-500" />
                                {ended.map(c => <ContestCard key={c._id} contest={c} />)}
                            </>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {filtered.map(c => <ContestCard key={c._id} contest={c} />)}
                    </div>
                )}
            </div>
        </div>
    )
}

export default ContestsPage
