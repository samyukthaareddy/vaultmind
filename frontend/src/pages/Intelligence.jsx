import { useEffect, useState } from 'react'
import { agent } from '../services/api'
import { useNavigate } from 'react-router-dom'
import { Activity, AlertTriangle, AlertCircle, Zap, Clock, ChevronRight } from 'lucide-react'
import { RiskBadge } from '../components/Badges'

function HealthBar({ label, value }) {
  const color = value >= 80 ? 'bg-emerald-500' : value >= 60 ? 'bg-amber-500' : 'bg-rose-500'
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-400 w-48 shrink-0">{label}</span>
      <div className="flex-1 bg-slate-800 rounded-full h-1.5">
        <div className={`${color} h-1.5 rounded-full transition-all duration-500`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs text-slate-400 w-8 text-right tabular-nums font-mono">{value}%</span>
    </div>
  )
}

function SkeletonBars() {
  return Array.from({ length: 5 }).map((_, i) => (
    <div key={i} className="flex items-center gap-3">
      <div className="skeleton h-3 w-48 rounded" />
      <div className="skeleton flex-1 h-1.5 rounded-full" />
      <div className="skeleton h-3 w-8 rounded" />
    </div>
  ))
}

export default function Intelligence() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate              = useNavigate()

  useEffect(() => {
    agent.health().then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const h       = data?.health || {}
  const metrics = h.metrics   || {}

  const SEV_COLOR = { HIGH: 'text-rose-400', MEDIUM: 'text-amber-400', LOW: 'text-slate-400' }

  return (
    <div className="p-6 space-y-5 max-w-4xl">

      {/* Header */}
      <div className="flex items-center gap-2">
        <Activity size={14} className="text-slate-500" />
        <div>
          <h1 className="text-base font-semibold text-slate-100">Institutional Intelligence</h1>
          <p className="text-slate-500 text-sm mt-0.5">Proactive knowledge health — risks, gaps, conflicts, and staleness.</p>
        </div>
      </div>

      {/* Top metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Knowledge Health', value: loading ? '—' : `${h.overall ?? '—'}%`, color: 'text-emerald-400' },
          { label: 'High-Risk Areas',  value: loading ? '—' : data?.top_risks?.length ?? 0,  color: 'text-rose-400'   },
          { label: 'Knowledge Gaps',   value: loading ? '—' : data?.gap_count ?? 0,           color: 'text-amber-400'  },
          { label: 'Conflicts',        value: loading ? '—' : data?.conflict_count ?? 0,      color: 'text-orange-400' },
          { label: 'Stale Memories',   value: loading ? '—' : data?.stale_count ?? 0,         color: 'text-slate-400'  },
        ].map(({ label, value, color }) => (
          <div key={label} className="card-sm text-center">
            <div className={`text-2xl font-semibold ${color} tabular-nums`}>{value}</div>
            <div className="text-xs text-slate-500 mt-1 leading-tight">{label}</div>
          </div>
        ))}
      </div>

      {/* Health breakdown */}
      <div className="card space-y-3">
        <p className="section-label">Knowledge Health Breakdown</p>
        {loading ? <SkeletonBars /> : Object.entries(metrics).map(([key, val]) => (
          <HealthBar
            key={key}
            label={key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
            value={val}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Top Risks */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <p className="section-label flex items-center gap-1.5">
              <AlertTriangle size={11} className="text-rose-400" /> Top Knowledge Risks
            </p>
            <button
              onClick={() => navigate('/risk-radar')}
              className="text-xs text-vault-400 hover:text-vault-300 flex items-center gap-1 transition-colors"
            >
              View all <ChevronRight size={11} />
            </button>
          </div>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-14 rounded-md" />)}
            </div>
          ) : data?.top_risks?.length ? data.top_risks.map((r, i) => (
            <div key={i} className="flex items-start justify-between gap-3 p-3 bg-slate-800/50 border border-slate-700/50 rounded-md">
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-200">{r.system}</p>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{r.reasons?.[0]}</p>
              </div>
              <RiskBadge level={r.risk_level} />
            </div>
          )) : <p className="text-slate-600 text-xs">No high risks detected.</p>}
        </div>

        {/* Proactive Insights */}
        <div className="card space-y-3">
          <p className="section-label flex items-center gap-1.5">
            <Zap size={11} className="text-amber-400" /> Proactive Insights
          </p>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-12 rounded-md" />)}
            </div>
          ) : data?.insights?.length ? data.insights.map((ins, i) => (
            <div key={i} className="flex gap-2.5 text-xs">
              <span className={`mt-0.5 shrink-0 font-bold ${SEV_COLOR[ins.severity]}`}>·</span>
              <div>
                <p className="text-slate-300">{ins.message}</p>
                {ins.action && <p className="text-slate-600 mt-0.5">{ins.action}</p>}
              </div>
            </div>
          )) : <p className="text-slate-600 text-xs">No proactive insights at this time.</p>}
        </div>
      </div>

      {/* Quick nav */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Risk Radar',      desc: 'Knowledge concentration',  to: '/risk-radar', icon: AlertTriangle, color: 'text-rose-400'   },
          { label: 'Knowledge Gaps',  desc: 'Undocumented areas',       to: '/gaps',       icon: AlertCircle,  color: 'text-amber-400'  },
          { label: 'Conflicts',       desc: 'Contradictory memories',   to: '/conflicts',  icon: Zap,          color: 'text-orange-400' },
          { label: 'Staleness',       desc: 'Outdated memories',        to: '/freshness',  icon: Clock,        color: 'text-slate-400'  },
        ].map(({ label, desc, to, icon: Icon, color }) => (
          <button
            key={to}
            onClick={() => navigate(to)}
            className="card-sm text-left hover:border-slate-700 hover:bg-slate-800/60 transition-colors duration-150 group"
          >
            <Icon size={13} className={`${color} mb-2`} />
            <p className="text-xs font-medium text-slate-300 group-hover:text-slate-100">{label}</p>
            <p className="text-2xs text-slate-600 mt-0.5">{desc}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
