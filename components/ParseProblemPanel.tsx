'use client'

import { useEffect, useState } from 'react'
import { parseProblem, parseStatus, type ParsedProblem } from '@/lib/parse'

type StyleSource = 'existing' | 'custom' | 'none'

export default function ParseProblemPanel({
  weekId, onParsed,
}: {
  weekId?: string
  onParsed: (parsed: ParsedProblem) => void
}) {
  const [available, setAvailable] = useState<boolean | null>(null)
  const [open, setOpen] = useState(false)
  const [rawText, setRawText] = useState('')
  const [source, setSource] = useState<StyleSource>('existing')
  const [styleContext, setStyleContext] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    parseStatus()
      .then(s => { if (alive) setAvailable(s.available) })
      .catch(() => { if (alive) setAvailable(false) })
    return () => { alive = false }
  }, [])

  // nothing is shown at all when the server has no key configured
  if (available === false) return null

  async function run() {
    if (!rawText.trim()) {
      setError('Paste the problem text first.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const parsed = await parseProblem({
        rawText,
        weekId,
        useExistingStyle: source === 'existing',
        styleContext: source === 'custom' ? styleContext : undefined,
      })
      onParsed(parsed)
      setOpen(false)
      setRawText('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not parse that text.')
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        disabled={available === null}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-colors disabled:opacity-50"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        Import from text
      </button>
    )
  }

  return (
    <div className="w-full bg-white border border-slate-200 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Import from text</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Fills the form below. Nothing is saved until you press save yourself.
          </p>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="text-xs font-semibold text-slate-400 hover:text-slate-600"
        >
          Close
        </button>
      </div>

      <textarea
        value={rawText}
        onChange={e => setRawText(e.target.value)}
        rows={9}
        placeholder="Paste the whole problem here, statement, formats, constraints and samples."
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 font-mono"
      />

      <div>
        <p className="text-xs font-bold text-slate-600 mb-1.5">Match style using</p>
        <div className="flex flex-wrap gap-1.5">
          {([
            ['existing', 'Problems already added'],
            ['custom', 'My own instructions'],
            ['none', 'Nothing'],
          ] as [StyleSource, string][]).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setSource(value)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                source === value
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {source === 'custom' && (
        <textarea
          value={styleContext}
          onChange={e => setStyleContext(e.target.value)}
          rows={4}
          placeholder="How should it read? For example: keep it short, write bounds as 1 <= n <= 10^5, no story framing."
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400"
        />
      )}

      {error && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2">
          <p className="text-xs text-rose-700">{error}</p>
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        <button
          onClick={() => setOpen(false)}
          disabled={busy}
          className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={run}
          disabled={busy || !rawText.trim()}
          className="px-3 py-1.5 text-xs font-bold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy ? 'Reading...' : 'Fill the form'}
        </button>
      </div>
    </div>
  )
}
