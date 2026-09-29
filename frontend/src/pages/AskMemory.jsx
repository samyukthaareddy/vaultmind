import { useState } from 'react'
import { agent } from '../services/api'
import { Send, Brain, ChevronDown, ChevronUp, AlertCircle, BookOpen, Users, GitBranch, Lock } from 'lucide-react'
import { TypeBadge, ConfidenceDot } from '../components/Badges'

const DEMO_QUESTIONS = [
  'Why do we use Redis instead of Kafka?',
  'What happened during Incident 184?',
  'What mistakes should I avoid in the payment service?',
  'Who was Alex Morgan and what did he warn us about?',
  'Why does the payment service use exponential backoff?',
  'What should I know before modifying the notification service?',
  'Have we had any fraud detection failures?',
  'What alternatives were considered for the notification queue?',
]

function MemoryTrace({ trace }) {
  if (!trace?.length) return null
  return (
    <div className="space-y-2 pt-3">
      {trace.map((step, i) => (
        <div key={i} className="flex gap-3">
          <div className="flex flex-col items-center shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-vault-500 mt-1.5" />
            {i < trace.length - 1 && <div className="w-px flex-1 bg-slate-800 mt-1" />}
          </div>
          <div className="pb-2 min-w-0">
            <p className="text-xs font-medium text-vault-400">{step.step}</p>
            <p className="text-xs text-slate-400 mt-0.5">{step.memory}</p>
            {step.content && (
              <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{step.content}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function Answer({ result }) {
  const [showTrace, setShowTrace] = useState(false)

  return (
    <div className="card space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain size={13} className="text-vault-400" />
          <span className="text-xs font-medium text-vault-400">VaultMind Answer</span>
        </div>
        <ConfidenceDot confidence={result.confidence} />
      </div>

      {/* Answer text */}
      <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{result.answer}</p>

      {/* Reasoning */}
      {result.reasoning && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-md p-3">
          <p className="section-label mb-1.5">Reasoning</p>
          <p className="text-xs text-slate-400 leading-relaxed">{result.reasoning}</p>
        </div>
      )}

      {/* Meta chips */}
      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
        {result.people_involved?.length > 0 && (
          <span className="flex items-center gap-1">
            <Users size={11} /> {result.people_involved.join(', ')}
          </span>
        )}
        {result.related_incidents?.length > 0 && (
          <span className="flex items-center gap-1">
            <AlertCircle size={11} /> {result.related_incidents.join(', ')}
          </span>
        )}
        {result.alternatives_considered?.length > 0 && (
          <span className="flex items-center gap-1">
            <GitBranch size={11} /> {result.alternatives_considered.join(', ')}
          </span>
        )}
        <span className="ml-auto text-slate-600 tabular-nums">{result.memories_used} memories used</span>
        {result.denied_memories > 0 && (
          <span className="flex items-center gap-1 text-amber-500">
            <Lock size={11} /> {result.denied_memories} restricted
          </span>
        )}
      </div>

      {/* Sources */}
      {result.sources?.length > 0 && (
        <div className="border-t border-slate-800 pt-3">
          <p className="section-label mb-2 flex items-center gap-1.5">
            <BookOpen size={10} /> Sources
          </p>
          <div className="flex flex-wrap gap-1.5">
            {result.sources.map((s, i) => (
              <span
                key={i}
                className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-2 py-0.5 rounded-md cursor-default transition-colors"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Caveat */}
      {result.caveat && (
        <div className="flex gap-2 text-xs text-amber-400 bg-amber-950/30 border border-amber-800/40 rounded-md p-2.5">
          <AlertCircle size={12} className="shrink-0 mt-0.5" />
          {result.caveat}
        </div>
      )}

      {/* Memory trace toggle */}
      {result.memory_trace?.length > 0 && (
        <>
          <button
            onClick={() => setShowTrace(v => !v)}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            {showTrace ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {showTrace ? 'Hide' : 'Show'} memory trace ({result.memory_trace.length} steps)
          </button>
          {showTrace && (
            <div className="border-t border-slate-800">
              <MemoryTrace trace={result.memory_trace} />
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function AskMemory() {
  const [question, setQuestion] = useState('')
  const [result, setResult]     = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [history, setHistory]   = useState([])

  const ask = async (q) => {
    if (!q?.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const r = await agent.ask(q)
      setResult(r.data)
      setHistory(h => [{ question: q, result: r.data }, ...h.slice(0, 9)])
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to get answer')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e) => { e.preventDefault(); ask(question) }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-base font-semibold text-slate-100">Ask Institutional Memory</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Query decisions, incidents, and lessons learned across NovaPay's knowledge base.
        </p>
      </div>

      {/* Command-bar input */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 focus-within:border-vault-500 focus-within:ring-1 focus-within:ring-vault-500 transition-all">
          <Brain size={15} className="text-slate-500 shrink-0" />
          <input
            className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 text-sm focus:outline-none"
            placeholder="Why did we choose Redis? What happened in INC-184? What should I know before…"
            value={question}
            onChange={e => setQuestion(e.target.value)}
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="btn-primary text-xs py-1.5 px-3 shrink-0"
          >
            {loading
              ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Send size={12} />
            }
            {loading ? 'Recalling…' : 'Ask'}
          </button>
        </div>
      </form>

      {/* Suggested questions */}
      <div>
        <p className="section-label mb-2">Suggested questions</p>
        <div className="flex flex-wrap gap-1.5">
          {DEMO_QUESTIONS.map(q => (
            <button
              key={q}
              onClick={() => { setQuestion(q); ask(q) }}
              className="text-xs bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 text-slate-400 hover:text-slate-200 px-2.5 py-1 rounded-md transition-colors duration-150"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-950/40 border border-rose-800/40 rounded-md px-3 py-2.5">
          <AlertCircle size={13} className="shrink-0" />
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="card space-y-3">
          <div className="flex items-center gap-2">
            <Brain size={13} className="text-vault-400 animate-pulse" />
            <span className="text-xs text-slate-500">Recalling from Hindsight memory…</span>
          </div>
          <div className="space-y-2">
            <div className="skeleton h-3 w-full rounded" />
            <div className="skeleton h-3 w-5/6 rounded" />
            <div className="skeleton h-3 w-4/6 rounded" />
          </div>
        </div>
      )}

      {/* Answer */}
      {result && <Answer result={result} />}

      {/* History */}
      {history.length > 1 && (
        <div className="space-y-1.5">
          <p className="section-label">Previous questions</p>
          {history.slice(1).map((h, i) => (
            <button
              key={i}
              onClick={() => { setQuestion(h.question); setResult(h.result) }}
              className="w-full text-left text-xs bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-md px-3 py-2 text-slate-400 hover:text-slate-300 transition-colors duration-150"
            >
              {h.question}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
