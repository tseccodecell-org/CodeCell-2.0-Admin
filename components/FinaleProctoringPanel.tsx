'use client'

import { Fragment, useCallback, useEffect, useState, type ReactNode } from 'react'
import ReasonModal from '@/components/ReasonModal'
import Toast, { type ToastState } from '@/components/Toast'
import { AuthError } from '@/lib/auth'
import {
  getProctorView,
  lockParticipant,
  setStrikeLimit,
  unlockParticipant,
  type ProctorParticipant,
  type ProctorView,
} from '@/lib/finales'

const REFRESH_MS = 10000

const KIND_LABEL: Record<string, string> = {
  TAB_SWITCH: 'Switched tab or app',
  FULLSCREEN_EXIT: 'Left full screen',
}

export interface Seat {
  userId: number
  name?: string
  username?: string
}

function timeAgo(iso: string | undefined, now: number): string {
  if (!iso) return ''
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000))
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function sortParticipants(list: ProctorParticipant[]): ProctorParticipant[] {
  return [...list].sort((a, b) => {
    if (a.locked !== b.locked) return a.locked ? -1 : 1
    if (a.strikes !== b.strikes) return b.strikes - a.strikes
    return a.name.localeCompare(b.name)
  })
}

function buildRoster(view: ProctorView | null, seats: Seat[] | undefined): ProctorParticipant[] {
  if (!seats) return view?.participants ?? []
  const byId = new Map((view?.participants ?? []).map(p => [p.userId, p]))
  return seats.map(seat => {
    const known = byId.get(seat.userId)
    const name = seat.name ?? known?.name ?? `User #${seat.userId}`
    const username = seat.username ?? known?.username ?? ''
    if (known) return { ...known, name, username }
    return { userId: seat.userId, name, username, strikes: 0, locked: false, events: [] }
  })
}

function StrikeMeter({ strikes, limit }: { strikes: number; limit: number }) {
  if (limit <= 0 || limit > 10) {
    return (
      <span className={`font-mono tabular-nums ${strikes > 0 ? 'font-bold text-rose-600' : 'text-slate-400'}`}>{strikes}</span>
    )
  }
  return (
    <div className="flex items-center gap-2" aria-label={`${strikes} of ${limit} strikes`}>
      <div className="flex gap-1">
        {Array.from({ length: limit }, (_, i) => (
          <span
            key={i}
            className={`h-2 w-4 rounded-sm ${i < strikes ? (strikes >= limit ? 'bg-rose-600' : 'bg-amber-500') : 'bg-slate-200'}`}
          />
        ))}
      </div>
      <span className={`font-mono text-xs tabular-nums ${strikes > 0 ? 'font-bold text-slate-700' : 'text-slate-400'}`}>
        {strikes}/{limit}
      </span>
    </div>
  )
}

export default function FinaleProctoringPanel({
  weekId,
  seats,
  toolbar,
  rowActions,
  refreshKey = 0,
}: {
  weekId: string
  seats?: Seat[]
  toolbar?: ReactNode
  rowActions?: (p: ProctorParticipant) => ReactNode
  refreshKey?: number
}) {
  const [view, setView] = useState<ProctorView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [unavailable, setUnavailable] = useState(false)
  const [updatedAt, setUpdatedAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [limitDraft, setLimitDraft] = useState('')
  const [savingLimit, setSavingLimit] = useState(false)
  const [openLog, setOpenLog] = useState<number | null>(null)
  const [locking, setLocking] = useState<ProctorParticipant | null>(null)
  const [pendingUser, setPendingUser] = useState<number | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)

  const load = useCallback(async () => {
    try {
      const next = await getProctorView(weekId)
      setView(next)
      setError(null)
      setUnavailable(false)
      setUpdatedAt(Date.now())
      setLimitDraft(prev => (prev === '' ? String(next.strikeLimit) : prev))
    } catch (e) {
      if (e instanceof AuthError && e.status === 404) {
        setUnavailable(true)
        return
      }
      setError(e instanceof Error ? e.message : 'Could not load proctoring.')
    }
  }, [weekId])

  useEffect(() => {
    load()
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') load()
    }, REFRESH_MS)
    return () => clearInterval(timer)
  }, [load, refreshKey])

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  async function saveLimit() {
    const value = Number(limitDraft)
    if (!Number.isInteger(value) || value < 0 || value > 20) {
      setToast({ message: 'Strike limit must be a whole number from 0 to 20.', kind: 'error' })
      return
    }
    setSavingLimit(true)
    try {
      setView(await setStrikeLimit(weekId, value))
      setToast({ message: value === 0 ? 'Automatic locking is off' : `Participants now lock at ${value} strikes`, kind: 'success' })
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : 'Could not save the strike limit.', kind: 'error' })
    } finally {
      setSavingLimit(false)
    }
  }

  async function unlock(p: ProctorParticipant) {
    setPendingUser(p.userId)
    try {
      await unlockParticipant(weekId, p.userId)
      setToast({ message: `${p.name} is unlocked and their strikes are reset`, kind: 'success' })
      await load()
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : 'Could not unlock.', kind: 'error' })
    } finally {
      setPendingUser(null)
    }
  }

  async function confirmLock(reason: string) {
    if (!locking) return
    setPendingUser(locking.userId)
    try {
      await lockParticipant(weekId, locking.userId, reason)
      setToast({ message: `${locking.name} is locked`, kind: 'success' })
      setLocking(null)
      await load()
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : 'Could not lock.', kind: 'error' })
    } finally {
      setPendingUser(null)
    }
  }

  const participants = sortParticipants(buildRoster(view, seats))
  const lockedCount = participants.filter(p => p.locked).length
  const slippedCount = participants.filter(p => p.strikes > 0).length
  const limit = view?.strikeLimit ?? 0

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-slate-700">
            {participants.length} {participants.length === 1 ? 'participant' : 'participants'}
          </span>
          {lockedCount > 0 && (
            <span className="font-semibold px-2 py-0.5 rounded-md bg-rose-100 text-rose-700">{lockedCount} locked</span>
          )}
          {slippedCount > 0 && (
            <span className="font-semibold px-2 py-0.5 rounded-md bg-amber-100 text-amber-700">{slippedCount} with strikes</span>
          )}
          {updatedAt && <span className="text-slate-400">Updated {timeAgo(new Date(updatedAt).toISOString(), now)}</span>}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {view && (
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 pl-3 pr-1 py-1">
              <label htmlFor={`strike-limit-${weekId}`} className="text-xs text-slate-500">
                Lock at
              </label>
              <input
                id={`strike-limit-${weekId}`}
                type="number"
                min={0}
                max={20}
                value={limitDraft}
                onChange={e => setLimitDraft(e.target.value)}
                className="w-12 px-1.5 py-1 text-sm text-center border border-slate-200 rounded-md bg-white"
              />
              <span className="text-xs text-slate-500">strikes</span>
              <button
                onClick={saveLimit}
                disabled={savingLimit || limitDraft === String(view.strikeLimit)}
                className="px-2.5 py-1 text-xs font-bold rounded-md text-slate-700 hover:bg-white disabled:opacity-40"
              >
                {savingLimit ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}
          {toolbar}
        </div>
      </div>

      <p className="text-xs text-slate-400 mt-2">
        Leaving full screen or switching tab during the live round is a strike. At the limit the participant cannot run
        or submit until you unlock them. 0 turns automatic locking off.
      </p>

      {unavailable && (
        <p className="mt-3 text-xs text-amber-700">
          The server running now does not have proctoring yet. It appears here after the backend is rebuilt and restarted.
        </p>
      )}
      {error && <p role="alert" className="mt-3 text-xs text-rose-600">{error}</p>}

      {participants.length === 0 && (view || seats) && (
        <div className="mt-3 rounded-xl border border-dashed border-slate-200 px-6 py-10 text-center">
          <p className="text-sm font-semibold text-slate-600">Nobody has a seat yet</p>
          <p className="text-xs text-slate-400 mt-1">Grant access to finalists and they appear here.</p>
        </div>
      )}

      {participants.length > 0 && (
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
          <table className="block sm:table w-full text-sm">
            <thead className="hidden sm:table-header-group">
              <tr className="bg-slate-50 text-left text-xs text-slate-500">
                <th className="px-4 py-2.5 font-semibold">Participant</th>
                <th className="px-4 py-2.5 font-semibold">Strikes</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
                <th className="px-4 py-2.5 font-semibold">Last slip</th>
                <th className="px-4 py-2.5 font-semibold text-right">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="block sm:table-row-group">
              {participants.map(p => {
                const last = p.events[0]?.occurredAt
                const logOpen = openLog === p.userId
                return (
                  <Fragment key={p.userId}>
                    <tr className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:table-row sm:p-0 border-t border-slate-100 first:border-t-0 sm:first:border-t ${p.locked ? 'bg-rose-50/60' : 'hover:bg-slate-50/60'}`}>
                      <td className="basis-full sm:table-cell sm:px-4 sm:py-3">
                        <div className="font-semibold text-slate-800">{p.name}</div>
                        {p.username && <div className="font-mono text-xs text-slate-400">@{p.username}</div>}
                      </td>
                      <td className="sm:table-cell sm:px-4 sm:py-3">
                        <StrikeMeter strikes={p.strikes} limit={limit} />
                      </td>
                      <td className="sm:table-cell sm:px-4 sm:py-3">
                        {p.locked ? (
                          <div>
                            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-rose-600 text-white">Locked</span>
                            <span className="ml-2 text-xs text-slate-500">
                              {p.lockedBy === 'auto' ? 'automatically' : 'by an organiser'}
                              {p.lockedAt ? `, ${timeAgo(p.lockedAt, now)}` : ''}
                            </span>
                            {p.lockReason && <p className="mt-1 text-xs text-rose-700">{p.lockReason}</p>}
                          </div>
                        ) : (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700">Clear</span>
                        )}
                      </td>
                      <td className="sm:table-cell sm:px-4 sm:py-3 text-xs text-slate-500">
                        {last ? (
                          <button
                            onClick={() => setOpenLog(logOpen ? null : p.userId)}
                            aria-expanded={logOpen}
                            className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 -mx-1.5 hover:bg-slate-100"
                          >
                            <span className="text-slate-700">{timeAgo(last, now)}</span>
                            <span className="text-slate-400">{p.events.length} logged</span>
                            <svg
                              className={`w-3 h-3 text-slate-400 transition-transform ${logOpen ? 'rotate-180' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        ) : (
                          <span className="text-slate-300">None</span>
                        )}
                      </td>
                      <td className="basis-full sm:table-cell sm:px-4 sm:py-3">
                        <div className="flex flex-wrap items-center sm:justify-end gap-1.5">
                          {rowActions?.(p)}
                          {p.locked ? (
                            <button
                              onClick={() => unlock(p)}
                              disabled={pendingUser === p.userId}
                              className="px-2.5 py-1 text-xs font-bold rounded-md bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40"
                            >
                              {pendingUser === p.userId ? 'Unlocking...' : 'Unlock'}
                            </button>
                          ) : (
                            <button
                              onClick={() => setLocking(p)}
                              disabled={pendingUser === p.userId}
                              className="px-2.5 py-1 text-xs font-bold rounded-md border border-slate-200 text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                            >
                              Lock
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {logOpen && (
                      <tr className="block sm:table-row bg-slate-50/70">
                        <td colSpan={5} className="block sm:table-cell px-4 py-3">
                          <ol className="flex flex-col gap-1.5 border-l-2 border-slate-200 pl-3">
                            {p.events.map((e, i) => (
                              <li key={i} className="flex justify-between gap-4 text-xs">
                                <span className="text-slate-600">{KIND_LABEL[e.kind] ?? e.kind}</span>
                                <span className="font-mono text-slate-400">{new Date(e.occurredAt).toLocaleTimeString()}</span>
                              </li>
                            ))}
                          </ol>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

      {locking && (
        <ReasonModal
          title={`Lock ${locking.name}?`}
          body="They are stopped from running and submitting code straight away, and their contest screen says they are locked until you unlock them."
          label="Reason"
          placeholder="e.g. Phone on the desk"
          confirmLabel="Lock"
          tone="danger"
          requireReason
          busy={pendingUser === locking.userId}
          onConfirm={confirmLock}
          onCancel={() => {
            if (pendingUser === null) setLocking(null)
          }}
        />
      )}
    </div>
  )
}
