import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { contestsAPI, problemsAPI } from '../services/api'
import {
    FaChalkboard, FaPlus, FaTrash, FaTrophy, FaUsers, FaClock,
    FaSpinner, FaSearch, FaTimes, FaCheck, FaEye, FaEyeSlash,
    FaCode, FaLock, FaChartBar, FaEdit, FaBars, FaTimes as FaX,
    FaMedal, FaArrowRight
} from 'react-icons/fa'
import { MdOutlineLeaderboard, MdDashboard } from 'react-icons/md'

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(iso) {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    })
}
function toLocalInput(iso) {
    if (!iso) return ''
    const d = new Date(iso)
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
function getStatus(c) {
    const now = Date.now()
    if (now < new Date(c.startTime)) return 'upcoming'
    if (now <= new Date(c.endTime))  return 'active'
    return 'ended'
}

const STATUS_BADGE = {
    upcoming: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    active:   'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    ended:    'text-gray-500 bg-gray-500/10 border-gray-500/20'
}
const DIFF_COLORS = { Easy: 'text-emerald-400', Medium: 'text-yellow-400', Hard: 'text-red-400' }

// ── Shared components ─────────────────────────────────────────────────────────
const Label = ({ children }) => (
    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{children}</p>
)
const Success = ({ msg }) => msg ? (
    <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-sm">
        <FaCheck size={12} /> {msg}
    </div>
) : null
const Err = ({ msg }) => msg ? (
    <div className="text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm">{msg}</div>
) : null
const StatCard = ({ icon, value, label, color = 'text-orange-400' }) => (
    <div className="flex flex-col gap-2 p-5 bg-[#111] border border-[#1e1e1e] rounded-2xl hover:border-[#2a2a2a] transition-colors">
        <div className={`text-2xl ${color}`}>{icon}</div>
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-xs text-gray-600">{label}</div>
    </div>
)
const inp = 'w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-orange-500/50 transition-colors'
const mono = `${inp} font-mono text-xs`
const addBtn = 'flex items-center gap-1.5 text-xs text-orange-400 hover:text-orange-300 border border-orange-500/20 hover:border-orange-500/40 px-2.5 py-1.5 rounded-lg transition-colors'
const rmBtn = 'text-gray-600 hover:text-red-400 transition-colors p-1 rounded'

// ── Section: Overview ─────────────────────────────────────────────────────────
const OverviewSection = () => {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        Promise.all([
            contestsAPI.getMy().catch(() => ({ data: { contests: [] } })),
            problemsAPI.getAll().catch(() => ({ data: { problems: [] } }))
        ]).then(([c, p]) => {
            const contests = c.data.contests || []
            const now = Date.now()
            setData({
                total:        contests.length,
                active:       contests.filter(x => now >= new Date(x.startTime) && now <= new Date(x.endTime)).length,
                upcoming:     contests.filter(x => now < new Date(x.startTime)).length,
                participants: contests.reduce((a, x) => a + (x.participantCount || 0), 0),
                problems:     p.data.problems.length,
                contests
            })
        }).finally(() => setLoading(false))
    }, [])

    if (loading) return <div className="flex justify-center py-20"><div className="w-7 h-7 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h2 className="text-lg font-bold text-white mb-4">Overview</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatCard icon={<FaTrophy />} value={data.total}                 label="Total Contests"       color="text-orange-400" />
                    <StatCard icon={<MdOutlineLeaderboard size={22} />} value={data.active}  label="Active Now"          color="text-emerald-400" />
                    <StatCard icon={<FaClock />} value={data.upcoming}               label="Upcoming"             color="text-indigo-400" />
                    <StatCard icon={<FaUsers />} value={data.participants}           label="Total Participants"   color="text-blue-400" />
                </div>
            </div>

            {/* Recent contests */}
            {data.contests.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold text-gray-400 mb-3">Recent Contests</h3>
                    <div className="flex flex-col gap-2">
                        {data.contests.slice(0, 4).map(c => {
                            const status = getStatus(c)
                            return (
                                <Link key={c._id} to={`/contests/${c._id}`}
                                    className="flex items-center gap-4 p-4 bg-[#111] border border-[#1e1e1e] rounded-xl hover:border-[#2a2a2a] transition-all group">
                                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${STATUS_BADGE[status]}`}>{status}</span>
                                    <span className="text-gray-300 font-medium text-sm flex-1 truncate group-hover:text-white transition-colors">{c.title}</span>
                                    <span className="flex items-center gap-1 text-xs text-gray-600 shrink-0"><FaUsers size={10} />{c.participantCount || 0}</span>
                                    <FaArrowRight size={11} className="text-gray-700 group-hover:text-orange-500 transition-colors shrink-0" />
                                </Link>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}

// ── Section: My Contests ──────────────────────────────────────────────────────
const MyContestsSection = () => {
    const [contests, setContests] = useState([])
    const [loading,  setLoading]  = useState(true)
    const [error,    setError]    = useState('')
    const [deleting, setDeleting] = useState(null)

    const load = useCallback(async () => {
        setLoading(true); setError('')
        try {
            const res = await contestsAPI.getMy()
            setContests(res.data.contests)
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load contests')
        } finally { setLoading(false) }
    }, [])

    useEffect(() => { load() }, [load])

    const del = async (id) => {
        if (!window.confirm('Delete this contest? This cannot be undone.')) return
        setDeleting(id)
        try {
            await contestsAPI.delete(id)
            setContests(prev => prev.filter(c => c._id !== id))
        } catch (err) {
            setError(err.response?.data?.message || 'Delete failed')
        } finally { setDeleting(null) }
    }

    if (loading) return <div className="flex justify-center py-20"><div className="w-7 h-7 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>

    return (
        <div className="flex flex-col gap-4">
            <h2 className="text-lg font-bold text-white">My Contests</h2>
            <Err msg={error} />
            {contests.length === 0 ? (
                <div className="text-center py-16 text-gray-600 bg-[#111] border border-[#1e1e1e] rounded-2xl">
                    <FaTrophy size={32} className="mx-auto mb-3 opacity-20" />
                    <p className="mb-4">No contests yet.</p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-2xl border border-[#1e1e1e]">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-[#1e1e1e] bg-[#0d0d0d]">
                                {['Title', 'Status', 'Start', 'End', 'Problems', 'Participants', ''].map(h => (
                                    <th key={h} className="text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider px-4 py-3">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#141414]">
                            {contests.map(c => {
                                const status = getStatus(c)
                                return (
                                    <tr key={c._id} className="bg-[#111] hover:bg-[#161616] transition-colors">
                                        <td className="px-4 py-3">
                                            <Link to={`/contests/${c._id}`} className="text-gray-200 font-medium hover:text-orange-400 transition-colors line-clamp-1">
                                                {c.title}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${STATUS_BADGE[status]}`}>{status}</span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{fmtDate(c.startTime)}</td>
                                        <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{fmtDate(c.endTime)}</td>
                                        <td className="px-4 py-3 text-gray-500 text-center">{c.problems?.length ?? 0}</td>
                                        <td className="px-4 py-3">
                                            <span className="flex items-center gap-1 text-gray-500 text-xs"><FaUsers size={10} /> {c.participantCount ?? 0}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1.5">
                                                {/* Teacher always sees leaderboard */}
                                                <Link to={`/contests/${c._id}`}
                                                    className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2 py-1 rounded-lg transition-colors whitespace-nowrap">
                                                    <MdOutlineLeaderboard size={11} /> Board
                                                </Link>
                                                <button onClick={() => del(c._id)} disabled={deleting === c._id}
                                                    className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-30">
                                                    {deleting === c._id ? <FaSpinner className="animate-spin" size={12} /> : <FaTrash size={12} />}
                                                </button>
                                            </div>
                                        </td>
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

// ── Section: Create Contest ────────────────────────────────────────────────────
const CreateContestSection = () => {
    const [form, setForm] = useState({ title: '', description: '', startTime: '', endTime: '', isPublic: true })
    const [allProblems, setAllProblems] = useState([])
    const [probSearch,  setProbSearch]  = useState('')
    const [selected,    setSelected]    = useState([])
    const [showPicker,  setShowPicker]  = useState(false)
    const [submitting,  setSubmitting]  = useState(false)
    const [success,     setSuccess]     = useState('')
    const [error,       setError]       = useState('')

    useEffect(() => {
        problemsAPI.getAll().then(r => setAllProblems(r.data.problems)).catch(() => {})
    }, [])

    const filtered = allProblems.filter(p =>
        !selected.some(s => s.problem._id === p._id) &&
        p.title.toLowerCase().includes(probSearch.toLowerCase())
    )

    const handleSubmit = async (e) => {
        e.preventDefault(); setError(''); setSuccess('')
        if (!form.title.trim())  return setError('Title required')
        if (!form.startTime)     return setError('Start time required')
        if (!form.endTime)       return setError('End time required')
        if (new Date(form.startTime) >= new Date(form.endTime)) return setError('End time must be after start time')
        setSubmitting(true)
        try {
            await contestsAPI.create({
                title: form.title.trim(), description: form.description.trim(),
                startTime: new Date(form.startTime).toISOString(),
                endTime:   new Date(form.endTime).toISOString(),
                isPublic:  form.isPublic,
                problems:  selected.map(s => ({ problem: s.problem._id, points: s.points }))
            })
            setSuccess('Contest created successfully!')
            setForm({ title: '', description: '', startTime: '', endTime: '', isPublic: true })
            setSelected([])
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create contest')
        } finally { setSubmitting(false) }
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 max-w-2xl">
            <h2 className="text-lg font-bold text-white">Create Contest</h2>
            <Success msg={success} /><Err msg={error} />

            <div><Label>Contest Title *</Label>
                <input type="text" placeholder="e.g. Weekly Contest #1" className={inp}
                    value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div><Label>Description</Label>
                <textarea rows={3} placeholder="Describe what students should focus on…" className={inp}
                    value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div><Label>Start Time *</Label>
                    <input type="datetime-local" className={inp}
                        value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
                </div>
                <div><Label>End Time *</Label>
                    <input type="datetime-local" className={inp}
                        value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} />
                </div>
            </div>
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => setForm(f => ({ ...f, isPublic: !f.isPublic }))}
                    className={`relative w-10 h-5 rounded-full transition-colors ${form.isPublic ? 'bg-orange-500' : 'bg-[#2a2a2a]'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.isPublic ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
                <span className="text-sm text-gray-500">{form.isPublic ? 'Public — visible to all students' : 'Private — invite only'}</span>
            </div>

            {/* Problem picker */}
            <div>
                <Label>Problems</Label>
                {selected.length > 0 && (
                    <div className="flex flex-col gap-2 mb-3">
                        {selected.map(({ problem: p, points }) => (
                            <div key={p._id} className="flex items-center gap-3 bg-[#111] border border-[#2a2a2a] rounded-xl px-3 py-2.5">
                                <span className={`text-xs font-bold ${DIFF_COLORS[p.difficulty]}`}>{p.difficulty}</span>
                                <span className="flex-1 text-sm text-gray-300">{p.title}</span>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xs text-gray-600">pts</span>
                                    <input type="number" min={0} max={1000} value={points}
                                        onChange={e => setSelected(prev => prev.map(s => s.problem._id === p._id ? { ...s, points: Number(e.target.value) } : s))}
                                        className="w-16 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-2 py-1 text-xs text-right text-gray-300 focus:outline-none focus:border-orange-500/50" />
                                </div>
                                <button type="button" onClick={() => setSelected(prev => prev.filter(s => s.problem._id !== p._id))}
                                    className="text-gray-600 hover:text-red-400 transition-colors"><FaTimes size={12} /></button>
                            </div>
                        ))}
                    </div>
                )}
                <div className="relative">
                    <button type="button" onClick={() => setShowPicker(v => !v)}
                        className={addBtn}><FaPlus size={10} /> Add Problem</button>
                    {showPicker && (
                        <div className="absolute top-full mt-1 left-0 w-full max-w-md bg-[#111] border border-[#2a2a2a] rounded-2xl shadow-2xl z-20 overflow-hidden">
                            <div className="p-2 border-b border-[#1e1e1e]">
                                <div className="relative">
                                    <FaSearch size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600" />
                                    <input autoFocus type="text" placeholder="Search problems…"
                                        value={probSearch} onChange={e => setProbSearch(e.target.value)}
                                        className="w-full bg-[#0a0a0a] border border-[#1e1e1e] rounded-lg pl-7 pr-3 py-1.5 text-xs text-gray-300 focus:outline-none" />
                                </div>
                            </div>
                            <div className="max-h-52 overflow-y-auto">
                                {filtered.length === 0
                                    ? <p className="px-3 py-4 text-xs text-gray-600 text-center">No problems found</p>
                                    : filtered.map(p => (
                                        <button key={p._id} type="button"
                                            onClick={() => { setSelected(prev => [...prev, { problem: p, points: 100 }]); setProbSearch(''); setShowPicker(false) }}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#1a1a1a] text-left transition-colors">
                                            <span className={`text-xs font-bold w-12 shrink-0 ${DIFF_COLORS[p.difficulty]}`}>{p.difficulty}</span>
                                            <span className="text-sm text-gray-300">{p.title}</span>
                                        </button>
                                    ))
                                }
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <button type="submit" disabled={submitting}
                className="self-start flex items-center gap-2 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white text-sm font-bold px-6 py-2.5 rounded-xl transition-colors">
                {submitting ? <FaSpinner className="animate-spin" size={13} /> : <FaTrophy size={13} />}
                Create Contest
            </button>
        </form>
    )
}

// ── Section: Problem Bank ─────────────────────────────────────────────────────
const ProblemBankSection = () => {
    const [problems, setProblems] = useState([])
    const [loading,  setLoading]  = useState(true)

    useEffect(() => {
        problemsAPI.getAll().then(r => setProblems(r.data.problems)).catch(() => {}).finally(() => setLoading(false))
    }, [])

    if (loading) return <div className="flex justify-center py-16"><div className="w-7 h-7 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">Problem Bank</h2>
                <span className="text-xs text-gray-600">{problems.length} problems</span>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-[#1e1e1e]">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-[#1e1e1e] bg-[#0d0d0d]">
                            {['#', 'Title', 'Difficulty', 'Tags', 'Acceptance'].map(h => (
                                <th key={h} className="text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider px-4 py-3">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#141414]">
                        {problems.map((p, i) => (
                            <tr key={p._id} className="bg-[#111] hover:bg-[#161616] transition-colors">
                                <td className="px-4 py-3 text-gray-700 font-mono text-xs">{String(i+1).padStart(2,'0')}</td>
                                <td className="px-4 py-3">
                                    <Link to={`/problems/${p._id}`} className="text-gray-200 font-medium hover:text-orange-400 transition-colors">{p.title}</Link>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`text-xs font-bold ${DIFF_COLORS[p.difficulty]}`}>{p.difficulty}</span>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex gap-1 flex-wrap">
                                        {(p.tags || []).slice(0, 2).map(t => (
                                            <span key={t} className="text-[10px] text-gray-600 bg-[#1a1a1a] px-1.5 py-0.5 rounded">{t}</span>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-gray-600 text-xs">
                                    {p.acceptanceRate != null ? `${Math.round(p.acceptanceRate)}%` : '—'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

// ── Section: Create Problem ───────────────────────────────────────────────────
const CreateProblemSection = () => {
    const [form,        setForm]        = useState({ title: '', description: '', difficulty: 'Easy', tags: '' })
    const [constraints, setConstraints] = useState([''])
    const [examples,    setExamples]    = useState([{ input: '', output: '', explanation: '' }])
    const [testCases,   setTestCases]   = useState([
        { input: '', expectedOutput: '', isPublic: true },
        { input: '', expectedOutput: '', isPublic: true },
        { input: '', expectedOutput: '', isPublic: true },
        { input: '', expectedOutput: '', isPublic: false }
    ])
    const [jsCode,     setJsCode]    = useState('function solution(input) {\n  // Write your code here\n  \n}')
    const [cppCode,    setCppCode]   = useState('// Do not add #include — it is auto-injected\nclass Solution {\npublic:\n    // Write your solution here\n    // Example: vector<int> solution(vector<int> nums, int target) { }\n};')
    const [pyCode,     setPyCode]    = useState('import json, sys\n\ndef solution(nums, target):\n    # Write your code here\n    pass')
    const [cppReturnType, setCppReturnType] = useState('vector<int>')
    const [cppInputType, setCppInputType] = useState('vector<int>')
    const [cppWrapper, setCppWrapper] = useState('')
    const [pyWrapper, setPyWrapper] = useState('')
    const [showAdvanced, setShowAdvanced] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [success,    setSuccess]   = useState('')
    const [error,      setError]     = useState('')

    useEffect(() => {
        // Auto-generate C++ Wrapper
        let cppVars = ''; let cppCall = '';
        if (cppInputType === 'int') { cppVars = '    int input = _jsonInt(line);'; cppCall = 'sol.solution(input)'; }
        else if (cppInputType === 'string') { cppVars = '    string input = _jsonString(line);'; cppCall = 'sol.solution(input)'; }
        else if (cppInputType === 'vector<int>') { cppVars = '    vector<int> input = _jsonIntArray(line);'; cppCall = 'sol.solution(input)'; }
        else if (cppInputType === '{vector<int>, int}') { cppVars = '    vector<int> nums = _jsonIntArray(line, "nums");\n    int target = _jsonInt(line, "target");'; cppCall = 'sol.solution(nums, target)'; }
        let cppPrint = '';
        if (cppReturnType === 'int') cppPrint = `int res = ${cppCall};\n    cout << res << endl;`;
        else if (cppReturnType === 'string') cppPrint = `string res = ${cppCall};\n    cout << "\\"" << res << "\\"" << endl;`;
        else if (cppReturnType === 'bool') cppPrint = `bool res = ${cppCall};\n    cout << (res ? "true" : "false") << endl;`;
        else if (cppReturnType === 'vector<int>') cppPrint = `vector<int> res = ${cppCall};\n    cout << "[";\n    for(size_t i=0; i<res.size(); i++){\n        cout << res[i] << (i<res.size()-1 ? "," : "");\n    }\n    cout << "]" << endl;`;
        else if (cppReturnType === 'void (modifies input)') {
            cppPrint = `${cppCall};\n    cout << "[";\n    for(size_t i=0; i<${cppInputType === '{vector<int>, int}' ? 'nums' : 'input'}.size(); i++){\n        cout << ${cppInputType === '{vector<int>, int}' ? 'nums' : 'input'}[i] << (i<${cppInputType === '{vector<int>, int}' ? 'nums' : 'input'}.size()-1 ? "," : "");\n    }\n    cout << "]" << endl;`;
        }
        setCppWrapper(`int main() {\n    string line;\n    if (!getline(cin, line)) return 0;\n${cppVars}\n    Solution sol;\n    ${cppPrint}\n    return 0;\n}`);

        // Auto-generate Python Wrapper
        let pyVars = ''; let pyCall = '';
        if (cppInputType === 'int') { pyVars = '    input_data = int(data)'; pyCall = 'solution(input_data)'; }
        else if (cppInputType === 'string') { pyVars = '    input_data = str(data)'; pyCall = 'solution(input_data)'; }
        else if (cppInputType === 'vector<int>') { pyVars = '    input_data = data'; pyCall = 'solution(input_data)'; }
        else if (cppInputType === '{vector<int>, int}') { pyVars = '    nums = data.get("nums", [])\n    target = data.get("target", 0)'; pyCall = 'solution(nums, target)'; }
        let pyPrint = '';
        if (cppReturnType === 'void (modifies input)') pyPrint = `${pyCall}\n    print(json.dumps(${cppInputType === '{vector<int>, int}' ? 'nums' : 'input_data'}))`;
        else pyPrint = `res = ${pyCall}\n    print(json.dumps(res))`;
        setPyWrapper(`import json, sys\n\nif __name__ == '__main__':\n    line = sys.stdin.readline()\n    if not line:\n        sys.exit(0)\n    data = json.loads(line)\n${pyVars}\n    ${pyPrint}`);
    }, [cppReturnType, cppInputType])

    const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))

    const handleSubmit = async (e) => {
        e.preventDefault(); setError(''); setSuccess('')
        if (!form.title.trim())       return setError('Title required')
        if (!form.description.trim()) return setError('Description required')
        let parsedTCs
        try {
            parsedTCs = testCases.map(tc => ({
                input: JSON.parse(tc.input || 'null'),
                expectedOutput: JSON.parse(tc.expectedOutput || 'null'),
                isPublic: tc.isPublic
            }))
        } catch (pe) { return setError(`Test case JSON error: ${pe.message}`) }
        setSubmitting(true)
        try {
            await problemsAPI.create({
                title: form.title.trim(), description: form.description.trim(),
                difficulty: form.difficulty,
                tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
                constraints: constraints.filter(Boolean),
                examples: examples.filter(e => e.input || e.output),
                testCases: parsedTCs,
                starterCode: { javascript: jsCode, cpp: cppCode, python: pyCode },
                cppWrapper,
                pyWrapper
            })
            setSuccess('Problem created!')
            setForm({ title: '', description: '', difficulty: 'Easy', tags: '' })
            setConstraints(['']); setExamples([{ input: '', output: '', explanation: '' }])
            setTestCases([
                { input: '', expectedOutput: '', isPublic: true },
                { input: '', expectedOutput: '', isPublic: true },
                { input: '', expectedOutput: '', isPublic: true },
                { input: '', expectedOutput: '', isPublic: false }
            ])
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create problem')
        } finally { setSubmitting(false) }
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-2xl">
            <h2 className="text-lg font-bold text-white">Create Problem</h2>
            <Success msg={success} /><Err msg={error} />

            <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2"><Label>Title *</Label>
                    <input type="text" placeholder="Problem title" className={inp}
                        value={form.title} onChange={e => setField('title', e.target.value)} />
                </div>
                <div><Label>Difficulty *</Label>
                    <select value={form.difficulty} onChange={e => setField('difficulty', e.target.value)}
                        className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-orange-500/50 cursor-pointer">
                        <option>Easy</option><option>Medium</option><option>Hard</option>
                    </select>
                </div>
            </div>

            <div><Label>Tags <span className="normal-case font-normal text-gray-600">(comma-separated)</span></Label>
                <input type="text" placeholder="Array, Hash Table, Sliding Window…" className={inp}
                    value={form.tags} onChange={e => setField('tags', e.target.value)} />
            </div>
            <div><Label>Description *</Label>
                <textarea rows={5} placeholder="Problem statement…" className={inp}
                    value={form.description} onChange={e => setField('description', e.target.value)} />
            </div>

            {/* Constraints */}
            <div><Label>Constraints</Label>
                <div className="flex flex-col gap-2">
                    {constraints.map((c, i) => (
                        <div key={i} className="flex gap-2">
                            <input type="text" placeholder="1 ≤ n ≤ 10^5" className={`${inp} font-mono text-xs`}
                                value={c} onChange={e => setConstraints(cs => cs.map((x, j) => j === i ? e.target.value : x))} />
                            {constraints.length > 1 && (
                                <button type="button" onClick={() => setConstraints(cs => cs.filter((_, j) => j !== i))} className={rmBtn}><FaTimes size={12} /></button>
                            )}
                        </div>
                    ))}
                    <button type="button" onClick={() => setConstraints(c => [...c, ''])} className={`${addBtn} self-start`}><FaPlus size={10} /> Add</button>
                </div>
            </div>

            {/* Examples */}
            <div><Label>Examples</Label>
                <div className="flex flex-col gap-3">
                    {examples.map((ex, i) => (
                        <div key={i} className="p-3 bg-[#111] border border-[#1e1e1e] rounded-xl flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-600 font-semibold">Example {i+1}</span>
                                {examples.length > 1 && (
                                    <button type="button" onClick={() => setExamples(e => e.filter((_, j) => j !== i))} className={rmBtn}><FaTimes size={12} /></button>
                                )}
                            </div>
                            {['input','output','explanation'].map(k => (
                                <input key={k} type="text" placeholder={k.charAt(0).toUpperCase()+k.slice(1)} className={`${inp} text-xs`}
                                    value={ex[k]} onChange={e => setExamples(es => es.map((x, j) => j === i ? { ...x, [k]: e.target.value } : x))} />
                            ))}
                        </div>
                    ))}
                    <button type="button" onClick={() => setExamples(e => [...e, { input: '', output: '', explanation: '' }])} className={`${addBtn} self-start`}><FaPlus size={10} /> Add Example</button>
                </div>
            </div>

            {/* Test cases */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <Label>Test Cases</Label>
                    <span className="text-[10px] text-gray-600">First 3 public · rest private</span>
                </div>
                <div className="flex flex-col gap-2">
                    {testCases.map((tc, i) => (
                        <div key={i} className={`p-3 rounded-xl border ${tc.isPublic ? 'border-emerald-500/15 bg-emerald-500/5' : 'border-[#1e1e1e] bg-[#0d0d0d]'}`}>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-gray-500 font-semibold">Test {i+1}</span>
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => setTestCases(t => t.map((x, j) => j === i ? { ...x, isPublic: !x.isPublic } : x))}
                                        className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-colors ${tc.isPublic ? 'text-emerald-400 border-emerald-500/30' : 'text-gray-500 border-gray-600/30'}`}>
                                        {tc.isPublic ? <><FaEye size={9} /> Public</> : <><FaEyeSlash size={9} /> Private</>}
                                    </button>
                                    {testCases.length > 1 && (
                                        <button type="button" onClick={() => setTestCases(t => t.filter((_, j) => j !== i))} className={rmBtn}><FaTimes size={12} /></button>
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <p className="text-[10px] text-gray-600 mb-1">Input (JSON)</p>
                                    <input type="text" placeholder='{"nums":[1,2],"target":3}' className={mono}
                                        value={tc.input} onChange={e => setTestCases(t => t.map((x, j) => j === i ? { ...x, input: e.target.value } : x))} />
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-600 mb-1">Expected Output (JSON)</p>
                                    <input type="text" placeholder="[0,1]" className={mono}
                                        value={tc.expectedOutput} onChange={e => setTestCases(t => t.map((x, j) => j === i ? { ...x, expectedOutput: e.target.value } : x))} />
                                </div>
                            </div>
                        </div>
                    ))}
                    <div className="flex gap-2">
                        <button type="button" onClick={() => setTestCases(t => [...t, { input: '', expectedOutput: '', isPublic: true  }])} className={addBtn}><FaEye size={10} /> Add Public</button>
                        <button type="button" onClick={() => setTestCases(t => [...t, { input: '', expectedOutput: '', isPublic: false }])} className={`${addBtn} text-gray-500 border-gray-600/20`}><FaLock size={10} /> Add Private</button>
                    </div>
                </div>
            </div>

            <div><Label>Starter Code — JavaScript</Label><textarea rows={5} className={mono} value={jsCode} onChange={e => setJsCode(e.target.value)} /></div>
            <div>
                <Label>Starter Code — Python</Label>
                <textarea rows={5} className={mono} value={pyCode} onChange={e => setPyCode(e.target.value)} />
            </div>
            <div>
                <Label>Starter Code — C++ <span className="normal-case font-normal text-gray-600">(no #include needed — auto-injected)</span></Label>
                <textarea rows={7} className={mono} value={cppCode} onChange={e => setCppCode(e.target.value)} />
            </div>

            <div className="p-4 bg-[#111] border border-[#2a2a2a] rounded-xl flex flex-col gap-4 mb-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-white font-semibold text-sm">Execution Wrapper Configuration</h3>
                    <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="text-xs text-orange-400 hover:text-orange-300 transition-colors">
                        {showAdvanced ? 'Hide Advanced' : 'Show Advanced (Custom Wrappers)'}
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label>C++ Return Type</Label>
                        <select value={cppReturnType} onChange={e => setCppReturnType(e.target.value)} className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-orange-500/50">
                            <option value="int">int</option>
                            <option value="bool">bool</option>
                            <option value="string">string</option>
                            <option value="vector<int>">vector&lt;int&gt;</option>
                            <option value="void (modifies input)">void (modifies input)</option>
                        </select>
                    </div>
                    <div>
                        <Label>C++ Input Type</Label>
                        <select value={cppInputType} onChange={e => setCppInputType(e.target.value)} className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-orange-500/50">
                            <option value="int">int</option>
                            <option value="string">string</option>
                            <option value="vector<int>">vector&lt;int&gt;</option>
                            <option value="{vector<int>, int}">{'{vector<int>, int}'} (two params)</option>
                        </select>
                    </div>
                </div>

                {showAdvanced && (
                    <div className="flex flex-col gap-4 mt-2">
                        <div>
                            <Label>C++ Execution Wrapper (Advanced)</Label>
                            <p className="text-[10px] text-gray-600 mb-2">Use <code className="text-gray-500">_jsonIntArray</code>, <code className="text-gray-500">_jsonInt</code>, <code className="text-gray-500">_jsonString</code>, <code className="text-gray-500">_jsonBool</code> helpers.</p>
                            <textarea rows={8} className={mono} value={cppWrapper} onChange={e => setCppWrapper(e.target.value)} />
                        </div>
                        <div>
                            <Label>Python Execution Wrapper (Advanced)</Label>
                            <textarea rows={8} className={mono} value={pyWrapper} onChange={e => setPyWrapper(e.target.value)} />
                        </div>
                    </div>
                )}
            </div>

            <button type="submit" disabled={submitting}
                className="self-start flex items-center gap-2 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white text-sm font-bold px-6 py-2.5 rounded-xl transition-colors">
                {submitting ? <FaSpinner className="animate-spin" size={13} /> : <FaCode size={13} />}
                Create Problem
            </button>
        </form>
    )
}

// ── Nav items ─────────────────────────────────────────────────────────────────
const NAV = [
    { id: 'overview',        label: 'Overview',        icon: <MdDashboard size={16} /> },
    { id: 'my-contests',     label: 'My Contests',     icon: <FaTrophy size={14} /> },
    { id: 'create-contest',  label: 'Create Contest',  icon: <FaPlus size={13} /> },
    { id: 'problem-bank',    label: 'Problem Bank',    icon: <FaCode size={13} /> },
    { id: 'create-problem',  label: 'Create Problem',  icon: <FaChalkboard size={13} /> }
]

// ── Main dashboard ────────────────────────────────────────────────────────────
const TeacherDashboard = () => {
    const [active,       setActive]       = useState('overview')
    const [sidebarOpen,  setSidebarOpen]  = useState(true)

    const section = { 'overview': <OverviewSection />, 'my-contests': <MyContestsSection />, 'create-contest': <CreateContestSection />, 'problem-bank': <ProblemBankSection />, 'create-problem': <CreateProblemSection /> }

    return (
        <div className="flex h-[calc(100vh-64px)] bg-[#0f0f0f] overflow-hidden">
            {/* Sidebar */}
            <aside className={`flex flex-col border-r border-[#1a1a1a] bg-[#0d0d0d] transition-all duration-200 shrink-0 ${sidebarOpen ? 'w-52' : 'w-0 overflow-hidden'}`}>
                <div className="px-4 pt-5 pb-3">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-1 h-5 bg-indigo-500 rounded-full" />
                        <span className="text-sm font-bold text-white">Teacher</span>
                    </div>
                    <p className="text-[10px] text-gray-600 pl-3">Dashboard</p>
                </div>
                <nav className="flex-1 px-2 pb-4 space-y-0.5">
                    {NAV.map(n => (
                        <button key={n.id} onClick={() => setActive(n.id)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left ${
                                active === n.id
                                    ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/20'
                                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                            }`}>
                            <span className={active === n.id ? 'text-indigo-400' : 'text-gray-600'}>{n.icon}</span>
                            {n.label}
                        </button>
                    ))}
                </nav>
            </aside>

            {/* Toggle */}
            <button onClick={() => setSidebarOpen(v => !v)}
                className="w-4 bg-[#0d0d0d] border-r border-[#1a1a1a] flex items-center justify-center text-gray-700 hover:text-gray-400 hover:bg-[#141414] transition-colors shrink-0">
                <div className={`w-3 h-3 transition-transform ${sidebarOpen ? '' : 'rotate-180'}`}>
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

export default TeacherDashboard
