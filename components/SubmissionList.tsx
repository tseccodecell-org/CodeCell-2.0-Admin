'use client'

import type { AdminSubmissionDetail, AdminSubmissionRow } from '@/lib/moderation'

export const VERDICT_STYLE: Record<string, string> = {
  ACCEPTED: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60',
  WRONG_ANSWER: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/60',
  TIME_LIMIT_EXCEEDED: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/60',
  MEMORY_LIMIT_EXCEEDED: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/60',
  RUNTIME_ERROR: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200/60',
  COMPILATION_ERROR: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200/60',
}

export const VERDICT_SHORT: Record<string, string> = {
  ACCEPTED: 'AC',
  WRONG_ANSWER: 'WA',
  TIME_LIMIT_EXCEEDED: 'TLE',
  MEMORY_LIMIT_EXCEEDED: 'MLE',
  RUNTIME_ERROR: 'RE',
  COMPILATION_ERROR: 'CE',
}

interface SubmissionListProps {
  rows: AdminSubmissionRow[]
  openId: string | null
  details: Record<string, AdminSubmissionDetail>
  pending: string | null
  onToggleOpen: (id: string) => void
  onToggleInvalid: (row: AdminSubmissionRow) => void
}

export default function SubmissionList({ rows, openId, details, pending, onToggleOpen, onToggleInvalid }: SubmissionListProps) {
  if (rows.length === 0) {
    return <p className="px-6 py-8 text-sm text-slate-400">No submissions match these filters.</p>
  }

  return (
    <div className="flex flex-col gap-2 px-4 sm:px-6 py-4">
      {rows.map(row => {
        const isOpen = openId === row.id
        const detail = details[row.id]

        return (
          <div
            key={row.id}
            className={`rounded-xl border overflow-hidden ${
              row.invalidated ? 'border-rose-200 bg-rose-50/40' : 'border-slate-200 bg-white'
            }`}
          >
            <div className="flex flex-wrap items-center gap-4 px-4 sm:px-5 py-3.5">
              <button
                onClick={() => onToggleOpen(row.id)}
                className="flex-1 flex flex-wrap items-center gap-x-4 gap-y-2 text-left min-w-0"
              >
                <div className="min-w-0 flex-1 basis-full sm:basis-auto">
                  <p className="text-sm font-semibold text-slate-800 truncate">{row.problemName}</p>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">
                    {row.weekTitle ? `${row.weekTitle} - ` : ''}{new Date(row.submittedAt).toLocaleString()}
                  </p>
                </div>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-md shrink-0 ${
                    VERDICT_STYLE[row.verdict] || 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {row.verdict?.replace(/_/g, ' ') || row.status}
                </span>
                <span className="text-xs text-slate-500 uppercase shrink-0 w-16">{row.language}</span>
                <span className="text-sm text-slate-700 tabular-nums shrink-0 w-16 text-right">{row.score} pts</span>
                {row.invalidated && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 shrink-0">
                    Invalidated
                  </span>
                )}
              </button>

              <button
                onClick={() => onToggleInvalid(row)}
                disabled={pending === row.id}
                className={`px-3 py-1.5 text-xs font-bold border rounded-lg transition-colors disabled:opacity-40 shrink-0 ${
                  row.invalidated
                    ? 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    : 'border-slate-200 text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600'
                }`}
              >
                {pending === row.id ? 'Saving...' : row.invalidated ? 'Restore' : 'Invalidate'}
              </button>
            </div>

            {isOpen && (
              <div className="border-t border-slate-100 px-5 py-4">
                {!detail && <p className="text-xs text-slate-400">Loading code...</p>}
                {detail && (
                  <>
                    {detail.invalidatedReason && (
                      <p className="text-xs text-rose-700 mb-2">
                        Reason: {detail.invalidatedReason}
                      </p>
                    )}
                    <pre className="max-h-96 overflow-auto rounded-lg bg-slate-900 p-4 text-xs leading-relaxed text-slate-100">
                      {detail.sourceCode}
                    </pre>
                  </>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
