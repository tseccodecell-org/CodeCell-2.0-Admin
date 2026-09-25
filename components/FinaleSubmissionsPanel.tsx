'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import SubmissionList from '@/components/SubmissionList'
import ReasonModal from '@/components/ReasonModal'
import Toast, { type ToastState } from '@/components/Toast'
import {
  getSubmission,
  invalidateSubmission,
  listSubmissions,
  restoreSubmission,
  type AdminSubmissionDetail,
  type AdminSubmissionRow,
} from '@/lib/moderation'
import type { UserLabel } from '@/lib/useUserNames'

const PAGE_SIZE = 50

type VerdictFilter = 'all' | 'accepted' | 'invalidated'

type Action =
  | { kind: 'invalidate'; row: AdminSubmissionRow }
  | { kind: 'restore'; row: AdminSubmissionRow }

export interface SubmissionsFocus {
  userId: number
  nonce: number
}

export default function FinaleSubmissionsPanel({
  weekId,
  participants,
  names,
  focus,
  embedded = false,
}: {
  weekId: string
  participants: number[]
  names: Record<number, UserLabel>
  focus: SubmissionsFocus | null
  embedded?: boolean
}) {
  const [open, setOpen] = useState(embedded)
  const [userId, setUserId] = useState<number | 'all'>('all')
  const [verdict, setVerdict] = useState<VerdictFilter>('all')
  const [rows, setRows] = useState<AdminSubmissionRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [details, setDetails] = useState<Record<string, AdminSubmissionDetail>>({})
  const [pending, setPending] = useState<string | null>(null)
  const [action, setAction] = useState<Action | null>(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const load = useCallback(
    async (offset = 0) => {
      setLoading(true)
      setError(null)
      try {
        const result = await listSubmissions({
          weekId,
          userId: userId === 'all' ? undefined : userId,
          verdict: verdict === 'accepted' ? 'ACCEPTED' : undefined,
          invalidated: verdict === 'invalidated' ? true : undefined,
          limit: PAGE_SIZE,
          offset,
        })
        const batch = result.submissions ?? []
        setRows(prev => (offset === 0 ? batch : [...prev, ...batch]))
        setTotal(result.total ?? batch.length)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load submissions.')
      } finally {
        setLoading(false)
      }
    },
    [weekId, userId, verdict]
  )

  useEffect(() => {
    if (open) load(0)
  }, [open, load])

  useEffect(() => {
    if (!focus) return
    setUserId(focus.userId)
    setVerdict('all')
    setOpen(true)
    if (!embedded) rootRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
  }, [focus, embedded])

  async function toggleOpen(rowId: string) {
    if (openId === rowId) {
      setOpenId(null)
      return
    }
    setOpenId(rowId)
    if (details[rowId]) return
    try {
      const detail = await getSubmission(rowId)
      setDetails(prev => ({ ...prev, [rowId]: detail }))
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : 'Could not load the code.', kind: 'error' })
    }
  }

  async function runAction(reason: string) {
    if (!action) return
    setBusy(true)
    setPending(action.row.id)
    try {
      if (action.kind === 'invalidate') {
        await invalidateSubmission(action.row.id, reason)
        setToast({ message: 'Submission invalidated. Standings update on their next refresh.', kind: 'success' })
      } else {
        await restoreSubmission(action.row.id)
        setToast({ message: 'Submission restored', kind: 'success' })
      }
      setDetails(prev => {
        const next = { ...prev }
        delete next[action.row.id]
        return next
      })
      setAction(null)
      await load(0)
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : 'That did not work. Try again.', kind: 'error' })
    } finally {
      setBusy(false)
      setPending(null)
    }
  }

  const who = (id: number) => names[id]?.name ?? `User #${id}`
  const invalidatedCount = rows.filter(r => r.invalidated).length

  return (
    <div ref={rootRef} className={embedded ? '' : 'border-t border-slate-100 pt-4 scroll-mt-4'}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => { if (!embedded) setOpen(o => !o) }}
          className={`text-xs font-bold text-slate-700 ${embedded ? 'cursor-default' : 'hover:text-slate-900'}`}
        >
          {embedded ? 'Submissions' : `${open ? 'Hide' : 'Review'} submissions`}
          {open && !loading && (
            <span className="font-normal text-slate-500">
              {' '}
              ({total} {total === 1 ? 'submission' : 'submissions'}
              {invalidatedCount > 0 ? `, ${invalidatedCount} invalidated on this page` : ''})
            </span>
          )}
        </button>

        {open && (
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <label className="sr-only" htmlFor={`sub-user-${weekId}`}>Participant</label>
            <select
              id={`sub-user-${weekId}`}
              value={userId}
              onChange={e => setUserId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="min-w-0 flex-1 sm:flex-none px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-700"
            >
              <option value="all">All participants</option>
              {participants.map(id => (
                <option key={id} value={id}>
                  {who(id)}
                </option>
              ))}
            </select>
            <div className="flex rounded-lg border border-slate-200 overflow-hidden" role="group" aria-label="Filter by verdict">
              {(['all', 'accepted', 'invalidated'] as VerdictFilter[]).map(v => (
                <button
                  key={v}
                  onClick={() => setVerdict(v)}
                  aria-pressed={verdict === v}
                  className={`px-2.5 py-1.5 text-xs font-semibold ${
                    verdict === v ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {v === 'all' ? 'All' : v === 'accepted' ? 'Accepted' : 'Invalidated'}
                </button>
              ))}
            </div>
            <button
              onClick={() => load(0)}
              disabled={loading}
              className="px-2.5 py-1.5 text-xs font-bold border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        )}
      </div>

      {open && (
        <div className="mt-3 rounded-xl border border-slate-200 overflow-hidden bg-slate-50/40">
          {error && <p role="alert" className="px-6 py-4 text-xs text-rose-600">{error}</p>}
          {!error && loading && rows.length === 0 ? (
            <p className="px-6 py-8 text-sm text-slate-400">Loading submissions...</p>
          ) : (
            !error && (
              <SubmissionList
                rows={rows}
                openId={openId}
                details={details}
                pending={pending}
                onToggleOpen={toggleOpen}
                onToggleInvalid={row => setAction(row.invalidated ? { kind: 'restore', row } : { kind: 'invalidate', row })}
              />
            )
          )}
          {rows.length < total && (
            <div className="border-t border-slate-200 px-6 py-3">
              <button
                onClick={() => load(rows.length)}
                disabled={loading}
                className="text-xs font-bold text-slate-700 hover:text-slate-900 disabled:opacity-50"
              >
                {loading ? 'Loading...' : `Show more (${total - rows.length} left)`}
              </button>
            </div>
          )}
        </div>
      )}

      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

      {action && (
        <ReasonModal
          key={action.kind}
          title={action.kind === 'invalidate' ? 'Invalidate this submission?' : 'Restore this submission?'}
          body={
            action.kind === 'invalidate'
              ? `${action.row.username}'s ${action.row.verdict.toLowerCase().replace(/_/g, ' ')} on ${action.row.problemName} will stop counting. If it was their accept for that problem, their score and the standings are recalculated.`
              : `${action.row.username}'s submission on ${action.row.problemName} counts again and their score is recalculated.`
          }
          label={action.kind === 'invalidate' ? 'Reason' : undefined}
          placeholder={action.kind === 'invalidate' ? 'e.g. Matches another finalist’s submission' : undefined}
          confirmLabel={action.kind === 'invalidate' ? 'Invalidate' : 'Restore'}
          tone={action.kind === 'invalidate' ? 'danger' : 'neutral'}
          requireReason={action.kind === 'invalidate'}
          busy={busy}
          onConfirm={runAction}
          onCancel={() => {
            if (!busy) setAction(null)
          }}
        />
      )}
    </div>
  )
}
