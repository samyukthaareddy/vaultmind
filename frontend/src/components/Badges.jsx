const TYPE_STYLES = {
  DECISION:             'bg-blue-950/60 text-blue-300 border border-blue-800/50',
  DECISION_REASON:      'bg-blue-950/40 text-blue-400 border border-blue-800/40',
  INCIDENT:             'bg-rose-950/60 text-rose-300 border border-rose-800/50',
  FAILURE:              'bg-rose-950/40 text-rose-400 border border-rose-800/40',
  WORKAROUND:           'bg-amber-950/60 text-amber-300 border border-amber-800/50',
  LESSON_LEARNED:       'bg-emerald-950/60 text-emerald-300 border border-emerald-800/50',
  CUSTOMER_REQUIREMENT: 'bg-violet-950/60 text-violet-300 border border-violet-800/50',
  SYSTEM_KNOWLEDGE:     'bg-cyan-950/60 text-cyan-300 border border-cyan-800/50',
  PERSON_KNOWLEDGE:     'bg-orange-950/60 text-orange-300 border border-orange-800/50',
  RISK:                 'bg-rose-950/60 text-rose-300 border border-rose-800/50',
  FACT:                 'bg-slate-800 text-slate-300 border border-slate-700',
  PROCESS:              'bg-teal-950/60 text-teal-300 border border-teal-800/50',
  CONSTRAINT:           'bg-amber-950/60 text-amber-300 border border-amber-800/50',
  PREFERENCE:           'bg-indigo-950/60 text-indigo-300 border border-indigo-800/50',
}

const ACCESS_STYLES = {
  PUBLIC:       'bg-emerald-950/50 text-emerald-400 border border-emerald-800/40',
  INTERNAL:     'bg-blue-950/50 text-blue-400 border border-blue-800/40',
  TEAM_ONLY:    'bg-amber-950/50 text-amber-400 border border-amber-800/40',
  CONFIDENTIAL: 'bg-orange-950/50 text-orange-400 border border-orange-800/40',
  RESTRICTED:   'bg-rose-950/50 text-rose-400 border border-rose-800/40',
}

const CONFIDENCE_STYLES = {
  High:                  'text-emerald-400',
  Medium:                'text-amber-400',
  Low:                   'text-orange-400',
  'Insufficient evidence':'text-rose-400',
}

const RISK_STYLES = {
  HIGH:   'bg-rose-950/60 text-rose-300 border border-rose-800/50',
  MEDIUM: 'bg-amber-950/60 text-amber-300 border border-amber-800/50',
  LOW:    'bg-emerald-950/60 text-emerald-300 border border-emerald-800/50',
}

export function TypeBadge({ type }) {
  const label = type?.replace(/_/g, ' ')
  return (
    <span className={`badge-sm ${TYPE_STYLES[type] || 'bg-slate-800 text-slate-300 border border-slate-700'}`}>
      {label}
    </span>
  )
}

export function AccessBadge({ level }) {
  return (
    <span className={`badge-sm ${ACCESS_STYLES[level] || 'bg-slate-800 text-slate-300 border border-slate-700'}`}>
      {level}
    </span>
  )
}

export function RiskBadge({ level }) {
  return (
    <span className={`badge-sm ${RISK_STYLES[level] || 'bg-slate-800 text-slate-300 border border-slate-700'}`}>
      {level}
    </span>
  )
}

export function ConfidenceDot({ confidence }) {
  const style = CONFIDENCE_STYLES[confidence] || 'text-slate-400'
  const dot = confidence === 'High' ? '●' : confidence === 'Medium' ? '◐' : '○'
  return (
    <span className={`text-xs font-medium ${style} flex items-center gap-1`}>
      <span className="text-2xs">{dot}</span> {confidence}
    </span>
  )
}

export function ResultBadge({ result }) {
  return result === 'ALLOWED'
    ? <span className="badge-sm bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">ALLOWED</span>
    : <span className="badge-sm bg-rose-950/60 text-rose-400 border border-rose-800/40">DENIED</span>
}
