import { useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { problemsAPI, submissionsAPI, contestsAPI } from '../services/api'
import CodeEditor from '../components/CodeEditor'
import TestResults from '../components/TestResults'
import { useAuth } from '../context/AuthContext'
import { FiAlertTriangle } from 'react-icons/fi'
import { FaPlay, FaAlignLeft, FaLayerGroup, FaTrophy, FaSpinner, FaChevronRight, FaArrowRight } from 'react-icons/fa'

const DIFF_STYLES = {
    Easy:   'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    Medium: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    Hard:   'text-red-400 bg-red-400/10 border-red-400/20'
}

const TABS = [
    { id: 'description', label: 'Description', icon: <FaAlignLeft size={12} /> },
    { id: 'results',     label: 'Results',     icon: <FaLayerGroup size={12} /> }
]

// ── localStorage helpers for contest progress ──────────────────────────────────

function getSolvedSet(contestId) {
    if (!contestId) return new Set()
    try {
        const raw = localStorage.getItem(`contest_solved_${contestId}`)
        return new Set(raw ? JSON.parse(raw) : [])
    } catch { return new Set() }
}

function addSolved(contestId, problemId) {
    if (!contestId) return
    const set = getSolvedSet(contestId)
    set.add(problemId)
    localStorage.setItem(`contest_solved_${contestId}`, JSON.stringify([...set]))
}

// ── ProblemDetailPage ──────────────────────────────────────────────────────────

const ProblemDetailPage = () => {
    const { id }                       = useParams()
    const [searchParams]               = useSearchParams()
    const contestId                    = searchParams.get('contest') || null
    const { user, isAuthenticated }    = useAuth()

    const [problem,        setProblem]        = useState(null)
    const [code,           setCode]           = useState('')
    const [language,       setLanguage]       = useState('javascript')
    const [loading,        setLoading]        = useState(true)
    const [submitting,     setSubmitting]     = useState(false)
    const [running,        setRunning]        = useState(false)
    const [testResults,    setTestResults]    = useState(null)
    const [submitStatus,   setSubmitStatus]   = useState(null)
    const [isRunResult,    setIsRunResult]    = useState(false)
    const [activeTab,      setActiveTab]      = useState('description')
    const [error,          setError]          = useState('')

    // Contest problems list (for "Next Problem" navigation)
    const [contestProblems, setContestProblems] = useState([])

    const fetchProblem = useCallback(async () => {
        try {
            setLoading(true)
            const res = await problemsAPI.getById(id)
            const p   = res.data.problem
            setProblem(p)
            setCode(p.starterCode?.javascript || '')
        } catch { setError('Failed to load problem.') }
        finally  { setLoading(false) }
    }, [id])

    useEffect(() => { fetchProblem() }, [fetchProblem])

    // Fetch contest problem list when inside a contest
    useEffect(() => {
        if (!contestId) return
        contestsAPI.getById(contestId)
            .then(res => {
                const problems = res.data.contest?.problems || []
                setContestProblems(problems.map(cp => cp.problem))
            })
            .catch(() => {})
    }, [contestId])

    const handleLanguageChange = (lang) => {
        setLanguage(lang)
        if (problem) setCode(problem.starterCode?.[lang] || '')
        setTestResults(null)
        setSubmitStatus(null)
        setIsRunResult(false)
    }

    // ── Run (public test cases only, no DB save) ─────────────────────────────

    const handleRun = async () => {
        if (!isAuthenticated) { setError('Please log in to run your code.'); return }
        setRunning(true); setError(''); setTestResults(null); setSubmitStatus(null); setIsRunResult(false)
        try {
            const res = await submissionsAPI.run({ problemId: id, code, language })
            const r   = res.data
            setTestResults(r.testResults)
            setSubmitStatus(r.status)
            setIsRunResult(true)
            setActiveTab('results')
        } catch (err) {
            setError(err.response?.data?.message || 'Error running code.')
        } finally { setRunning(false) }
    }

    // ── Submit ───────────────────────────────────────────────────────────────

    const handleSubmit = async () => {
        if (!isAuthenticated) { setError('Please log in to submit.'); return }
        setSubmitting(true); setError(''); setTestResults(null); setSubmitStatus(null); setIsRunResult(false)
        try {
            const payload = { problemId: id, code, language }
            if (contestId) payload.contestId = contestId

            const res = await submissionsAPI.submit(payload)
            const sub = res.data.submission
            setTestResults(sub.testResults)
            setSubmitStatus(sub.status)
            setIsRunResult(false)
            setActiveTab('results')

            // Track solved problems in localStorage for contest navigation
            if (contestId && sub.status === 'Accepted') {
                addSolved(contestId, id)
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Error submitting code.')
        } finally { setSubmitting(false) }
    }

    // ── Next problem logic ────────────────────────────────────────────────────

    const nextProblemLink = () => {
        if (!contestId || !contestProblems.length) return null
        const idx = contestProblems.findIndex(p => p._id === id || p._id?.toString() === id)
        if (idx === -1) return null
        if (idx < contestProblems.length - 1) {
            const next = contestProblems[idx + 1]
            return { to: `/problems/${next._id}?contest=${contestId}`, label: 'Next Problem →' }
        }
        return { to: `/contests/${contestId}`, label: 'Back to Contest →' }
    }

    const nextLink = nextProblemLink()
    const isAccepted = submitStatus === 'Accepted' && !isRunResult

    if (loading) return (
        <div className="flex items-center justify-center h-[calc(100vh-64px)] bg-[#0f0f0f]">
            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
    )
    if (!problem) return (
        <div className="flex items-center justify-center h-[calc(100vh-64px)] bg-[#0f0f0f] text-gray-500">
            Problem not found.
        </div>
    )

    return (
        <div className="flex h-[calc(100vh-64px)] bg-[#0f0f0f] overflow-hidden">
            {/* Left: description / results */}
            <div className="w-2/5 flex flex-col border-r border-[#2a2a2a] overflow-hidden">
                {/* Title header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a2a] bg-[#1a1a1a]">
                    <h1 className="text-base font-bold text-white line-clamp-1">{problem.title}</h1>
                    <div className="flex items-center gap-2 shrink-0">
                        {contestId && (
                            <span className="flex items-center gap-1 text-xs text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full">
                                <FaTrophy size={9} /> Contest
                            </span>
                        )}
                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${DIFF_STYLES[problem.difficulty]}`}>
                            {problem.difficulty}
                        </span>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-[#2a2a2a] bg-[#1a1a1a]">
                    {TABS.map(t => (
                        <button key={t.id} onClick={() => setActiveTab(t.id)}
                            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                                activeTab === t.id
                                    ? 'border-orange-500 text-orange-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-300'
                            }`}>
                            {t.icon} {t.label}
                        </button>
                    ))}
                </div>

                {/* Tab content */}
                <div className="flex-1 overflow-y-auto p-5 text-sm text-gray-300 leading-relaxed">
                    {activeTab === 'description' && (
                        <div className="flex flex-col gap-6">
                            <p className="whitespace-pre-wrap">{problem.description}</p>

                            {problem.examples?.length > 0 && (
                                <div>
                                    <h3 className="text-white font-semibold mb-3">Examples</h3>
                                    {problem.examples.map((ex, i) => (
                                        <div key={i} className="mb-3 p-4 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-xs font-mono">
                                            <div><span className="text-gray-500">Input: </span><code className="text-gray-200">{ex.input}</code></div>
                                            <div><span className="text-gray-500">Output: </span><code className="text-emerald-400">{ex.output}</code></div>
                                            {ex.explanation && <div className="mt-1 text-gray-500 font-sans">{ex.explanation}</div>}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {problem.constraints?.length > 0 && (
                                <div>
                                    <h3 className="text-white font-semibold mb-2">Constraints</h3>
                                    <ul className="list-disc list-inside text-gray-400 text-xs space-y-1 font-mono">
                                        {problem.constraints.map((c, i) => <li key={i}>{c}</li>)}
                                    </ul>
                                </div>
                            )}

                            {problem.tags?.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {problem.tags.map((tag, i) => (
                                        <span key={i} className="text-xs text-gray-500 bg-[#2a2a2a] px-2 py-0.5 rounded-full">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'results' && (
                        testResults ? (
                            <div className="flex flex-col gap-4">
                                {/* Run vs Submit label */}
                                {isRunResult && (
                                    <div className="flex items-center gap-2 px-3 py-2 bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg text-xs text-gray-400">
                                        <FaPlay size={9} className="text-gray-500" />
                                        <span>Run Result — only public test cases were checked. No submission recorded.</span>
                                    </div>
                                )}

                                <TestResults results={testResults} overallStatus={submitStatus} />

                                {/* Next Problem button — only after a real Accepted submission inside a contest */}
                                {isAccepted && contestId && nextLink && (
                                    <Link
                                        to={nextLink.to}
                                        className="flex items-center justify-center gap-2 mt-2 bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
                                        {nextLink.label} <FaArrowRight size={12} />
                                    </Link>
                                )}
                            </div>
                        ) : (
                            <p className="text-gray-600 text-center mt-10">Run or submit your code to see results.</p>
                        )
                    )}
                </div>
            </div>

            {/* Right: editor */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a] bg-[#1a1a1a]">
                    <select value={language} onChange={e => handleLanguageChange(e.target.value)}
                        className="text-xs font-medium text-gray-300 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-3 py-1.5 focus:outline-none focus:border-orange-500/50 cursor-pointer">
                        <option value="javascript">JavaScript</option>
                        <option value="python">Python</option>
                        <option value="cpp">C++</option>
                    </select>

                    <div className="flex items-center gap-2">
                        {/* Run button — gray/secondary style */}
                        <button
                            id="run-code-btn"
                            onClick={handleRun}
                            disabled={running || submitting || !isAuthenticated}
                            className="flex items-center gap-1.5 bg-[#2a2a2a] hover:bg-[#333] disabled:opacity-50 disabled:cursor-not-allowed text-gray-300 hover:text-white text-xs font-semibold px-4 py-1.5 rounded-lg border border-[#3a3a3a] hover:border-[#555] transition-colors">
                            {running
                                ? <><FaSpinner className="animate-spin" size={10} /> Running…</>
                                : <><FaPlay size={10} /> Run</>
                            }
                        </button>

                        {/* Submit button — orange primary style */}
                        <button
                            id="submit-code-btn"
                            onClick={handleSubmit}
                            disabled={submitting || running || !isAuthenticated}
                            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors">
                            {submitting
                                ? <><FaSpinner className="animate-spin" size={10} /> Submitting…</>
                                : <><FaPlay size={10} /> {contestId ? 'Submit to Contest' : 'Submit'}</>
                            }
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border-b border-red-500/20 px-4 py-2 text-xs">
                        <FiAlertTriangle size={13} /> {error}
                    </div>
                )}

                <div className="flex-1">
                    <CodeEditor code={code} onChange={setCode} language={language} />
                </div>

                {!isAuthenticated && (
                    <div className="px-4 py-2 bg-[#1a1a1a] border-t border-[#2a2a2a] text-center text-xs text-gray-500">
                        Please log in to run or submit your solution.
                    </div>
                )}
            </div>
        </div>
    )
}

export default ProblemDetailPage
