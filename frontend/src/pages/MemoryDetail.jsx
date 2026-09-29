import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { memories } from '../services/api'
import { TypeBadge, AccessBadge, ConfidenceDot } from '../components/Badges'
import { ArrowLeft, Lock, User, Tag, Calendar, Server, Link2, Hash } from 'lucide-react'

function MetaRow({ icon: Icon, label, value }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-2.5 py-2.5 border-b border-slate-800 last:border-0">
      <Icon size={12} className="text-slate-600 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-2xs text-slate-600 uppercase tracking-wider font-semibold">{label}</p>
        <p className="text-xs text-slate-300 mt-0.5 break-words">{value}</p>
      </div>
    </div>
  )
}

export default function MemoryDetail() {
  const { id }            = useParams()
  const navigate          = useNavigate()
  const [mem, setMem]     = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    memories.get(id)
      .then(r => setMem(r.data))
      .catch(e => setError(e.response?.data?.error || 'Failed to load memory'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="skeleton h-4 w-16 rounded" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card space-y-3">
          <div className="skeleton h-5 w-3/4 rounded" />
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton h-3 w-full rounded" />
            ))}
          </div>
        </div>
        <div className="card space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-8 w-full rounded" />
          ))}
        </div>
      </div>
    </div>
  )

  if (error) return (
    <div className="p-6 max-w-xl mx-auto">
      <button onClick={() => navigate(-1)} className="btn-ghost mb-4">
        <ArrowLeft size={13} /> Back
      </button>
      <div className="card border-rose-800/50 bg-rose-950/20 text-center py-12">
        <div className="w-10 h-10 bg-rose-950/60 border border-rose-800/40 rounded-full flex items-center justify-center mx-auto mb-3">
          <Lock size={16} className="text-rose-400" />
        </div>
        <p className="text-rose-300 font-semibold text-sm">Access Denied</p>
        <p className="text-slate-400 text-xs mt-2">{error}</p>
        <p className="text-slate-600 text-xs mt-1">You do not have permission to view this memory.</p>
      </div>
    </div>
  )

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <button onClick={() => navigate(-1)} className="btn-ghost">
        <ArrowLeft size={13} /> Back to Explorer
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Main content */}
        <div className="lg:col-span-2 card space-y-4">
          <div className="flex items-start gap-2 flex-wrap">
            <TypeBadge type={mem.memory_type} />
            <AccessBadge level={mem.access_level} />
            <span className="ml-auto">
              <ConfidenceDot confidence={mem.confidence} />
            </span>
          </div>

          <h1 className="text-base font-semibold text-slate-100 leading-snug">{mem.title}</h1>

          <div className="divider" />

          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{mem.content}</p>

          {mem.people?.length > 0 && (
            <div>
              <p className="section-label mb-2">People Involved</p>
              <div className="flex flex-wrap gap-1.5">
                {mem.people.map(p => (
                  <span key={p} className="flex items-center gap-1 text-xs bg-slate-800 border border-slate-700 text-slate-300 px-2 py-0.5 rounded-md">
                    <User size={10} className="text-slate-500" /> {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {mem.tags?.length > 0 && (
            <div>
              <p className="section-label mb-2">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {mem.tags.map(t => (
                  <span key={t} className="flex items-center gap-1 text-xs bg-slate-800 border border-slate-700 text-slate-500 px-2 py-0.5 rounded-md">
                    <Hash size={9} /> {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Metadata sidebar */}
        <div className="card-sm space-y-0">
          <p className="section-label mb-2">Metadata</p>
          <MetaRow icon={Calendar} label="Date"    value={mem.date} />
          <MetaRow icon={Server}   label="System"  value={mem.system} />
          <MetaRow icon={Link2}    label="Source"  value={mem.source} />
          <MetaRow icon={Calendar} label="Stored"  value={mem.created_at ? new Date(mem.created_at).toLocaleDateString() : null} />
          {mem.hindsight_id && (
            <div className="pt-2.5">
              <p className="text-2xs text-slate-600 uppercase tracking-wider font-semibold mb-1">Hindsight ID</p>
              <p className="text-2xs text-slate-700 font-mono break-all">{mem.hindsight_id}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
