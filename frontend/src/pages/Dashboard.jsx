import { useEffect, useState } from 'react'
import { agent } from '../services/api'
import { Brain, BookOpen, AlertTriangle, TrendingUp, Zap, FileText, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ResultBadge } from '../components/Badges'

const METRIC_CONFIG = [
  { key: 'total_memories', label: 'Total Memories',   icon: Brain,         color: 'text-vault-400' },
  { key: 'decisions',      label: 'Decisions',        icon: BookOpen,      color: 'text-blue-400'  },
  { key: 'incidents',      label: 'Incidents',        icon: AlertTriangle, color: 'text-rose-400'  },
  { key: 'lessons',        label: 'Lessons Learned',  icon: TrendingUp,    color: 'text-emerald-400'},
  { key: 'workarounds',    label: 'Workarounds',      icon: Zap,           color: 'text-amber-400' },
  { key: 'documents',      label: 'Documents',        icon: FileText,      color: 'text-slate-400' },
]

function SkeletonMetrics() {
  return (
    <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="card space-y-2">
          <div className="skeleton h-3 w-3 rounded" />
          <div className="skeleton h-6 w-10 rounded" />
          <div className="skeleton h-2.5 w-16 rounded" />
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const { user }            = useAuth()
  const navigate            = useNavigate()

  useEffect(() => {
    agent.dashboard().then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const maxCount = data?.memory_types
    ? Math.max(...Object.values(data.memory_types), 1)
    : 1

  return (
    <div className="p-6 space-y-6 max-w-5xl">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-base font-semibold text-slate-100">Institutional Memory</h1>
          <p className="text-slate-500 text-sm mt-0.5">NovaPay · {user?.name}</p>
        </div>
        <button
          onClick={() => navigate('/ask')}
          className="btn-primary text-xs"
        >
          Ask Memory <ArrowRight size={13} />
        </button>
      </div>

      {/* Metrics */}
      {loading ? <SkeletonMetrics /> : (
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
          {METRIC_CONFIG.map(({ key, label, icon: Icon, color }) => (
            <div key={key} className="card-sm">
              <Icon size={13} className={`${color} mb-2`} />
              <div className="text-xl font-semibold text-slate-100">{data?.[key] ?? '—'}</div>
              <div className="text-xs text-slate-500 mt-0.5 leading-tight">{label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Memory breakdown — wider */}
        <div className="lg:col-span-3 card space-y-3">
          <p className="section-label">Memory Breakdown</p>
          {loading ? (
            <div className="space-y-2.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="skeleton h-2.5 w-32 rounded" />
                  <div className="skeleton flex-1 h-1.5 rounded-full" />
                  <div className="skeleton h-2.5 w-4 rounded" />
                </div>
              ))}
            </div>
          ) : data?.memory_types ? (
            <div className="space-y-2">
              {Object.entries(data.memory_types)
                .sort(([, a], [, b]) => b - a)
                .map(([type, count]) => (
                  <div key={type} className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 w-36 shrink-0 truncate">
                      {type.replace(/_/g, ' ')}
                    </span>
                    <div className="flex-1 bg-slate-800 rounded-full h-1.5">
                      <div
                        className="bg-vault-600 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${(count / maxCount) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-400 w-5 text-right tabular-nums">{count}</span>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-slate-600 text-xs">No data yet.</p>
          )}
        </div>

        {/* Recent activity — narrower */}
        <div className="lg:col-span-2 card space-y-3">
          <p className="section-label">Recent Activity</p>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="skeleton h-4 w-14 rounded" />
                  <div className="skeleton h-3 flex-1 rounded" />
                </div>
              ))}
            </div>
          ) : data?.recent_activity?.length > 0 ? (
            <div className="space-y-1.5">
              {data.recent_activity.map((log, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <ResultBadge result={log.result} />
                  <span className="text-slate-400 flex-1 truncate">{log.action}</span>
                  <span className="text-slate-600 font-mono shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-600 text-xs">No recent activity.</p>
          )}
        </div>
      </div>

      {/* How it works — subtle info strip */}
      <div className="flex items-start gap-3 px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-lg">
        <Brain size={14} className="text-vault-400 mt-0.5 shrink-0" />
        <p className="text-xs text-slate-500 leading-relaxed">
          Every memory is stored in <span className="text-slate-400 font-medium">Hindsight</span> — a persistent memory layer.
          When you ask a question, VaultMind recalls relevant memories, enforces access permissions,
          and generates a grounded answer explaining not just <em>what</em> happened, but <em>why</em>.
        </p>
      </div>
    </div>
  )
}
