import { useEffect, useState } from 'react'
import { agent } from '../services/api'
import { AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'

const SEV_STYLES = {
  HIGH:   'text-rose-400',
  MEDIUM: 'text-amber-400',
  LOW:    'text-slate-400',
}

const SEV_DOT = {
  HIGH:   'bg-rose-500',
  MEDIUM: 'bg-amber-500',
  LOW:    'bg-slate-600',
}

function GapCard({ item }) {
  const [open, setOpen] = useState(false)
  const visibleGaps = open ? item.gaps : item.gaps.slice(0, 2)

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-200">{item.system}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {item.total_gaps} gap{item.total_gaps !== 1 ? 's' : ''} identified
          </p>
        </div>
        <button
          onClick={() => setOpen(v => !v)}
          className="text-slate-600 hover:text-slate-400 transition-colors shrink-0"
        >
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      <div className="mt-3 space-y-2">
        {visibleGaps.map((g, i) => (
          <div key={i} className="flex items-start gap-2.5 text-xs">
            <span className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${SEV_DOT[g.severity] || 'bg-slate-600'}`} />
            <div className="min-w-0">
              <span className={`font-medium ${SEV_STYLES[g.severity] || 'text-slate-400'}`}>
                {g.severity}
              </span>
              <span className="text-slate-400 ml-1.5">{g.gap}</span>
              {open && g.evidence?.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {g.evidence.map((e, j) => (
                    <p key={j} className="text-slate-600">— {e}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {!open && item.gaps.length > 2 && (
          <button
            onClick={() => setOpen(true)}
            className="text-xs text-vault-400 hover:text-vault-300 transition-colors"
          >
            +{item.gaps.length - 2} more
          </button>
        )}
      </div>
    </div>
  )
}

export default function KnowledgeGaps() {
  const [gaps, setGaps]       = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    agent.knowledgeGaps().then(r => setGaps(r.data.gaps)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const totalGaps = gaps.reduce((s, g) => s + g.total_gaps, 0)

  return (
    <div className="p-6 space-y-5 max-w-3xl">

      <div className="flex items-center gap-2">
        <AlertCircle size={14} className="text-slate-500" />
        <div>
          <h1 className="text-base font-semibold text-slate-100">Knowledge Gap Detector</h1>
          <p className="text-slate-500 text-sm mt-0.5">What the organization has not documented sufficiently.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="card-sm text-center">
          <div className="text-2xl font-semibold text-amber-400 tabular-nums">{loading ? '—' : totalGaps}</div>
          <div className="text-xs text-slate-500 mt-1">Total Gaps</div>
        </div>
        <div className="card-sm text-center">
          <div className="text-2xl font-semibold text-slate-300 tabular-nums">{loading ? '—' : gaps.length}</div>
          <div className="text-xs text-slate-500 mt-1">Systems Affected</div>
        </div>
      </div>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-24 rounded-lg" />
          ))}
        </div>
      )}

      <div className="space-y-3">
        {gaps.map((g, i) => <GapCard key={i} item={g} />)}
        {!loading && gaps.length === 0 && (
          <p className="text-slate-500 text-sm">No significant gaps detected.</p>
        )}
      </div>
    </div>
  )
}
