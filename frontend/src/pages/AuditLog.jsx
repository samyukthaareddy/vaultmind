import { useEffect, useState } from 'react'
import { auditApi } from '../services/api'
import { ResultBadge } from '../components/Badges'
import { Shield, Search } from 'lucide-react'

function SkeletonRows() {
  return Array.from({ length: 8 }).map((_, i) => (
    <div key={i} className="log-row">
      <div className="skeleton h-3.5 w-14 rounded" />
      <div className="skeleton h-3 w-20 rounded" />
      <div className="skeleton h-3 flex-1 rounded" />
      <div className="skeleton h-3 w-28 rounded" />
    </div>
  ))
}

export default function AuditLog() {
  const [logs, setLogs]       = useState([])
  const [search, setSearch]   = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    auditApi.list()
      .then(r => setLogs(r.data))
      .catch(e => setError(e.response?.data?.error || 'Access denied'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = logs.filter(l =>
    !search ||
    l.action?.toLowerCase().includes(search.toLowerCase()) ||
    l.user_id?.toLowerCase().includes(search.toLowerCase()) ||
    l.reason?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 space-y-4 max-w-6xl">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-slate-500" />
            <h1 className="text-base font-semibold text-slate-100">Audit Log</h1>
          </div>
          <p className="text-slate-500 text-sm mt-0.5">All memory access events — allowed and denied.</p>
        </div>
        {!loading && (
          <span className="text-xs text-slate-600 tabular-nums">{filtered.length} events</span>
        )}
      </div>

      {error && (
        <div className="text-xs text-rose-400 bg-rose-950/40 border border-rose-800/40 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {/* Search */}
      <div className="relative w-64">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          className="input pl-8 text-xs"
          placeholder="Filter events…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Log viewer */}
      <div className="card p-0 overflow-hidden">
        {/* Column headers */}
        <div className="flex items-center gap-3 px-4 py-2 border-b border-slate-800 bg-slate-900/50">
          <span className="section-label w-16 shrink-0">Result</span>
          <span className="section-label w-28 shrink-0">Action</span>
          <span className="section-label w-28 shrink-0">User</span>
          <span className="section-label w-28 shrink-0">Memory</span>
          <span className="section-label flex-1">Reason</span>
          <span className="section-label w-32 text-right shrink-0">Timestamp</span>
        </div>

        <div className="divide-y divide-slate-800/50">
          {loading ? <SkeletonRows /> : filtered.map((log, i) => (
            <div key={i} className="log-row items-center">
              <div className="w-16 shrink-0">
                <ResultBadge result={log.result} />
              </div>
              <span className="w-28 shrink-0 text-slate-300 truncate">{log.action}</span>
              <span className="w-28 shrink-0 text-slate-500 truncate">{log.user_id?.slice(0, 12)}…</span>
              <span className="w-28 shrink-0 text-slate-600 truncate">{log.memory_id?.slice(0, 12) || '—'}</span>
              <span className="flex-1 text-slate-600 truncate">{log.reason || '—'}</span>
              <span className="w-32 text-right text-slate-700 shrink-0 tabular-nums">
                {new Date(log.timestamp).toLocaleString([], {
                  month: 'short', day: 'numeric',
                  hour: '2-digit', minute: '2-digit', second: '2-digit',
                })}
              </span>
            </div>
          ))}
        </div>

        {!loading && filtered.length === 0 && (
          <div className="px-4 py-10 text-center">
            <p className="text-slate-500 text-sm">No audit events found.</p>
          </div>
        )}
      </div>
    </div>
  )
}
