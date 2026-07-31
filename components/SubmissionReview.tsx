'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  listSubmissions,
  getSubmission,
  invalidateSubmission,
  restoreSubmission,
  type AdminSubmissionRow,
  type AdminSubmissionDetail,
} from '@/lib/moderation'

const VERDICT_COLORS: Record<string, string> = {
  ACCEPTED: 'bg-emerald-50 text-emerald-700',
  WRONG_ANSWER: 'bg-rose-50 text-rose-700',
  TIME_LIMIT_EXCEEDED: 'bg-amber-50 text-amber-700',
  MEMORY_LIMIT_EXCEEDED: 'bg-amber-50 text-amber-700',
  COMPILATION_ERROR: 'bg-slate-100 text-slate-600',
  RUNTIME_ERROR: 'bg-rose-50 text-rose-700',
}

export default function SubmissionReview({ problemId }: { problemId: string }) {
  const [rows, setRows] = useState<AdminSubmissionRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [details, setDetails] = useState<Record<string, AdminSubmissionDetail>>({})
  const [pending, setPending] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listSubmissions({ problemId })
      setRows(data.submissions ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load submissions.')
    } finally {
      setLoading(false)
    }
  }, [problemId])

  useEffect(() => {
    load()
  }, [load])

  async function toggleOpen(id: string) {
    if (openId === id) {
      setOpenId(null)
      return
    }
    setOpenId(id)
    if (details[id]) return
    try {
      const detail = await getSubmission(id)
      setDetails(prev => ({ ...prev, [id]: detail }))
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not load the code.')
    }
  }

  async function toggleInvalid(row: AdminSubmissionRow) {
    if (row.invalidated) {
      if (!confirm(`Restore ${row.username}'s submission? It will count towards their score again.`)) return
      setPending(row.id)
      try {
        await restoreSubmission(row.id)
        setDetails(prev => {
          const next = { ...prev }
          delete next[row.id]
          return next
        })
        await load()
      } catch (e) {
        alert(e instanceof Error ? e.message : 'Could not restore.')
      } finally {
        setPending(null)
      }
      return
    }

    const reason = prompt(`Why is ${row.username}'s submission being invalidated?`)
    if (reason === null) return

    setPending(row.id)
    try {
      await invalidateSubmission(row.id, reason.trim())
      setDetails(prev => {
        const next = { ...prev }
        delete next[row.id]
        return next
      })
      await load()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not invalidate.')
    } finally {
      setPending(null)
    }
  }

  if (loading && rows.length === 0) {
    return <p className="text-sm text-slate-400">Loading submissions...</p>
  }

  if (error) {
    return <p className="text-sm text-rose-600">{error}</p>
  }

  if (rows.length === 0) {
    return <p className="text-sm text-slate-400">No submissions for this problem yet.</p>
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-500 mb-4">
        Invalidating removes a submission from scoring and the leaderboard straight away. The score
        recalculation will not undo it.
      </p>

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
            <div className="flex items-center gap-4 px-5 py-3.5">
              <button
                onClick={() => toggleOpen(row.id)}
                className="flex-1 flex items-center gap-4 text-left"
              >
                <div className="w-40 shrink-0">
                  <p className="text-sm font-semibold text-slate-800">{row.username}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(row.submittedAt).toLocaleString()}
                  </p>
                </div>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                    VERDICT_COLORS[row.verdict] || 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {row.verdict?.replace(/_/g, ' ') || row.status}
                </span>
                <span className="text-xs text-slate-500 uppercase">{row.language}</span>
                <span className="text-sm text-slate-700 tabular-nums">{row.score} pts</span>
                {row.invalidated && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-rose-100 text-rose-700">
                    Invalidated
                  </span>
                )}
              </button>

              <button
                onClick={() => toggleInvalid(row)}
                disabled={pending === row.id}
                className={`px-3 py-1.5 text-xs font-bold border rounded-lg transition-colors disabled:opacity-40 ${
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
