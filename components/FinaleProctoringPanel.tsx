'use client'

import { useCallback, useEffect, useState } from 'react'
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

export default function FinaleProctoringPanel({ weekId }: { weekId: string }) {
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
  }, [load])

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

  const participants = view ? sortParticipants(view.participants) : []
  const lockedCount = participants.filter(p => p.locked).length
  const slippedCount = participants.filter(p => p.strikes > 0).length

  return (
    <div className="border-t border-slate-100 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="text-xs font-bold text-slate-700">Proctoring</h4>
          {lockedCount > 0 && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-rose-100 text-rose-700">
              {lockedCount} locked
            </span>
          )}
          {slippedCount > 0 && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-100 text-amber-700">
              {slippedCount} with strikes
            </span>
          )}
          {updatedAt && <span className="text-xs text-slate-400">Updated {timeAgo(new Date(updatedAt).toISOString(), now)}</span>}
        </div>

        {view && (
          <div className="flex items-center gap-2">
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
              className="w-16 px-2 py-1.5 text-sm border border-slate-200 rounded-lg"
            />
            <span className="text-xs text-slate-500">strikes</span>
            <button
              onClick={saveLimit}
              disabled={savingLimit || limitDraft === String(view.strikeLimit)}
              className="px-2.5 py-1.5 text-xs font-bold border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              {savingLimit ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>
      <p className="text-xs text-slate-500 mt-1">
        Every time a participant leaves full screen or switches tab during the live round is a strike. At the limit they are
        locked out of running and submitting until you unlock them. 0 turns automatic locking off.
      </p>

      {unavailable && (
        <p className="mt-3 text-xs text-amber-700">
          The server running now does not have proctoring yet. It appears here after the backend is rebuilt and restarted.
        </p>
      )}
      {error && <p role="alert" className="mt-3 text-xs text-rose-600">{error}</p>}

      {view && participants.length === 0 && (
        <p className="mt-3 text-xs text-slate-500">Nobody has a seat yet.</p>
      )}

      {participants.length > 0 && (
        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs text-slate-500">
                <th className="px-3 py-2 font-semibold">Participant</th>
                <th className="px-3 py-2 font-semibold">Strikes</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">Last slip</th>
                <th className="px-3 py-2 font-semibold text-right">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {participants.map(p => {
                const limit = view?.strikeLimit ?? 0
                const last = p.events[0]?.occurredAt
                return [
                  <tr
                    key={p.userId}
                    className={`border-t border-slate-100 ${p.locked ? 'bg-rose-50/60' : ''}`}
                  >
                    <td className="px-3 py-2.5">
                      <span className="font-semibold text-slate-800">{p.name}</span>
                      {p.username && <span className="ml-2 font-mono text-xs text-slate-400">@{p.username}</span>}
                    </td>
                    <td className="px-3 py-2.5 font-mono tabular-nums">
                      <span className={p.strikes > 0 ? 'font-bold text-rose-600' : 'text-slate-500'}>{p.strikes}</span>
                      {limit > 0 && <span className="text-slate-400"> / {limit}</span>}
                    </td>
                    <td className="px-3 py-2.5">
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
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700">
                          Clear
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-slate-500">
                      {last ? (
                        <button onClick={() => setOpenLog(openLog === p.userId ? null : p.userId)} className="underline-offset-2 hover:underline">
                          {timeAgo(last, now)} ({p.events.length} logged)
                        </button>
                      ) : (
                        <span className="text-slate-400">None</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right">
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
                    </td>
                  </tr>,
                  openLog === p.userId && (
                    <tr key={`${p.userId}-log`} className="border-t border-slate-100 bg-slate-50/60">
                      <td colSpan={5} className="px-3 py-2.5">
                        <ul className="flex flex-col gap-1">
                          {p.events.map((e, i) => (
                            <li key={i} className="flex justify-between gap-4 text-xs text-slate-600">
                              <span>{KIND_LABEL[e.kind] ?? e.kind}</span>
                              <span className="font-mono text-slate-400">{new Date(e.occurredAt).toLocaleTimeString()}</span>
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  ),
                ]
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
