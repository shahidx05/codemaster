import { FaCheckCircle, FaTimesCircle, FaExclamationTriangle } from 'react-icons/fa'
import { MdTimer, MdMemory } from 'react-icons/md'
import { TbCodeOff } from 'react-icons/tb'

const STATUS = {
    'Accepted':              { icon: <FaCheckCircle />,       cls: 'text-emerald-400' },
    'Wrong Answer':          { icon: <FaTimesCircle />,       cls: 'text-yellow-400'  },
    'Runtime Error':         { icon: <FaExclamationTriangle />, cls: 'text-red-400'   },
    'Time Limit Exceeded':   { icon: <MdTimer />,             cls: 'text-orange-400'  },
    'Memory Limit Exceeded': { icon: <MdMemory />,            cls: 'text-purple-400'  },
    'Compilation Error':     { icon: <TbCodeOff />,           cls: 'text-yellow-400'  }
}

const fmt = (str) =>
    new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    + ' ' + new Date(str).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

const SubmissionList = ({ submissions }) => {
    if (!submissions?.length) return (
        <p className="text-gray-500 text-sm text-center py-10">No submissions yet. Start solving problems!</p>
    )
    return (
        <div className="overflow-x-auto rounded-xl border border-[#2a2a2a]">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-[#2a2a2a] bg-[#1a1a1a]">
                        {['Time', 'Problem', 'Lang', 'Status', 'Runtime', 'Memory'].map(h => (
                            <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-[#1e1e1e]">
                    {submissions.map(s => {
                        const cfg = STATUS[s.status] || { icon: null, cls: 'text-gray-400' }
                        return (
                            <tr key={s._id} className="bg-[#0f0f0f] hover:bg-[#141414] transition-colors">
                                <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{fmt(s.createdAt)}</td>
                                <td className="px-4 py-3">
                                    <span className="text-gray-300 font-medium">{s.problem?.title || 'N/A'}</span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="text-xs text-gray-500 bg-[#2a2a2a] px-2 py-0.5 rounded font-mono">
                                        {s.language === 'cpp' ? 'C++' : 'JS'}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`flex items-center gap-1.5 font-medium text-xs ${cfg.cls}`}>
                                        {cfg.icon}{s.status}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-gray-400 text-xs">{s.runtime} ms</td>
                                <td className="px-4 py-3 text-gray-400 text-xs">{s.memory || '—'} MB</td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}

export default SubmissionList
