import { FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaLock, FaEyeSlash } from 'react-icons/fa'
import { MdTimer, MdMemory } from 'react-icons/md'
import { FiTerminal } from 'react-icons/fi'

const STATUS_CONFIG = {
    'Accepted':              { label: 'All Tests Passed!',      cls: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', icon: <FaCheckCircle /> },
    'Wrong Answer':          { label: 'Wrong Answer',           cls: 'bg-red-500/10 border-red-500/20 text-red-400',             icon: <FaTimesCircle /> },
    'Runtime Error':         { label: 'Runtime Error',          cls: 'bg-red-500/10 border-red-500/20 text-red-400',             icon: <FaExclamationTriangle /> },
    'Time Limit Exceeded':   { label: 'Time Limit Exceeded',    cls: 'bg-orange-500/10 border-orange-500/20 text-orange-400',    icon: <MdTimer /> },
    'Memory Limit Exceeded': { label: 'Memory Limit Exceeded',  cls: 'bg-purple-500/10 border-purple-500/20 text-purple-400',    icon: <MdMemory /> },
    'Compilation Error':     { label: 'Compilation Error',      cls: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',    icon: <FaExclamationTriangle /> }
}

function rowStyle(r) {
    if (r.passed) return { header: 'bg-emerald-500/10 text-emerald-400', border: 'border-emerald-500/20' }
    if (r.error)  return { header: 'bg-red-500/10 text-red-400',         border: 'border-red-500/20' }
    return              { header: 'bg-red-500/10 text-red-400',           border: 'border-red-500/20' }
}

function rowIcon(r) {
    if (r.passed) return <><FaCheckCircle size={11} /> Passed</>
    if (r.error)  return <><FaExclamationTriangle size={11} /> Error</>
    return              <><FaTimesCircle size={11} /> Failed</>
}

// Detect line number from GCC or Python error strings
function extractErrorLine(errorStr) {
    if (!errorStr) return null
    const gccMatch = errorStr.match(/(\d+):(\d+): error:/);
    if (gccMatch) return gccMatch[1]
    const pyMatch = errorStr.match(/line (\d+)/);
    if (pyMatch) return pyMatch[1]
    return null
}

// ── Output cell — handles plain-text stdout (C++/Python) and JSON (JS) ────────
function OutputValue({ label, value, className = 'text-gray-300' }) {
    const display = value === null || value === undefined
        ? <span className="text-gray-600 italic">—</span>
        : typeof value === 'string'
            ? <span className={className}>{value}</span>
            : <span className={className}>{JSON.stringify(value)}</span>

    return (
        <div className="flex gap-2">
            <span className="text-gray-500 w-20 shrink-0">{label}</span>
            <code className="break-all">{display}</code>
        </div>
    )
}

const TestResults = ({ results, overallStatus }) => {
    if (!results?.length) return null

    const banner         = STATUS_CONFIG[overallStatus]
    const firstError     = results[0]?.error || results[0]?.compileOutput || ''
    const errorLine      = overallStatus === 'Compilation Error' ? extractErrorLine(firstError) : null
    const compileDetails = overallStatus === 'Compilation Error' ? firstError : null

    return (
        <div className="flex flex-col gap-3">

            {/* Compilation error banner with full message */}
            {compileDetails && (
                <div className="flex flex-col gap-2 p-3.5 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-yellow-400">
                    <div className="flex items-center gap-2 font-bold text-sm">
                        <FaExclamationTriangle size={14} />
                        Compilation Failed{errorLine ? ` — Line ${errorLine}` : ''}
                    </div>
                    <pre className="text-xs text-yellow-300/80 font-mono whitespace-pre-wrap break-all leading-relaxed max-h-48 overflow-y-auto">
                        {compileDetails}
                    </pre>
                </div>
            )}

            {/* Overall status banner */}
            {banner && overallStatus !== 'Compilation Error' && (
                <div className={`flex items-center gap-2 px-4 py-3 rounded-lg font-semibold text-sm border ${banner.cls}`}>
                    {banner.icon}
                    <span>{banner.label}</span>
                </div>
            )}
            {banner && overallStatus === 'Compilation Error' && (
                <div className={`flex items-center gap-2 px-4 py-3 rounded-lg font-semibold text-sm border ${banner.cls}`}>
                    {banner.icon}
                    <span>{banner.label}</span>
                </div>
            )}

            {/* Per-test-case results */}
            <div className="flex flex-col gap-2">
                {results.map((r) => {
                    const style    = rowStyle(r)
                    const isHidden = r.isPublic === false && r.input === null
                    // Determine what to show as "Got" output
                    const gotValue = r.error
                        ? null
                        : (r.stdout !== undefined ? r.stdout : r.actualOutput)
                    const expectedValue = r.expectedStdout !== undefined
                        ? r.expectedStdout
                        : r.expectedOutput

                    return (
                        <div key={r.testCase} className={`rounded-lg border overflow-hidden ${style.border}`}>
                            {/* Row header */}
                            <div className={`flex items-center justify-between px-4 py-2 text-xs font-semibold ${style.header}`}>
                                <span className="flex items-center gap-1.5">
                                    Test Case {r.testCase}
                                    {isHidden && (
                                        <span className="flex items-center gap-1 text-gray-500 font-normal">
                                            <FaEyeSlash size={10} /> hidden
                                        </span>
                                    )}
                                </span>
                                <span className="flex items-center gap-1">{rowIcon(r)}</span>
                            </div>

                            {/* Row details */}
                            {isHidden ? (
                                <div className="px-4 py-3 bg-[#0f0f0f] flex items-center gap-2 text-xs text-gray-600">
                                    <FaLock size={10} />
                                    Input and expected output are hidden for this test case.
                                </div>
                            ) : (
                                <div className="px-4 py-3 bg-[#0f0f0f] flex flex-col gap-2 text-xs font-mono">
                                    {/* Input — show plain stdin if available, else JS input */}
                                    <OutputValue
                                        label="Input"
                                        value={r.stdin !== undefined ? r.stdin : r.input}
                                    />
                                    {/* Expected */}
                                    <OutputValue
                                        label="Expected"
                                        value={expectedValue}
                                        className="text-emerald-400"
                                    />
                                    {/* Got / Error */}
                                    {r.error ? (
                                        <div className="flex flex-col gap-1">
                                            {/* Runtime stderr */}
                                            {r.stderr && overallStatus !== 'Compilation Error' && (
                                                <div className="flex gap-2">
                                                    <span className="text-gray-500 w-20 shrink-0 flex items-center gap-1">
                                                        <FiTerminal size={9} /> stderr
                                                    </span>
                                                    <pre className="text-red-400 break-all whitespace-pre-wrap max-h-24 overflow-y-auto">
                                                        {r.stderr}
                                                    </pre>
                                                </div>
                                            )}
                                            {/* Generic error */}
                                            {!r.stderr && (
                                                <div className="flex gap-2">
                                                    <span className="text-gray-500 w-20 shrink-0">Got</span>
                                                    <code className="text-red-400 break-all">{r.error}</code>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <OutputValue
                                            label="Got"
                                            value={gotValue}
                                            className={r.passed ? 'text-gray-300' : 'text-yellow-400'}
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default TestResults
