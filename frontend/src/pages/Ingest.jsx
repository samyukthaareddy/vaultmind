import { useState } from 'react'
import { documents } from '../services/api'
import { Upload, CheckCircle, AlertCircle, FileText, Shield } from 'lucide-react'

const TEMPLATES = {
  'Incident Report': `# Incident Report: INC-XXX\n\nDate: 2025-01\nSystem: Payment Service\nSeverity: High\n\n## What happened\nDescribe the incident here.\n\n## Root cause\nExplain the root cause.\n\n## Resolution\nWhat was done to fix it.\n\n## Lessons learned\nWhat should we remember for the future.`,
  'Architecture Decision': `# ADR-XXX: Title\n\nDate: 2025-01\nSystem: \nStatus: Accepted\n\n## Context\nWhy was this decision needed?\n\n## Decision\nWhat was decided?\n\n## Alternatives considered\n- Option A\n- Option B\n\n## Consequences\nWhat are the implications?`,
  'Handover Notes': `# Handover Notes — [Name]\n\nDate: 2025-06\nRole: Senior Engineer\n\n## Systems I owned\n- Payment Service\n- Notification Service\n\n## Critical warnings\n1. Do not change X because Y\n2. The workaround for Z exists because...\n\n## Undocumented knowledge\nThings that aren't written down anywhere else.\n\n## Contacts\nWho to call when things break.`,
}

const DOC_TYPES = ['TEXT', 'INCIDENT_REPORT', 'ADR', 'HANDOVER', 'MEETING_NOTES', 'SOP', 'CUSTOMER_REQ']

export default function Ingest() {
  const [title, setTitle]     = useState('')
  const [content, setContent] = useState('')
  const [docType, setDocType] = useState('TEXT')
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState(null)
  const [error, setError]     = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const r = await documents.upload({ title, content, doc_type: docType })
      setResult(r.data)
      setTitle('')
      setContent('')
    } catch (e) {
      const err = e.response?.data
      setError(err?.findings
        ? `${err.error}: ${Object.keys(err.findings).join(', ')} detected`
        : err?.error || 'Upload failed'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-base font-semibold text-slate-100">Ingest Knowledge</h1>
        <p className="text-slate-500 text-sm mt-0.5">Upload documents to extract and store memories in Hindsight.</p>
      </div>

      {/* Templates */}
      <div>
        <p className="section-label mb-2">Quick templates</p>
        <div className="flex gap-2 flex-wrap">
          {Object.keys(TEMPLATES).map(t => (
            <button
              key={t}
              onClick={() => { setTitle(t); setContent(TEMPLATES[t]) }}
              className="btn-secondary text-xs py-1.5"
            >
              <FileText size={12} /> {t}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Document Title</label>
            <input
              className="input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Alex Morgan Handover Notes"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Document Type</label>
            <select className="input" value={docType} onChange={e => setDocType(e.target.value)}>
              {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Content</label>
          <textarea
            className="input font-mono text-xs min-h-52 resize-y"
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Paste document content here…"
            required
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 text-xs text-rose-400 bg-rose-950/40 border border-rose-800/40 rounded-md px-3 py-2.5">
            <AlertCircle size={13} className="shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <button className="btn-primary" disabled={loading}>
          {loading
            ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Extracting memories…</>
            : <><Upload size={13} /> Ingest Document</>
          }
        </button>
      </form>

      {result && (
        <div className="card border-emerald-800/40 bg-emerald-950/20">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={14} className="text-emerald-400" />
            <span className="text-emerald-300 font-medium text-sm">Document ingested successfully</span>
          </div>
          <p className="text-xs text-slate-400">
            Extracted <span className="text-slate-200 font-medium">{result.memories_extracted}</span> memories and stored them in Hindsight.
          </p>
          <p className="text-2xs text-slate-600 font-mono mt-1">doc_id: {result.document?.doc_id}</p>
        </div>
      )}

      {/* Security notice */}
      <div className="flex items-start gap-2.5 px-3.5 py-3 bg-slate-900/50 border border-slate-800 rounded-lg">
        <Shield size={13} className="text-slate-600 mt-0.5 shrink-0" />
        <div className="text-xs text-slate-600 space-y-0.5">
          <p className="text-slate-500 font-medium">Security scanning enabled</p>
          <p>Documents are scanned for API keys, passwords, tokens, PII, and financial data before ingestion. Sensitive content will be rejected.</p>
        </div>
      </div>
    </div>
  )
}
