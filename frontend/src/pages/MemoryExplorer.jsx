import { useEffect, useState } from 'react'
import { memories } from '../services/api'
import { useNavigate } from 'react-router-dom'
import { TypeBadge, AccessBadge, ConfidenceDot } from '../components/Badges'
import { Search, ChevronRight } from 'lucide-react'

const TYPES = ['ALL', 'DECISION', 'INCIDENT', 'WORKAROUND', 'LESSON_LEARNED', 'PERSON_KNOWLEDGE', 'RISK', 'CUSTOMER_REQUIREMENT', 'SYSTEM_KNOWLEDGE']

function SkeletonRows() {
  return Array.from({ length: 6 }).map((_, i) => (
    <tr key={i}>
      <td className="px-4 py-3"><div className="skeleton h-4 w-24 rounded" /></td>
      <td className="px-4 py-3"><div className="skeleton h-3.5 w-48 rounded" /></td>
      <td className="px-4 py-3"><div className="skeleton h-3 w-32 rounded" /></td>
      <td className="px-4 py-3"><div className="skeleton h-4 w-16 rounded" /></td>
      <td className="px-4 py-3"><div className="skeleton h-3.5 w-14 rounded" /></td>
      <td className="px-4 py-3" />
    </tr>
  ))
}

export default function MemoryExplorer() {
  const [all, setAll]         = useState([])
  const [filter, setFilter]   = useState('ALL')
  const [search, setSearch]   = useState('')
  const [loading, setLoading] = useState(true)
  const navigate              = useNavigate()

  useEffect(() => {
    memories.list().then(r => setAll(r.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const filtered = all.filter(m => {
    const matchType   = filter === 'ALL' || m.memory_type === filter
    const matchSearch = !search ||
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.content.toLowerCase().includes(search.toLowerCase())
    return matchType && matchSearch
  })

  return (
    <div className="p-6 space-y-4 max-w-6xl">

      {/* Header */}
      <div>
        <h1 className="text-base font-semibold text-slate-100">Memory Explorer</h1>
        <p className="text-slate-500 text-sm mt-0.5">Browse all organizational memories stored in Hindsight.</p>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className="input pl-8 w-56 text-xs"
            placeholder="Search memories…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {TYPES.map(t => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`text-xs px-2.5 py-1 rounded-md transition-colors duration-150 ${
                filter === t
                  ? 'bg-vault-600 text-white font-medium'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/50'
              }`}
            >
              {t === 'ALL' ? 'All' : t.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-600 ml-auto tabular-nums">
          {loading ? '—' : `${filtered.length} memories`}
        </span>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Title</th>
              <th>Content</th>
              <th>Access</th>
              <th>Confidence</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {loading ? <SkeletonRows /> : filtered.map(m => (
              <tr
                key={m.memory_id}
                onClick={() => navigate(`/memories/${m.memory_id}`)}
                className="cursor-pointer"
              >
                <td className="px-4 py-3 whitespace-nowrap">
                  <TypeBadge type={m.memory_type} />
                </td>
                <td className="px-4 py-3">
                  <p className="text-slate-200 font-medium text-xs leading-snug">{m.title}</p>
                  {m.date && <p className="text-slate-600 text-2xs mt-0.5 font-mono">{m.date}</p>}
                </td>
                <td className="px-4 py-3 max-w-xs">
                  <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed">{m.content}</p>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <AccessBadge level={m.access_level} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <ConfidenceDot confidence={m.confidence} />
                </td>
                <td className="px-4 py-3">
                  <ChevronRight size={13} className="text-slate-700" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!loading && filtered.length === 0 && (
          <div className="px-4 py-10 text-center">
            <p className="text-slate-500 text-sm">No memories found.</p>
            <p className="text-slate-600 text-xs mt-1">Try a different filter or ingest documents.</p>
          </div>
        )}
      </div>
    </div>
  )
}
