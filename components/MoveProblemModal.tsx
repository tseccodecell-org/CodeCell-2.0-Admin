'use client'

import { useState } from 'react'
import type { Week } from '@/lib/types'

// most weeks are titled "Week 3" already, so prefixing the number again reads
// as "Week 3 - Week 3"
function weekLabel(w: Week) {
  const prefix = w.weekNumber ? `Week ${w.weekNumber}` : ''
  const title = (w.title || '').trim()
  if (!prefix) return title || 'Untitled week'
  if (!title || title.toLowerCase() === prefix.toLowerCase()) return prefix
  return `${prefix} - ${title}`
}

export default function MoveProblemModal({
  problemName, weeks, currentWeekId, onCancel, onConfirm,
}: {
  problemName: string
  weeks: Week[]
  currentWeekId: string
  onCancel: () => void
  onConfirm: (weekId: string) => Promise<void>
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const options = weeks.filter(w => w.id !== currentWeekId)

  async function confirm() {
    if (!selected) return
    setBusy(true)
    setError(null)
    try {
      await onConfirm(selected)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not move the problem.')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Move to another week</h2>
          <p className="text-sm text-slate-500 mt-1">
            &ldquo;{problemName}&rdquo; will be taken out of this week and added to the end of the one you pick.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {options.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">
              There is no other week to move it to yet.
            </p>
          ) : options.map(w => (
            <button
              key={w.id}
              onClick={() => setSelected(w.id)}
              className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                selected === w.id
                  ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-slate-800 truncate">
                  {weekLabel(w)}
                </span>
                <span className="text-xs font-semibold text-slate-500 shrink-0">
                  {w.problems.length} {w.problems.length === 1 ? 'problem' : 'problems'}
                </span>
              </div>
              {w.description && (
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{w.description}</p>
              )}
            </button>
          ))}
        </div>

        {error && (
          <div className="mx-6 mb-2 rounded-lg bg-rose-50 border border-rose-200 px-4 py-3">
            <p className="text-sm text-rose-700">{error}</p>
          </div>
        )}

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={confirm}
            disabled={!selected || busy}
            className="px-4 py-2 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy ? 'Moving...' : 'Move problem'}
          </button>
        </div>
      </div>
    </div>
  )
}
