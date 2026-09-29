import { useEffect, useState } from 'react'
import { agent } from '../services/api'
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { RiskBadge } from '../components/Badges'

function RiskCard({ risk }) {
  const [open, setOpen] = useState(false)

  const borderColor = {
    HIGH:   'border-rose-800/50',
    MEDIUM: 'border-amber-800/50',
    LOW:    'border-emerald-800/50',
  }[risk.risk_level] || 'border-slate-700'

  return (
    <div className={`card border ${borderColor}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <RiskBadge level={risk.risk_level} />
            <span className="text-sm font-medium text-slate-200">{risk.system}</span>
          </div>
          <div className="space-y-0.5">
            {risk.reasons?.map((r, i) => (
              <p key={i} className="text-xs text-slate-500">— {r}</p>
            ))}
          </div>
        </div>
        <button
          onClick={() => setOpen(v => !v)}
          className="text-slate-600 hover:text-slate-400 transition-colors shrink-0 mt-0.5"
        >
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {open && (
        <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-2 gap-x-6 gap-y-2.5 text-xs">
          <div>
            <p className="section-label mb-0.5">Primary holder</p>
            <p className="text-slate-300">{risk.primary_holder || '—'}</p>
          </div>
          <div>
            <p className="section-label mb-0.5">Concentration</p>
            <p className="text-slate-300 tabular-nums">{risk.concentration_pct}%</p>
          </div>
          <div>
            <p className="section-label mb-0.5">Total memories</p>
            <p className="text-slate-300 tabular-nums">{risk.total_memories}</p>
          </div>
          <div>
            <p className="section-label mb-0.5">Other holders</p>
            <p className="text-slate-300">{risk.other_holders?.join(', ') || 'None identified'}</p>
          </div>
          <div>
            <p className="section-label mb-0.5">Workarounds</p>
            <p className="text-amber-400 tabular-nums">{risk.workarounds}</p>
          </div>
          <div>
            <p className="section-label mb-0.5">Incidents</p>
            <p className="text-rose-400 tabular-nums">{risk.incidents}</p>
          </div>
          {risk.evidence?.length > 0 && (
            <div className="col-span-2">
              <p className="section-label mb-1">Evidence</p>
              <div className="space-y-0.5">
                {risk.evidence.map((e, i) => (
                  <p key={i} className="text-slate-500">— {e}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function RiskRadar() {
  const [risks, setRisks]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    agent.riskRadar().then(r => setRisks(r.data.risks)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const high   = risks.filter(r => r.risk_level === 'HIGH')
  const medium = risks.filter(r => r.risk_level === 'MEDIUM')
  const low    = risks.filter(r => r.risk_level === 'LOW')

  return (
    <div className="p-6 space-y-5 max-w-3xl">

      <div className="flex items-center gap-2">
        <AlertTriangle size={14} className="text-slate-500" />
        <div>
          <h1 className="text-base font-semibold text-slate-100">Risk Radar</h1>
          <p className="text-slate-500 text-sm mt-0.5">Knowledge concentration risks — where critical knowledge is dangerously siloed.</p>
        </div>
      </div>

      {/* Summary counts */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'High Risk',   count: high.length,   color: 'text-rose-400'    },
          { label: 'Medium Risk', count: medium.length, color: 'text-amber-400'   },
          { label: 'Low Risk',    count: low.length,    color: 'text-emerald-400' },
        ].map(({ label, count, color }) => (
          <div key={label} className="card-sm text-center">
            <div className={`text-2xl font-semibold tabular-nums ${color}`}>
              {loading ? '—' : count}
            </div>
            <div className="text-xs text-slate-500 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-lg" />
          ))}
        </div>
      )}

      <div className="space-y-3">
        {risks.map((r, i) => <RiskCard key={i} risk={r} />)}
        {!loading && risks.length === 0 && (
          <p className="text-slate-500 text-sm">No risks detected. Keep building your knowledge base.</p>
        )}
      </div>
    </div>
  )
}
