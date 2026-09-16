'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import ConfirmModal, { type ConfirmRequest } from '@/components/ConfirmModal'
import { listUsers, type AdminUserRow } from '@/lib/moderation'
import {
  createFinale,
  endFinale,
  grantAccess,
  listAccessGrants,
  listFinales,
  pauseFinale,
  resumeFinale,
  revokeAccess,
  startFinale,
  type AdminFinaleResponse,
  type FinaleAccessGrantResponse,
  type FinaleAccessMode,
  type FinaleState,
} from '@/lib/finales'

const inputCls = 'w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 bg-white'

const STATE_STYLES: Record<FinaleState, string> = {
  DRAFT: 'bg-slate-100 text-slate-500',
  LIVE: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60',
  PAUSED: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/60',
  ENDED: 'bg-slate-100 text-slate-500',
}

const STATE_DOT: Record<FinaleState, string> = {
  DRAFT: 'bg-slate-400',
  LIVE: 'bg-emerald-500',
  PAUSED: 'bg-amber-500',
  ENDED: 'bg-slate-400',
}

function StateBadge({ state }: { state: FinaleState }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${STATE_STYLES[state]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${STATE_DOT[state]}`} />
      {state.charAt(0) + state.slice(1).toLowerCase()}
    </span>
  )
}

function formatRemaining(seconds: number) {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`
}

type CreateForm = {
  title: string
  description: string
  durationMinutes: string
  accessMode: FinaleAccessMode
}

const emptyForm: CreateForm = { title: '', description: '', durationMinutes: '60', accessMode: 'RESTRICTED' }

function AccessGrantsPanel({ finale }: { finale: AdminFinaleResponse }) {
  const [grants, setGrants] = useState<FinaleAccessGrantResponse[]>([])
  const [loadingGrants, setLoadingGrants] = useState(true)
  const [grantsError, setGrantsError] = useState<string | null>(null)
  const [searching, setSearching] = useState(false)
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<AdminUserRow[]>([])
  const [searchError, setSearchError] = useState<string | null>(null)
  const [pendingUserId, setPendingUserId] = useState<number | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [userNameCache, setUserNameCache] = useState<Record<number, string>>({})

  const loadGrants = useCallback(async () => {
    setLoadingGrants(true)
    setGrantsError(null)
    try {
      const data = await listAccessGrants(finale.weekId)
      setGrants(data ?? [])
    } catch (e) {
      setGrantsError(e instanceof Error ? e.message : 'Could not load access grants.')
    } finally {
      setLoadingGrants(false)
    }
  }, [finale.weekId])

  useEffect(() => { loadGrants() }, [loadGrants])

  useEffect(() => {
    if (!searching) return
    const timer = setTimeout(async () => {
      setSearchError(null)
      try {
        const data = await listUsers(search)
        const users = data.users ?? []
        setResults(users)
        setUserNameCache(prev => {
          const next = { ...prev }
          for (const u of users) next[u.id] = u.name || u.username
          return next
        })
      } catch (e) {
        setResults([])
        setSearchError(e instanceof Error ? e.message : 'Could not search participants.')
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [search, searching])

  const grantedIds = new Set(grants.map(g => g.userId))

  async function handleGrant(userId: number) {
    setPendingUserId(userId)
    setActionError(null)
    try {
      await grantAccess(finale.weekId, userId)
      await loadGrants()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not grant access.')
    } finally {
      setPendingUserId(null)
    }
  }

  async function handleRevoke(userId: number) {
    setPendingUserId(userId)
    setActionError(null)
    try {
      await revokeAccess(finale.weekId, userId)
      await loadGrants()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not revoke access.')
    } finally {
      setPendingUserId(null)
    }
  }

  return (
    <div className="border-t border-slate-100 pt-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Access Grants</h4>
        <button
          onClick={() => {
            setSearching(s => !s)
            setSearchError(null)
          }}
          className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg text-slate-600 hover:border-slate-300 hover:bg-slate-50"
        >
          Grant access
        </button>
      </div>

      {actionError && <p role="alert" className="text-xs text-rose-600 mb-3">{actionError}</p>}

      {searching && (
        <div className="mb-3">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search participants by name, username or email..."
            className={inputCls}
            autoFocus
          />
          {searchError && <p role="alert" className="text-xs text-rose-600 mt-2">{searchError}</p>}
          {results.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1 max-h-48 overflow-y-auto">
              {results.map(user => (
                <li key={user.id} className="flex items-center justify-between px-3 py-2 rounded-lg border border-slate-100">
                  <span className="text-sm text-slate-700">
                    {user.name || user.username}{' '}
                    <span className="text-slate-400 font-mono text-xs">@{user.username}</span>
                  </span>
                  <button
                    onClick={() => handleGrant(user.id)}
                    disabled={pendingUserId === user.id || grantedIds.has(user.id)}
                    className="px-2.5 py-1 text-xs font-bold rounded-md bg-slate-900 text-white disabled:opacity-40"
                  >
                    {grantedIds.has(user.id) ? 'Granted' : pendingUserId === user.id ? 'Granting...' : 'Grant'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {loadingGrants ? (
        <p className="text-xs text-slate-400">Loading access grants...</p>
      ) : grantsError ? (
        <p className="text-xs text-rose-600">{grantsError}</p>
      ) : grants.length === 0 ? (
        <p className="text-xs text-slate-400">No one has been granted access yet.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {grants.map(g => (
            <li key={g.userId} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50">
              <span className="text-sm text-slate-700">{userNameCache[g.userId] ?? `User #${g.userId}`}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">{new Date(g.grantedAt).toLocaleDateString()}</span>
                <button
                  onClick={() => handleRevoke(g.userId)}
                  disabled={pendingUserId === g.userId}
                  className="px-2.5 py-1 text-xs font-bold rounded-md border border-slate-200 text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                >
                  Revoke
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function FinaleCard({
  finale, onStart, onPause, onResume, onEnd,
}: {
  finale: AdminFinaleResponse
  onStart: (finale: AdminFinaleResponse) => void
  onPause: (finale: AdminFinaleResponse) => void
  onResume: (finale: AdminFinaleResponse) => void
  onEnd: (finale: AdminFinaleResponse) => void
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-bold text-slate-900">{finale.title}</h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">Week {finale.weekNumber}</span>
            <StateBadge state={finale.state} />
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
              {finale.accessMode === 'RESTRICTED' ? 'Restricted' : 'Open'}
            </span>
          </div>
          {finale.description && <p className="text-sm text-slate-500 mt-1.5 max-w-xl">{finale.description}</p>}
          {finale.state !== 'DRAFT' && finale.state !== 'ENDED' && (
            <p className="text-xs text-slate-400 mt-1.5">
              {formatRemaining(finale.remainingSeconds)} remaining
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/challenges/${finale.weekId}`}
            className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg text-slate-600 hover:border-slate-300 hover:bg-slate-50"
          >
            Manage problems
          </Link>
          {finale.state === 'DRAFT' && (
            <button
              onClick={() => onStart(finale)}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-900 hover:bg-slate-800 text-white"
            >
              Start
            </button>
          )}
          {finale.state === 'LIVE' && (
            <>
              <button
                onClick={() => onPause(finale)}
                className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              >
                Pause
              </button>
              <button
                onClick={() => onEnd(finale)}
                className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
              >
                End permanently
              </button>
            </>
          )}
          {finale.state === 'PAUSED' && (
            <>
              <button
                onClick={() => onResume(finale)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-900 hover:bg-slate-800 text-white"
              >
                Resume
              </button>
              <button
                onClick={() => onEnd(finale)}
                className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
              >
                End permanently
              </button>
            </>
          )}
        </div>
      </div>

      {finale.accessMode === 'RESTRICTED' && <AccessGrantsPanel finale={finale} />}
    </div>
  )
}

export default function FinalesPage() {
  const [finales, setFinales] = useState<AdminFinaleResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<CreateForm>(emptyForm)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listFinales()
      setFinales(data ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load finales.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function patchFinale(weekId: string, patch: Partial<AdminFinaleResponse>) {
    setFinales(fs => fs.map(f => (f.weekId === weekId ? { ...f, ...patch } : f)))
  }

  async function runTransition(finale: AdminFinaleResponse, action: 'start' | 'pause' | 'resume' | 'end') {
    setActionError(null)
    const fn = { start: startFinale, pause: pauseFinale, resume: resumeFinale, end: endFinale }[action]
    try {
      const status = await fn(finale.weekId)
      patchFinale(finale.weekId, {
        state: status.state,
        accessMode: status.accessMode,
        remainingSeconds: status.remainingSeconds,
        liveSince: status.liveSince ?? null,
      })
    } catch (e) {
      setActionError(e instanceof Error ? e.message : `Could not ${action} "${finale.title}".`)
    }
  }

  function handleStart(finale: AdminFinaleResponse) {
    runTransition(finale, 'start')
  }

  function handleResume(finale: AdminFinaleResponse) {
    runTransition(finale, 'resume')
  }

  function handlePause(finale: AdminFinaleResponse) {
    setConfirmRequest({
      title: 'Pause scoring',
      body: `"${finale.title}" freezes its countdown and stops accepting scored submissions until you resume it.`,
      confirmLabel: 'Pause scoring',
      tone: 'neutral',
      onConfirm: () => runTransition(finale, 'pause'),
    })
  }

  function handleEnd(finale: AdminFinaleResponse) {
    setConfirmRequest({
      title: 'End this finale',
      body: `"${finale.title}" closes scoring forever. This cannot be undone.`,
      confirmLabel: 'End permanently',
      tone: 'danger',
      typeToConfirm: finale.title,
      consequences: [
        'Scoring stops immediately and permanently',
        'Participants can no longer submit for points',
      ],
      onConfirm: () => runTransition(finale, 'end'),
    })
  }

  function resetCreate() {
    setShowCreate(false)
    setForm(emptyForm)
    setCreateError(null)
  }

  const durationMinutes = Number(form.durationMinutes)
  const canCreate = !!form.title.trim() && durationMinutes > 0 && !creating

  async function handleCreateSubmit() {
    if (!canCreate) return
    setCreating(true)
    setCreateError(null)
    try {
      const created = await createFinale({
        title: form.title.trim(),
        description: form.description.trim(),
        durationSeconds: Math.round(durationMinutes * 60),
        accessMode: form.accessMode,
      })
      setFinales(fs => [created, ...fs])
      resetCreate()
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Could not create finale.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      <div className="h-auto sm:h-16 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-8 py-3 sm:py-0 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-bold text-slate-900">Finales</h1>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{finales.length}</span>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 shrink-0 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-4 py-2 rounded-lg"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          New finale
        </button>
      </div>

      <div className="px-4 sm:px-8 py-3 border-b border-slate-200/70 bg-white">
        <p className="text-sm text-slate-500">
          A finale is an offline, admin-run contest. Start it when the room is ready, pause it to freeze
          the clock, and end it once scoring should close for good — the backend decides which actions
          are legal for the current state.
        </p>
      </div>

      <div className="flex-1 p-4 sm:p-8 flex flex-col gap-4">
        {loading && finales.length === 0 && <p className="text-sm text-slate-400">Loading finales...</p>}
        {error && <p className="text-sm text-rose-600">{error}</p>}
        {actionError && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-700">
            <span role="alert">{actionError}</span>
            <button
              onClick={() => setActionError(null)}
              className="text-xs font-bold text-rose-600 hover:text-rose-800 shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {!loading && !error && finales.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-600">No finales yet</p>
            <button onClick={() => setShowCreate(true)} className="text-sm font-semibold text-slate-600 hover:text-slate-900">
              Create the first one →
            </button>
          </div>
        )}

        {finales.map(finale => (
          <FinaleCard
            key={finale.weekId}
            finale={finale}
            onStart={handleStart}
            onPause={handlePause}
            onResume={handleResume}
            onEnd={handleEnd}
          />
        ))}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
              <h2 className="text-base font-bold text-slate-900">Create Finale</h2>
              <button onClick={resetCreate} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 flex flex-col gap-4 overflow-y-auto flex-1">
              <div>
                <label htmlFor="finale-title" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Title
                </label>
                <input
                  id="finale-title"
                  className={inputCls}
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Grand Finale"
                />
              </div>

              <div>
                <label htmlFor="finale-description" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Description
                </label>
                <textarea
                  id="finale-description"
                  className={`${inputCls} resize-y`}
                  rows={3}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="What this finale is about"
                />
              </div>

              <div>
                <label htmlFor="finale-duration" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Duration (minutes)
                </label>
                <input
                  id="finale-duration"
                  type="number"
                  min={1}
                  className={inputCls}
                  value={form.durationMinutes}
                  onChange={e => setForm(f => ({ ...f, durationMinutes: e.target.value }))}
                />
              </div>

              <div>
                <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Access mode</span>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="radio"
                      name="accessMode"
                      checked={form.accessMode === 'RESTRICTED'}
                      onChange={() => setForm(f => ({ ...f, accessMode: 'RESTRICTED' }))}
                    />
                    Restricted
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="radio"
                      name="accessMode"
                      checked={form.accessMode === 'OPEN'}
                      onChange={() => setForm(f => ({ ...f, accessMode: 'OPEN' }))}
                    />
                    Open
                  </label>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Restricted finales are only reachable by participants you grant access to. The week
                  number is assigned automatically once created.
                </p>
              </div>

              {createError && <p className="text-sm text-rose-600">{createError}</p>}
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-lg shrink-0">
              <button
                type="button"
                onClick={resetCreate}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!canCreate}
                onClick={handleCreateSubmit}
                className="px-5 py-2 text-sm font-semibold bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg"
              >
                {creating ? 'Creating...' : 'Create finale'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmRequest && <ConfirmModal request={confirmRequest} onCancel={() => setConfirmRequest(null)} />}
    </div>
  )
}
