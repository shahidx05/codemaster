import { FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaLock, FaEyeSlash } from 'react-icons/fa'
import { MdTimer, MdMemory } from 'react-icons/md'

// Status-level banners shown at the top of the results panel
const STATUS_CONFIG = {
    'Accepted':              { label: 'All Tests Passed!',      cls: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', icon: <FaCheckCircle /> },
    'Wrong Answer':          { label: 'Wrong Answer',           cls: 'bg-red-500/10 border-red-500/20 text-red-400',             icon: <FaTimesCircle /> },
    'Runtime Error':         { label: 'Runtime Error',          cls: 'bg-red-500/10 border-red-500/20 text-red-400',             icon: <FaExclamationTriangle /> },
    'Time Limit Exceeded':   { label: 'Time Limit Exceeded',    cls: 'bg-orange-500/10 border-orange-500/20 text-orange-400',    icon: <MdTimer /> },
    'Memory Limit Exceeded': { label: 'Memory Limit Exceeded',  cls: 'bg-purple-500/10 border-purple-500/20 text-purple-400',    icon: <MdMemory /> },
    'Compilation Error':     { label: 'Compilation Error',      cls: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',    icon: <FaExclamationTriangle /> }
}

// Per-test-case row header colours
function rowStyle(r) {
    if (r.passed)  return { header: 'bg-emerald-500/10 text-emerald-400', border: 'border-emerald-500/20' }
    if (r.error)   return { header: 'bg-red-500/10 text-red-400',         border: 'border-red-500/20' }
    return             { header: 'bg-red-500/10 text-red-400',             border: 'border-red-500/20' }
}

function rowIcon(r) {
    if (r.passed) return <><FaCheckCircle size={11} /> Passed</>
    if (r.error)  return <><FaExclamationTriangle size={11} /> Error</>
    return              <><FaTimesCircle size={11} /> Failed</>
}

const TestResults = ({ results, overallStatus }) => {
    if (!results?.length) return null

    const banner = STATUS_CONFIG[overallStatus]

    // Parse compilation error line number if applicable
    let compileErrorLine = null;
    let compileErrorFile = 'code';
    if (overallStatus === 'Compilation Error' && results[0]?.error) {
        // C++ GCC format: file:line:col
        const cppMatch = results[0].error.match(/(\d+):(\d+): error:/);
        if (cppMatch) compileErrorLine = cppMatch[1];
        
        // Python format: File "file", line 4
        if (!compileErrorLine) {
            const pyMatch = results[0].error.match(/line (\d+)/);
            if (pyMatch) compileErrorLine = pyMatch[1];
        }
    }

    return (
        <div className="flex flex-col gap-3">

            {compileErrorLine && (
                <div className="flex flex-col gap-1.5 p-3.5 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-yellow-400 text-sm">
                    <div className="flex items-center gap-2 font-bold">
                        <FaExclamationTriangle size={15} /> Compilation Failed at Line {compileErrorLine}
                    </div>
                    <div className="text-xs text-yellow-500/80 ml-6">
                        Check line {compileErrorLine} in your code for syntax errors.
                    </div>
                </div>
            )}

            {/* Overall status banner */}
            {banner && (
                <div className={`flex items-center gap-2 px-4 py-3 rounded-lg font-semibold text-sm border ${banner.cls}`}>
                    {banner.icon}
                    <span>{banner.label}</span>
                </div>
            )}

            {/* Per-test-case results */}
            <div className="flex flex-col gap-2">
                {results.map((r) => {
                    const style   = rowStyle(r)
                    const isHidden = r.isPublic === false && r.input === null

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

                            {/* Row details — only shown for public test cases */}
                            {isHidden ? (
                                <div className="px-4 py-3 bg-[#0f0f0f] flex items-center gap-2 text-xs text-gray-600">
                                    <FaLock size={10} />
                                    Input and expected output are hidden for this test case.
                                </div>
                            ) : (
                                <div className="px-4 py-3 bg-[#0f0f0f] flex flex-col gap-2 text-xs font-mono">
                                    <div className="flex gap-2">
                                        <span className="text-gray-500 w-20 shrink-0">Input</span>
                                        <code className="text-gray-300 break-all">{JSON.stringify(r.input)}</code>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="text-gray-500 w-20 shrink-0">Expected</span>
                                        <code className="text-emerald-400 break-all">{JSON.stringify(r.expectedOutput)}</code>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="text-gray-500 w-20 shrink-0">Got</span>
                                        <code className={r.error ? 'text-red-400 break-all' : r.passed ? 'text-gray-300 break-all' : 'text-yellow-400 break-all'}>
                                            {r.error ? `Error: ${r.error}` : JSON.stringify(r.actualOutput)}
                                        </code>
                                    </div>
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
