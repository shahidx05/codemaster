import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { problemsAPI } from '../services/api'
import useDebounce from '../hooks/useDebounce'
import { FiSearch } from 'react-icons/fi'
import { FaCode, FaChevronRight } from 'react-icons/fa'

const DIFFICULTIES = ['Easy', 'Medium', 'Hard']

const DIFF_CONFIG = {
    Easy:   { badge: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', bar: 'bg-emerald-500' },
    Medium: { badge: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',   bar: 'bg-yellow-500'  },
    Hard:   { badge: 'text-red-400 bg-red-500/10 border-red-500/20',            bar: 'bg-red-500'     }
}

const DIFF_BTN = {
    Easy:   'border-emerald-500/30 text-emerald-400 bg-emerald-500/10',
    Medium: 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10',
    Hard:   'border-red-500/30 text-red-400 bg-red-500/10'
}

const ProblemRow = ({ problem, index }) => {
    const cfg = DIFF_CONFIG[problem.difficulty]
    return (
        <Link
            to={`/problems/${problem._id}`}
            className="group flex items-center gap-4 px-5 py-4 bg-[#111] hover:bg-[#161616] border-b border-[#1a1a1a] transition-all"
        >
            {/* Index */}
            <span className="text-gray-700 font-mono text-xs w-7 shrink-0 text-right">{String(index + 1).padStart(2, '0')}</span>

            {/* Difficulty bar */}
            <div className="w-0.5 h-8 rounded-full shrink-0" style={{ background: cfg?.bar?.replace('bg-', '') }}>
                <div className={`w-0.5 h-full rounded-full ${cfg?.bar}`} />
            </div>

            {/* Title */}
            <div className="flex-1 min-w-0">
                <p className="text-gray-200 font-semibold text-sm group-hover:text-white transition-colors truncate">{problem.title}</p>
                {problem.tags?.length > 0 && (
                    <div className="flex gap-1.5 mt-1 flex-wrap">
                        {problem.tags.slice(0, 3).map(t => (
                            <span key={t} className="text-[10px] text-gray-600 bg-[#1e1e1e] px-1.5 py-0.5 rounded">{t}</span>
                        ))}
                    </div>
                )}
            </div>

            {/* Difficulty badge */}
            {cfg && (
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border shrink-0 ${cfg.badge}`}>
                    {problem.difficulty}
                </span>
            )}

            {/* Acceptance rate */}
            <span className="text-xs text-gray-600 w-12 text-right shrink-0 hidden sm:block">
                {problem.acceptanceRate != null ? `${Math.round(problem.acceptanceRate)}%` : '—'}
            </span>

            <FaChevronRight size={11} className="text-gray-700 group-hover:text-orange-500 transition-colors shrink-0" />
        </Link>
    )
}

const ProblemsPage = () => {
    const [problems, setProblems] = useState([])
    const [loading, setLoading]   = useState(true)
    const [search,  setSearch]    = useState('')
    const [diff,    setDiff]      = useState('')
    const debouncedSearch = useDebounce(search, 400)

    const fetchProblems = useCallback(async () => {
        try {
            setLoading(true)
            const params = {}
            if (diff)           params.difficulty = diff
            if (debouncedSearch) params.search    = debouncedSearch
            const res = await problemsAPI.getAll(params)
            setProblems(res.data.problems)
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }, [diff, debouncedSearch])

    useEffect(() => { fetchProblems() }, [fetchProblems])

    const counts = {
        Easy:   problems.filter(p => p.difficulty === 'Easy').length,
        Medium: problems.filter(p => p.difficulty === 'Medium').length,
        Hard:   problems.filter(p => p.difficulty === 'Hard').length
    }

    return (
        <div className="min-h-screen bg-[#0f0f0f] py-10 px-4">
            <div className="max-w-4xl mx-auto flex flex-col gap-6">

                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="w-1.5 h-8 bg-orange-500 rounded-full" />
                            <h1 className="text-2xl font-bold text-white">Practice Problems</h1>
                        </div>
                        <p className="text-gray-600 text-sm pl-5">
                            {problems.length} problem{problems.length !== 1 ? 's' : ''} available
                        </p>
                    </div>
                    {/* Difficulty breakdown mini */}
                    <div className="flex items-center gap-3">
                        {DIFFICULTIES.map(d => {
                            const c = DIFF_CONFIG[d]
                            return (
                                <div key={d} className={`px-3 py-1.5 rounded-lg border text-center cursor-pointer transition-all ${diff === d ? `${c.badge}` : 'border-[#2a2a2a] text-gray-600 hover:border-[#3a3a3a]'}`}
                                    onClick={() => setDiff(p => p === d ? '' : d)}>
                                    <div className="text-sm font-bold">{counts[d]}</div>
                                    <div className="text-[10px]">{d}</div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Search & filter */}
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="relative flex-1 min-w-48">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={14} />
                        <input
                            id="problems-search"
                            type="text"
                            placeholder="Search by title or tag…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-[#141414] border border-[#1e1e1e] rounded-lg text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-orange-500/40 transition-colors"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        {DIFFICULTIES.map(d => (
                            <button key={d} onClick={() => setDiff(p => p === d ? '' : d)}
                                className={`text-xs font-semibold px-3 py-2 rounded-lg border transition-all ${
                                    diff === d ? DIFF_BTN[d] : 'border-[#1e1e1e] text-gray-600 hover:text-gray-400 hover:border-[#2a2a2a]'
                                }`}>
                                {d}
                            </button>
                        ))}
                        {diff && (
                            <button onClick={() => setDiff('')} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                {/* Table */}
                <div className="rounded-2xl border border-[#1a1a1a] overflow-hidden">
                    {/* Table header */}
                    <div className="flex items-center gap-4 px-5 py-2.5 bg-[#0d0d0d] border-b border-[#1a1a1a]">
                        <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider w-7 text-right">#</span>
                        <span className="w-0.5 shrink-0" />
                        <span className="flex-1 text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Title</span>
                        <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider w-16 text-right">Difficulty</span>
                        <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider w-12 text-right hidden sm:block">Acc.</span>
                        <span className="w-3" />
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-20 bg-[#111]">
                            <div className="w-7 h-7 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : problems.length === 0 ? (
                        <div className="flex flex-col items-center py-20 bg-[#111] text-gray-600">
                            <FaCode size={32} className="mb-3 opacity-30" />
                            <p>No problems found. Try adjusting your filters.</p>
                        </div>
                    ) : (
                        problems.map((p, i) => <ProblemRow key={p._id} problem={p} index={i} />)
                    )}
                </div>
            </div>
        </div>
    )
}

export default ProblemsPage
