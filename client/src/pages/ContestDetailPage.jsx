import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { contestsAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import {
    FaTrophy, FaUsers, FaClock, FaCheck, FaSpinner, FaMedal,
    FaChevronRight, FaLock, FaPlay
} from 'react-icons/fa'
import { MdOutlineLeaderboard, MdTimer } from 'react-icons/md'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso) {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    })
}

function getStatus(c) {
    const now = Date.now()
    if (now < new Date(c.startTime)) return 'upcoming'
    if (now <= new Date(c.endTime))  return 'active'
    return 'ended'
}

const STATUS_CONFIG = {
    upcoming: { cls: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20',   dot: 'bg-indigo-400'  },
    active:   { cls: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', dot: 'bg-emerald-400 animate-pulse' },
    ended:    { cls: 'text-gray-500 bg-gray-500/10 border-gray-500/20',          dot: 'bg-gray-500'    }
}

const DIFF_COLORS = { Easy: 'text-emerald-400', Medium: 'text-yellow-400', Hard: 'text-red-400' }

const RANK_ICON = { 1: '🥇', 2: '🥈', 3: '🥉' }

// ── Countdown ─────────────────────────────────────────────────────────────────

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

const CountdownBanner = ({ contest, status }) => {
    const target = status === 'upcoming' ? contest.startTime : contest.endTime
    const time   = useCountdown(target)
    if (!time) return null
    return (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${
            status === 'upcoming'
                ? 'bg-indigo-400/10 border-indigo-400/20 text-indigo-300'
                : 'bg-emerald-400/10 border-emerald-400/20 text-emerald-300'
        }`}>
            <MdTimer size={16} />
            <span>
                {status === 'upcoming' ? 'Starts in ' : 'Ends in '}
                <span className="font-bold font-mono">
                    {String(time.h).padStart(2,'0')}:{String(time.m).padStart(2,'0')}:{String(time.s).padStart(2,'0')}
                </span>
            </span>
        </div>
    )
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

const LeaderboardSection = ({ contestId }) => {
    const [data,    setData]    = useState(null)
    const [loading, setLoading] = useState(true)
    const [error,   setError]   = useState('')

    useEffect(() => {
        contestsAPI.leaderboard(contestId)
            .then(res => setData(res.data))
            .catch(err => setError(err.response?.data?.message || 'Failed to load leaderboard'))
            .finally(() => setLoading(false))
    }, [contestId])

    if (loading) return (
        <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
    )
    if (error) return <p className="text-red-400 text-sm">{error}</p>
    if (!data?.leaderboard?.length) return (
        <p className="text-gray-600 text-sm text-center py-8">No submissions recorded for this contest.</p>
    )

    return (
        <div className="overflow-x-auto rounded-xl border border-[#2a2a2a]">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-[#2a2a2a] bg-[#1a1a1a]">
                        {['Rank', 'User', 'Solved', 'Total Points', 'Last Submission'].map(h => (
                            <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-[#1e1e1e]">
                    {data.leaderboard.map(row => (
                        <tr key={row.user.id}
                            className={`transition-colors ${row.rank <= 3 ? 'bg-orange-500/5 hover:bg-orange-500/10' : 'bg-[#0f0f0f] hover:bg-[#141414]'}`}>
                            <td className="px-4 py-3 font-bold text-sm">
                                {RANK_ICON[row.rank] || <span className="text-gray-500">#{row.rank}</span>}
                            </td>
                            <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                    <img src={row.user.profilePicture || `https://ui-avatars.com/api/?name=${row.user.username}&background=random`}
                                        alt={row.user.username} className="w-6 h-6 rounded-full border border-[#3a3a3a]" />
                                    <span className="text-gray-200 font-medium">{row.user.username}</span>
                                </div>
                            </td>
                            <td className="px-4 py-3 text-gray-400">{row.problemsSolved}</td>
                            <td className="px-4 py-3">
                                <span className="text-orange-400 font-bold">{row.totalPoints}</span>
                            </td>
                            <td className="px-4 py-3 text-gray-600 text-xs">
                                {fmtDate(row.lastSubmission)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

// ── Main page ─────────────────────────────────────────────────────────────────

const TABS = [
    { id: 'problems',    label: 'Problems',    icon: <FaTrophy size={12} /> },
    { id: 'leaderboard', label: 'Leaderboard', icon: <MdOutlineLeaderboard size={13} /> }
]

const ContestDetailPage = () => {
    const { id } = useParams()
    const { user, isAuthenticated } = useAuth()
    const [contest,   setContest]   = useState(null)
    const [loading,   setLoading]   = useState(true)
    const [error,     setError]     = useState('')
    const [joining,   setJoining]   = useState(false)
    const [joinMsg,   setJoinMsg]   = useState('')
    const [activeTab, setActiveTab] = useState('problems')

    const load = useCallback(async () => {
        setLoading(true); setError('')
        try {
            const res = await contestsAPI.getById(id)
            setContest(res.data.contest)
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load contest')
        } finally { setLoading(false) }
    }, [id])

    useEffect(() => { load() }, [load])

    const handleJoin = async () => {
        setJoining(true); setJoinMsg('')
        try {
            await contestsAPI.join(id)
            // Re-fetch from server so isParticipant is authoritative
            await load()
            setJoinMsg('Joined successfully!')
        } catch (err) {
            setJoinMsg(err.response?.data?.message || 'Failed to join')
        } finally { setJoining(false) }
    }

    if (loading) return (
        <div className="flex justify-center items-center h-[calc(100vh-64px)] bg-[#0f0f0f]">
            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
    )
    if (error || !contest) return (
        <div className="flex justify-center items-center h-[calc(100vh-64px)] bg-[#0f0f0f] text-gray-500">{error || 'Contest not found.'}</div>
    )

    const status = getStatus(contest)
    const cfg    = STATUS_CONFIG[status]
    const canSolve   = status === 'active' && contest.isParticipant
    const hasEnded   = status === 'ended'

    // Teacher/admin can always see the leaderboard; others only after contest ends
    const isPrivileged = user?.role === 'teacher' || user?.role === 'admin'
    const isOwner      = contest.createdBy?._id === user?._id ||
                         contest.createdBy?._id?.toString() === user?.id

    const leaderboardAccessible = hasEnded || isPrivileged || isOwner

    // Hide join button for teachers, admins, and the contest creator
    const showJoinButton =
        isAuthenticated &&
        !contest.isParticipant &&
        status !== 'ended' &&
        user?.role !== 'teacher' &&
        user?.role !== 'admin' &&
        !isOwner

    return (
        <div className="min-h-screen bg-[#0f0f0f] py-10 px-4">
            <div className="max-w-4xl mx-auto flex flex-col gap-6">

                {/* Breadcrumb */}
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                    <Link to="/contests" className="hover:text-gray-400 transition-colors">Contests</Link>
                    <FaChevronRight size={9} />
                    <span className="text-gray-400">{contest.title}</span>
                </div>

                {/* Header card */}
                <div className="p-6 bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                                <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${cfg.cls}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} /> {status}
                                </span>
                                {!contest.isPublic && (
                                    <span className="flex items-center gap-1 text-xs text-gray-600 border border-gray-700/40 rounded-full px-2 py-0.5">
                                        <FaLock size={9} /> Private
                                    </span>
                                )}
                            </div>
                            <h1 className="text-2xl font-bold text-white">{contest.title}</h1>
                            {contest.description && (
                                <p className="text-gray-500 text-sm leading-relaxed">{contest.description}</p>
                            )}
                        </div>

                        {/* Join / status */}
                        <div className="flex flex-col gap-2 items-end">
                            {showJoinButton && (
                                <button onClick={handleJoin} disabled={joining}
                                    className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors">
                                    {joining ? <FaSpinner className="animate-spin" size={13} /> : <FaTrophy size={13} />}
                                    Join Contest
                                </button>
                            )}
                            {contest.isParticipant && (
                                <span className="flex items-center gap-1.5 text-emerald-400 text-sm font-medium">
                                    <FaCheck size={12} /> Joined
                                </span>
                            )}
                            {(isPrivileged || isOwner) && !hasEnded && (
                                <span className="flex items-center gap-1.5 text-indigo-400 text-xs font-medium bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full">
                                    <MdOutlineLeaderboard size={11} />
                                    {isOwner ? 'You created this contest' : 'Staff view'}
                                </span>
                            )}
                            {joinMsg && (
                                <p className={`text-xs ${joinMsg.includes('success') ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {joinMsg}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Meta */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[#252525]">
                        {[
                            { label: 'Start',        val: fmtDate(contest.startTime),  icon: <FaClock size={11} /> },
                            { label: 'End',          val: fmtDate(contest.endTime),    icon: <FaClock size={11} /> },
                            { label: 'Problems',     val: contest.problems?.length ?? 0, icon: <FaTrophy size={11} /> },
                            { label: 'Participants', val: contest.participantCount ?? 0, icon: <FaUsers size={11} /> }
                        ].map(m => (
                            <div key={m.label} className="flex flex-col gap-0.5">
                                <span className="flex items-center gap-1 text-xs text-gray-600">{m.icon} {m.label}</span>
                                <span className="text-sm text-gray-300 font-medium">{m.val}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Countdown banner */}
                {(status === 'upcoming' || status === 'active') && (
                    <CountdownBanner contest={contest} status={status} />
                )}

                {/* Tabs */}
                <div className="border-b border-[#2a2a2a] flex gap-1">
                    {TABS.map(t => {
                        const leaderboardLocked = t.id === 'leaderboard' && !leaderboardAccessible
                        return (
                            <button key={t.id} id={`contest-tab-${t.id}`}
                                onClick={() => !leaderboardLocked && setActiveTab(t.id)}
                                title={leaderboardLocked ? 'Available after contest ends' : undefined}
                                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                                    activeTab === t.id
                                        ? 'border-orange-500 text-orange-400'
                                        : leaderboardLocked
                                        ? 'border-transparent text-gray-700 cursor-not-allowed'
                                        : 'border-transparent text-gray-500 hover:text-gray-300'
                                }`}>
                                {t.icon} {t.label}
                                {leaderboardLocked && <FaLock size={9} className="ml-0.5 text-gray-700" />}
                            </button>
                        )
                    })}
                </div>

                {/* Problems tab */}
                {activeTab === 'problems' && (
                    <div className="flex flex-col gap-2">
                        {contest.problemsHidden ? (
                            <div className="text-center py-16 text-gray-600">
                                <FaLock size={28} className="mx-auto mb-3 opacity-40" />
                                <p>Problems will be revealed when the contest starts.</p>
                            </div>
                        ) : !contest.problems?.length ? (
                            <p className="text-gray-600 text-center py-12">No problems added yet.</p>
                        ) : (
                            contest.problems.filter(cp => cp.problem != null).map((cp, i) => {
                                const p = cp.problem
                                return (
                                    <div key={p._id}
                                        className="flex items-center gap-4 bg-[#1a1a1a] hover:bg-[#1f1f1f] border border-[#2a2a2a] hover:border-[#3a3a3a] rounded-xl px-5 py-4 transition-all">
                                        <span className="text-gray-600 font-mono text-sm w-5 shrink-0">{String.fromCharCode(65 + i)}</span>
                                        <span className={`text-xs font-semibold w-14 shrink-0 ${DIFF_COLORS[p.difficulty]}`}>{p.difficulty}</span>
                                        <span className="flex-1 text-gray-200 font-medium">{p.title}</span>
                                        <span className="text-orange-400 text-xs font-bold">{cp.points} pts</span>
                                        {canSolve ? (
                                            <Link
                                                to={`/contests/${contest._id}/problems/${p._id}`}
                                                className="flex items-center gap-1.5 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-400 px-3 py-1.5 rounded-lg transition-colors">
                                                <FaPlay size={9} /> Solve
                                            </Link>
                                        ) : (
                                            <span className="text-xs text-gray-600 px-3 py-1.5">
                                                {status === 'upcoming' ? 'Locked' : status === 'ended' ? <Link to={`/problems/${p._id}`} className="text-gray-500 hover:text-gray-300 transition-colors">View</Link> : 'Join to solve'}
                                            </span>
                                        )}
                                    </div>
                                )
                            })
                        )}
                    </div>
                )}

                {/* Leaderboard tab — visible to owner/admin during active, everyone after ended */}
                {activeTab === 'leaderboard' && leaderboardAccessible && (
                    <LeaderboardSection contestId={id} />
                )}
            </div>
        </div>
    )
}

export default ContestDetailPage
