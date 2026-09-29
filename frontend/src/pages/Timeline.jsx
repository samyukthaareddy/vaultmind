import { useEffect, useState } from 'react'
import { memories } from '../services/api'
import { useNavigate } from 'react-router-dom'
import { TypeBadge } from '../components/Badges'
import { Clock } from 'lucide-react'

function groupByYear(events) {
  const groups = {}
  events.forEach(e => {
    const year = e.date?.slice(0, 4) || 'Undated'
    if (!groups[year]) groups[year] = []
    groups[year].push(e)
  })
  return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a))
}

function SkeletonEvents() {
  return Array.from({ length: 4 }).map((_, i) => (
    <div key={i} className="flex gap-4 ml-8">
      <div className="skeleton h-16 flex-1 rounded-lg" />
    </div>
  ))
}

export default function Timeline() {
  const [events, setEvents]   = useState([])
  const [loading, setLoading] = useState(true)
  const navigate              = useNavigate()

  useEffect(() => {
    memories.timeline().then(r => setEvents(r.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const grouped = groupByYear(events)

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-slate-500" />
          <h1 className="text-base font-semibold text-slate-100">Memory Timeline</h1>
        </div>
        <p className="text-slate-500 text-sm mt-0.5">NovaPay organizational history — decisions, incidents, and lessons.</p>
      </div>

      {loading && (
        <div className="space-y-3">
          <SkeletonEvents />
        </div>
      )}

      <div className="relative">
        {/* Vertical spine */}
        <div className="absolute left-[5.5rem] top-0 bottom-0 w-px bg-slate-800" />

        {grouped.map(([year, yearEvents]) => (
          <div key={year} className="mb-8">
            {/* Year marker */}
            <div className="flex items-center gap-4 mb-3">
              <span className="text-xs font-semibold text-vault-400 font-mono w-16 text-right shrink-0">
                {year}
              </span>
              <div className="w-2.5 h-2.5 rounded-full bg-vault-600 border-2 border-slate-950 z-10 shrink-0" />
            </div>

            {/* Events */}
            <div className="space-y-2 ml-24">
              {yearEvents.map(ev => (
                <button
                  key={ev.memory_id}
                  onClick={() => navigate(`/memories/${ev.memory_id}`)}
                  className="w-full text-left card hover:border-slate-700 hover:bg-slate-800/60 transition-colors duration-150 group"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <TypeBadge type={ev.memory_type} />
                        {ev.date && (
                          <span className="text-2xs text-slate-600 font-mono">{ev.date}</span>
                        )}
                      </div>
                      <p className="text-sm text-slate-300 group-hover:text-slate-100 transition-colors leading-snug">
                        {ev.title}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        {ev.system && (
                          <span className="text-2xs text-slate-600">{ev.system}</span>
                        )}
                        {ev.people?.length > 0 && (
                          <span className="text-2xs text-slate-600">{ev.people.join(', ')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}

        {!loading && events.length === 0 && (
          <div className="ml-24 text-slate-500 text-sm">
            No timeline events found. Ingest documents to populate the timeline.
          </div>
        )}
      </div>
    </div>
  )
}
