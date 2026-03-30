import { Link } from 'react-router-dom'
import { FaCheckCircle } from 'react-icons/fa'

const DIFF = {
    Easy: { text: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20' },
    Medium: { text: 'text-yellow-400', bg: 'bg-yellow-400/10  border-yellow-400/20' },
    Hard: { text: 'text-red-400', bg: 'bg-red-400/10     border-red-400/20' }
}

const ProblemCard = ({ problem }) => {
    const s = DIFF[problem.difficulty] || { text: 'text-gray-400', bg: '' }
    return (
        <Link to={`/problems/${problem._id}`}
            className="flex flex-col gap-3 p-5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl hover:border-orange-500/30 hover:bg-[#1f1f1f] transition-all duration-200 group">
            <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-gray-100 group-hover:text-white transition-colors leading-snug">{problem.title}</h3>
                <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full border ${s.bg} ${s.text}`}>{problem.difficulty}</span>
            </div>
            {problem.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {problem.tags.map((tag, i) => (
                        <span key={i} className="text-xs text-gray-500 bg-[#2a2a2a] px-2 py-0.5 rounded-full">{tag}</span>
                    ))}
                </div>
            )}
            <div className="flex items-center gap-4 mt-auto pt-2 border-t border-[#2a2a2a] text-xs text-gray-500">
                <div className="flex items-center gap-1"><FaCheckCircle size={11} className="text-emerald-500" /><span>{problem.acceptanceRate || 0}% accepted</span></div>
                <span>{problem.totalSubmissions?.toLocaleString() || 0} submissions</span>
            </div>
        </Link>
    )
}

export default ProblemCard
