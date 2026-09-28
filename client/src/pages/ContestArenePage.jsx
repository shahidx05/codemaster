import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { contestsAPI, problemsAPI, submissionsAPI, pollUntilDone } from '../services/api'
import { useAuth } from '../context/AuthContext'
import CodeEditor from '../components/CodeEditor'
import TestResults from '../components/TestResults'
import {
    FaPlay, FaSpinner, FaCheck, FaArrowLeft, FaArrowRight,
    FaTrophy, FaBolt, FaChevronRight, FaAlignLeft, FaLayerGroup
} from 'react-icons/fa'
import { FiAlertTriangle } from 'react-icons/fi'
import { MdTimer } from 'react-icons/md'

// ── localStorage helpers ───────────────────────────────────────────────────────
function getSolvedSet(contestId) {
    try {
        const raw = localStorage.getItem(`contest_solved_${contestId}`)
        return new Set(raw ? JSON.parse(raw) : [])
    } catch { return new Set() }
}
function addSolved(contestId, problemId) {
    const set = getSolvedSet(contestId)
    set.add(problemId)
    localStorage.setItem(`contest_solved_${contestId}`, JSON.stringify([...set]))
}

// ── Countdown hook ────────────────────────────────────────────────────────────
function useCountdown(endTime) {
    const calc = () => {
        const diff = new Date(endTime) - Date.now()
        if (diff <= 0) return null
        const h = Math.floor(diff / 3600000)
        const m = Math.floor((diff % 3600000) / 60000)
        const s = Math.floor((diff % 60000) / 1000)
        return { h, m, s, diff }
    }
    const [time, setTime] = useState(calc)
    useEffect(() => {
        const id = setInterval(() => setTime(calc()), 1000)
        return () => clearInterval(id)
    }, [endTime])
    return time
}

const DIFF_STYLES = {
    Easy:   'text-emerald-400',
    Medium: 'text-yellow-400',
    Hard:   'text-red-400'
}

const PROBLEM_TABS = [
    { id: 'description', label: 'Description', icon: <FaAlignLeft size={11} /> },
    { id: 'results',     label: 'Results',     icon: <FaLayerGroup size={11} /> }
]

// ── ContestArenePage ──────────────────────────────────────────────────────────
const ContestArenePage = () => {
    const { contestId, problemId } = useParams()
    const navigate = useNavigate()
    const { isAuthenticated } = useAuth()

    // Contest state
    const [contest,        setContest]        = useState(null)
    const [contestLoading, setContestLoading] = useState(true)

    // Problem state
    const [problem,     setProblem]    = useState(null)
    const [probLoading, setProbLoading] = useState(true)

    // Editor state
    const [code,        setCode]        = useState('')
    const [language,    setLanguage]    = useState('javascript')
    const [running,     setRunning]     = useState(false)
    const [submitting,  setSubmitting]  = useState(false)
    const [testResults, setTestResults] = useState(null)
    const [submitStatus, setSubmitStatus] = useState(null)
    const [submitPhase,  setSubmitPhase]  = useState(null) // 'queued' | 'processing' | null
    const [isRunResult, setIsRunResult] = useState(false)
    const [activeTab,   setActiveTab]   = useState('description')
    const [error,       setError]        = useState('')

    const submitAbortRef = useRef(null)

    // Sidebar
    const [solvedSet, setSolvedSet] = useState(() => getSolvedSet(contestId))
    const [sidebarOpen, setSidebarOpen] = useState(true)

    const time = useCountdown(contest?.endTime)

    // Load contest
    useEffect(() => {
        setContestLoading(true)
        contestsAPI.getById(contestId)
            .then(res => setContest(res.data.contest))
            .catch(() => {})
            .finally(() => setContestLoading(false))
    }, [contestId])

    // Abort polling on unmount
    useEffect(() => { return () => { submitAbortRef.current?.abort() } }, [])

    // Load problem
    useEffect(() => {
        setProbLoading(true)
        setTestResults(null)
        setSubmitStatus(null)
        setIsRunResult(false)
        setActiveTab('description')
        setError('')
        problemsAPI.getById(problemId)
            .then(res => {
                const p = res.data.problem
                setProblem(p)
                setCode(p.starterCode?.javascript || '')
                setLanguage('javascript')
            })
            .catch(() => {})
            .finally(() => setProbLoading(false))
    }, [problemId])

    const handleLanguageChange = (lang) => {
        setLanguage(lang)
        if (problem) setCode(problem.starterCode?.[lang] || '')
        setTestResults(null)
        setSubmitStatus(null)
        setIsRunResult(false)
    }

    const handleRun = async () => {
        if (!isAuthenticated) return
        setRunning(true); setError(''); setTestResults(null); setSubmitStatus(null); setIsRunResult(false)
        try {
            const res = await submissionsAPI.run({ problemId, code, language })
            setTestResults(res.data.testResults)
            setSubmitStatus(res.data.status)
            setIsRunResult(true)
            setActiveTab('results')
        } catch (err) {
            setError(err.response?.data?.message || 'Error running code.')
        } finally { setRunning(false) }
    }

    const handleSubmit = async () => {
        if (!isAuthenticated) return

        // Abort any previous in-flight poll
        submitAbortRef.current?.abort()
        const abortCtrl = new AbortController()
        submitAbortRef.current = abortCtrl

        setSubmitting(true); setError(''); setTestResults(null); setSubmitStatus(null)
        setSubmitPhase('queued'); setIsRunResult(false)
        setActiveTab('results')
        try {
            // POST → 202 immediately
            const res = await submissionsAPI.submit({ problemId, code, language, contestId })
            const { submissionId } = res.data

            // Poll until terminal
            const result = await pollUntilDone(
                submissionId,
                (status) => {
                    setSubmitPhase(status === 'Processing' ? 'processing' : 'queued')
                    setSubmitStatus(status)
                },
                { signal: abortCtrl.signal }
            )

            const sub = result.submission
            setTestResults(sub.testResults)
            setSubmitStatus(sub.status)
            setSubmitPhase(null)
            setIsRunResult(false)

            if (sub.status === 'Accepted') {
                addSolved(contestId, problemId)
                setSolvedSet(getSolvedSet(contestId))
            }
        } catch (err) {
            if (err.name === 'AbortError') return
            setError(err.response?.data?.message || err.message || 'Error submitting.')
            setSubmitPhase(null)
        } finally { setSubmitting(false) }
    }

    // Navigation helpers
    const contestProblems = contest?.problems || []
    const currentIdx = contestProblems.findIndex(cp => {
        const pid = cp.problem?._id || cp.problem
        return pid === problemId || pid?.toString() === problemId
    })
    const nextProblem = currentIdx !== -1 && currentIdx < contestProblems.length - 1
        ? contestProblems[currentIdx + 1]
        : null
    const nextProblemId = nextProblem?.problem?._id || nextProblem?.problem

    const isAccepted = submitStatus === 'Accepted' && !isRunResult

    // Timer color
    const timerColor = !time ? 'text-gray-500'
        : time.diff < 300000 ? 'text-red-400 animate-pulse'
        : time.diff < 900000 ? 'text-yellow-400'
        : 'text-emerald-400'

    if (contestLoading || probLoading) return (
        <div className="flex items-center justify-center h-screen bg-[#0a0a0a]">
            <FaSpinner className="animate-spin text-orange-500" size={28} />
        </div>
    )

    if (!contest || !problem) return (
        <div className="flex items-center justify-center h-screen bg-[#0a0a0a] text-gray-500">
            Contest or problem not found.
        </div>
    )

    return (
        <div className="flex flex-col h-screen bg-[#0a0a0a] overflow-hidden">

            {/* ── Top bar ─────────────────────────────────────────────────── */}
            <header className="flex items-center justify-between px-4 h-12 border-b border-[#1e1e1e] bg-[#111] shrink-0 z-10">
                {/* Left: logo + back */}
                <div className="flex items-center gap-3">
                    <Link to="/" className="flex items-center gap-1.5 text-orange-500 hover:text-orange-400 transition-colors">
                        <FaBolt size={16} />
                        <span className="font-bold text-sm">CodeMaster</span>
                    </Link>
                    <span className="text-[#2a2a2a]">|</span>
                    <button
                        onClick={() => navigate(`/contests/${contestId}`)}
                        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                    >
                        <FaArrowLeft size={10} /> Back to Contest
                    </button>
                </div>

                {/* Center: contest title */}
                <div className="flex items-center gap-2">
                    <FaTrophy size={12} className="text-orange-500" />
                    <span className="text-sm text-gray-300 font-medium line-clamp-1 max-w-xs">{contest.title}</span>
                </div>

                {/* Right: timer */}
                <div className={`flex items-center gap-1.5 font-mono text-sm font-bold ${timerColor}`}>
                    <MdTimer size={16} />
                    {time
                        ? `${String(time.h).padStart(2,'0')}:${String(time.m).padStart(2,'0')}:${String(time.s).padStart(2,'0')}`
                        : 'Contest Ended'}
                </div>
            </header>

            {/* ── Body ────────────────────────────────────────────────────── */}
            <div className="flex flex-1 overflow-hidden">

                {/* ── Sidebar ───────────────────────────────────────────── */}
                <aside className={`flex flex-col border-r border-[#1e1e1e] bg-[#111] transition-all duration-200 ${sidebarOpen ? 'w-56' : 'w-0'} overflow-hidden shrink-0`}>
                    <div className="px-3 pt-3 pb-2 flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Problems</span>
                        <span className="text-xs text-gray-600">{solvedSet.size}/{contestProblems.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {contestProblems.map((cp, i) => {
                            const p    = cp.problem
                            const pid  = p?._id || p
                            const ptitle = p?.title || `Problem ${String.fromCharCode(65 + i)}`
                            const pdiff  = p?.difficulty
                            const isCurrent = pid === problemId || pid?.toString() === problemId
                            const isSolved  = solvedSet.has(pid?.toString() || pid)
                            return (
                                <Link
                                    key={pid}
                                    to={`/contests/${contestId}/problems/${pid}`}
                                    className={`flex items-center gap-2.5 px-3 py-2.5 text-xs transition-colors ${
                                        isCurrent
                                            ? 'bg-orange-500/15 border-l-2 border-orange-500 text-white'
                                            : 'border-l-2 border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5'
                                    }`}
                                >
                                    <span className="font-mono font-bold text-gray-600 w-4 shrink-0">
                                        {String.fromCharCode(65 + i)}
                                    </span>
                                    {isSolved
                                        ? <FaCheck size={9} className="text-emerald-400 shrink-0" />
                                        : <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${DIFF_STYLES[pdiff]} bg-current`} />
                                    }
                                    <span className="truncate">{ptitle}</span>
                                    <span className="ml-auto text-orange-400/70 text-[10px] shrink-0">{cp.points}pt</span>
                                </Link>
                            )
                        })}
                    </div>
                </aside>

                {/* Toggle sidebar button */}
                <button
                    onClick={() => setSidebarOpen(v => !v)}
                    className="w-4 bg-[#111] border-r border-[#1e1e1e] flex items-center justify-center text-gray-700 hover:text-gray-400 hover:bg-[#1a1a1a] transition-colors shrink-0"
                    title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
                >
                    <FaChevronRight size={8} className={`transition-transform ${sidebarOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* ── Problem panel (left) ──────────────────────────────── */}
                <div className="w-[42%] flex flex-col border-r border-[#1e1e1e] overflow-hidden">
                    {/* Problem header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e1e1e] bg-[#111] shrink-0">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="text-gray-600 font-mono text-sm font-bold shrink-0">
                                {currentIdx !== -1 ? String.fromCharCode(65 + currentIdx) : '#'}
                            </span>
                            <h1 className="text-sm font-bold text-white truncate">{problem.title}</h1>
                        </div>
                        <span className={`text-xs font-semibold shrink-0 ${DIFF_STYLES[problem.difficulty]}`}>
                            {problem.difficulty}
                        </span>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-[#1e1e1e] bg-[#111] shrink-0">
                        {PROBLEM_TABS.map(t => (
                            <button key={t.id} onClick={() => setActiveTab(t.id)}
                                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
                                    activeTab === t.id
                                        ? 'border-orange-500 text-orange-400'
                                        : 'border-transparent text-gray-600 hover:text-gray-400'
                                }`}>
                                {t.icon} {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab content */}
                    <div className="flex-1 overflow-y-auto p-4 text-sm text-gray-300 leading-relaxed">
                        {activeTab === 'description' && (
                            <div className="flex flex-col gap-5">
                                <p className="whitespace-pre-wrap text-gray-400 leading-7">{problem.description}</p>

                                {problem.examples?.length > 0 && (
                                    <div>
                                        <h3 className="text-white font-semibold mb-2 text-xs uppercase tracking-wider text-gray-500">Examples</h3>
                                        {problem.examples.map((ex, i) => (
                                            <div key={i} className="mb-3 p-3 bg-[#161616] border border-[#222] rounded-lg text-xs font-mono">
                                                <div><span className="text-gray-600">Input: </span><code className="text-gray-300">{ex.input}</code></div>
                                                <div><span className="text-gray-600">Output: </span><code className="text-emerald-400">{ex.output}</code></div>
                                                {ex.explanation && <div className="mt-1 text-gray-600 font-sans">{ex.explanation}</div>}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {problem.constraints?.length > 0 && (
                                    <div>
                                        <h3 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">Constraints</h3>
                                        <ul className="list-disc list-inside text-gray-500 text-xs space-y-1 font-mono">
                                            {problem.constraints.map((c, i) => <li key={i}>{c}</li>)}
                                        </ul>
                                    </div>
                                )}

                                {problem.tags?.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {problem.tags.map((tag, i) => (
                                            <span key={i} className="text-xs text-gray-600 bg-[#1e1e1e] px-2 py-0.5 rounded-full border border-[#2a2a2a]">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'results' && (
                            testResults ? (
                                <div className="flex flex-col gap-3">
                                    {isRunResult && (
                                        <div className="flex items-center gap-2 px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-xs text-gray-500">
                                            <FaPlay size={8} /> Run result — only public tests checked. Not recorded.
                                        </div>
                                    )}
                                    <TestResults results={testResults} overallStatus={submitStatus} />
                                    {/* Next problem button */}
                                    {isAccepted && nextProblemId && (
                                        <Link
                                            to={`/contests/${contestId}/problems/${nextProblemId}`}
                                            className="flex items-center justify-center gap-2 mt-2 bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
                                        >
                                            Next Problem <FaArrowRight size={11} />
                                        </Link>
                                    )}
                                    {isAccepted && !nextProblemId && (
                                        <button
                                            onClick={() => navigate(`/contests/${contestId}`)}
                                            className="flex items-center justify-center gap-2 mt-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
                                        >
                                            <FaTrophy size={13} /> All Done! Back to Contest
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <p className="text-gray-700 text-center mt-10 text-xs">Run or submit your code to see results.</p>
                            )
                        )}
                    </div>
                </div>

                {/* ── Editor panel (right) ──────────────────────────────── */}
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                    {/* Editor toolbar */}
                    <div className="flex items-center justify-between px-3 py-2 border-b border-[#1e1e1e] bg-[#111] shrink-0">
                        <select
                            value={language}
                            onChange={e => handleLanguageChange(e.target.value)}
                            className="text-xs font-medium text-gray-400 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-2.5 py-1 focus:outline-none focus:border-orange-500/50 cursor-pointer"
                        >
                            <option value="javascript">JavaScript</option>
                            <option value="cpp">C++</option>
                        </select>

                        <div className="flex items-center gap-2">
                            <button
                                id="arena-run-btn"
                                onClick={handleRun}
                                disabled={running || submitting}
                                className="flex items-center gap-1.5 bg-[#1e1e1e] hover:bg-[#272727] disabled:opacity-40 text-gray-400 hover:text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg border border-[#2a2a2a] hover:border-[#3a3a3a] transition-colors"
                            >
                                {running ? <FaSpinner className="animate-spin" size={10} /> : <FaPlay size={10} />}
                                {running ? 'Running…' : 'Run'}
                            </button>
                            <button
                                id="arena-submit-btn"
                                onClick={handleSubmit}
                                disabled={submitting || running}
                                className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-colors"
                            >
                                {submitting ? <FaSpinner className="animate-spin" size={10} /> : <FaPlay size={10} />}
                                {submitting
                                    ? submitPhase === 'processing' ? 'Processing…' : 'Queued…'
                                    : 'Submit'
                                }
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border-b border-red-500/20 px-3 py-2 text-xs shrink-0">
                            <FiAlertTriangle size={12} /> {error}
                        </div>
                    )}

                    <div className="flex-1 overflow-hidden">
                        <CodeEditor code={code} onChange={setCode} language={language} />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ContestArenePage
