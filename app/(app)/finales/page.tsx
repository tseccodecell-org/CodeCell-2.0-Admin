'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import ConfirmModal, { type ConfirmRequest } from '@/components/ConfirmModal'
import { listUsers, type AdminUserRow } from '@/lib/moderation'
import {
  createFinale,
  endFinale,
  grantAccess,
  resetFinale,
  listParticipantTemplates,
  type ParticipantTemplates,
  setEntryOpen,
  setFinaleDuration,
  setTemplatesLock,
  setFinaleSchedule,
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

function toLocalInput(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function ScoringNote() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-5">
      <h2 className="text-sm font-bold text-slate-900">How a finale is scored</h2>
      <p className="text-xs text-slate-500 mt-1.5 max-w-3xl">
        A finale does not use the weekly scoring rule. Weekly challenges pay a difficulty
        multiplier for a rare solve and a bonus for solving early; a finale pays neither.
      </p>
      <dl className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-xs font-bold text-slate-700">Points</dt>
          <dd className="text-xs text-slate-500 mt-1">
            Every solver of a problem gets exactly its base points. No multiplier, no speed bonus.
          </dd>
        </div>
        <div>
          <dt className="text-xs font-bold text-slate-700">Rank</dt>
          <dd className="text-xs text-slate-500 mt-1">
            Highest total points first. Only accepted submissions count.
          </dd>
        </div>
        <div>
          <dt className="text-xs font-bold text-slate-700">Ties</dt>
          <dd className="text-xs text-slate-500 mt-1">
            Broken by the time of the last accepted solve. Earlier wins.
          </dd>
        </div>
      </dl>
      <p className="text-xs text-slate-400 mt-4">
        Set each problem&apos;s base points in the problem editor. Pausing stops submissions
        scoring without stopping participants running or submitting code.
      </p>
    </div>
  )
}

function ParticipantTemplatesPanel({ finale }: { finale: AdminFinaleResponse }) {
  const [rows, setRows] = useState<ParticipantTemplates[] | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setRows(await listParticipantTemplates(finale.weekId))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load participant templates.')
    } finally {
      setLoading(false)
    }
  }

  function toggle() {
    const next = !open
    setOpen(next)
    if (next && rows === null) load()
  }

  const total = rows?.reduce((sum, r) => sum + r.templateCount, 0) ?? 0

  return (
    <div className="border-t border-slate-100 pt-4">
      <button
        onClick={toggle}
        className="text-xs font-bold text-slate-700 hover:text-slate-900"
      >
        {open ? 'Hide' : 'Review'} participant templates
        {rows && <span className="font-normal text-slate-500"> · {total} saved</span>}
      </button>

      {open && (
        <div className="mt-3">
          {loading && <p className="text-xs text-slate-500">Loading templates</p>}
          {error && <p role="alert" className="text-xs text-rose-600">{error}</p>}

          {rows && rows.length === 0 && (
            <p className="text-xs text-slate-500">
              Nobody has been granted access yet, so there is nothing to review.
            </p>
          )}

          {rows && rows.length > 0 && (
            <div className="flex flex-col gap-2">
              {rows.map(row => (
                <details key={row.userId} className="border border-slate-200 rounded-lg">
                  <summary className="px-3 py-2 text-xs font-bold text-slate-700 cursor-pointer flex items-center justify-between">
                    <span>User #{row.userId}</span>
                    <span className="font-normal text-slate-500">
                      {row.templateCount === 0
                        ? 'no templates'
                        : row.templateCount === 1
                          ? '1 template'
                          : `${row.templateCount} templates`}
                    </span>
                  </summary>
                  {row.templates.length > 0 && (
                    <div className="border-t border-slate-100 p-3 flex flex-col gap-3">
                      {row.templates.map(t => (
                        <div key={t.id}>
                          <p className="text-xs font-bold text-slate-700">
                            {t.name}
                            <span className="ml-2 font-normal text-slate-500">{t.language}</span>
                          </p>
                          <pre className="mt-1.5 max-h-64 overflow-auto rounded bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-700 whitespace-pre-wrap break-words">
                            {t.sourceCode || '(empty)'}
                          </pre>
                        </div>
                      ))}
                    </div>
                  )}
                </details>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function DurationControl({
  finale, onDuration,
}: {
  finale: AdminFinaleResponse
  onDuration: (finale: AdminFinaleResponse, durationSeconds: number) => Promise<void>
}) {
  const total = finale.remainingSeconds
  const [hours, setHours] = useState(String(Math.floor(total / 3600)))
  const [minutes, setMinutes] = useState(String(Math.floor((total % 3600) / 60)))
  const [saving, setSaving] = useState(false)

  const editable = finale.state === 'DRAFT'

  async function save() {
    setSaving(true)
    try {
      await onDuration(finale, Number(hours || 0) * 3600 + Number(minutes || 0) * 60)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <p className="text-xs font-bold text-slate-700">Round length</p>
      <p className="text-xs text-slate-500 mt-1 max-w-sm">
        {editable
          ? 'How long the round runs once you start it.'
          : 'Only a finale that has not started can be re-timed. Reset to draft to change it.'}
      </p>
      <div className="mt-2 flex items-center gap-2">
        <label className="sr-only" htmlFor={`hours-${finale.weekId}`}>
          Hours
        </label>
        <input
          id={`hours-${finale.weekId}`}
          type="number"
          min={0}
          value={hours}
          disabled={!editable}
          onChange={e => setHours(e.target.value)}
          className="w-16 px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-700 disabled:bg-slate-50 disabled:text-slate-400"
        />
        <span className="text-xs text-slate-500">hr</span>
        <label className="sr-only" htmlFor={`minutes-${finale.weekId}`}>
          Minutes
        </label>
        <input
          id={`minutes-${finale.weekId}`}
          type="number"
          min={0}
          max={59}
          value={minutes}
          disabled={!editable}
          onChange={e => setMinutes(e.target.value)}
          className="w-16 px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-700 disabled:bg-slate-50 disabled:text-slate-400"
        />
        <span className="text-xs text-slate-500">min</span>
        <button
          onClick={save}
          disabled={!editable || saving}
          className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg text-slate-600 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
        >
          {saving ? 'Saving' : 'Save'}
        </button>
      </div>
    </div>
  )
}

function TemplateWindowPanel({
  finale, onToggleLock, onSchedule, onToggleEntry, onDuration,
}: {
  finale: AdminFinaleResponse
  onToggleLock: (finale: AdminFinaleResponse, locked: boolean) => void
  onSchedule: (finale: AdminFinaleResponse, scheduledStartAt: string | null) => void
  onToggleEntry: (finale: AdminFinaleResponse, open: boolean) => void
  onDuration: (finale: AdminFinaleResponse, durationSeconds: number) => Promise<void>
}) {
  const [draft, setDraft] = useState(toLocalInput(finale.scheduledStartAt))
  const [saving, setSaving] = useState(false)

  const locked = finale.templatesLocked

  async function save() {
    setSaving(true)
    try {
      await onSchedule(finale, draft ? new Date(draft).toISOString() : null)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border-t border-slate-100 pt-4 flex flex-wrap items-end gap-6">
      <div>
        <p className="text-xs font-bold text-slate-700">Template window</p>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          {locked
            ? 'Participants can read their templates but cannot edit them.'
            : 'Participants can still add and edit templates.'}
        </p>
        <button
          onClick={() => onToggleLock(finale, !locked)}
          className={
            locked
              ? 'mt-2 px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-900 hover:bg-slate-800 text-white'
              : 'mt-2 px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg text-slate-600 hover:border-slate-300 hover:bg-slate-50'
          }
        >
          {locked ? 'Unlock templates' : 'Lock templates for review'}
        </button>
      </div>

      <div>
        <p className="text-xs font-bold text-slate-700">Entry to the contest</p>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          {finale.entryOpen
            ? 'Participants can open the contest screen. Problems stay sealed until you start.'
            : 'The Enter contest button is locked for participants.'}
        </p>
        <button
          onClick={() => onToggleEntry(finale, !finale.entryOpen)}
          className={
            finale.entryOpen
              ? 'mt-2 px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              : 'mt-2 px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-900 hover:bg-slate-800 text-white'
          }
        >
          {finale.entryOpen ? 'Close entry' : 'Open entry'}
        </button>
      </div>

      <DurationControl finale={finale} onDuration={onDuration} />

      <div>
        <label htmlFor={`schedule-${finale.weekId}`} className="text-xs font-bold text-slate-700">
          Scheduled start
        </label>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          Shown to participants as a countdown. You still press Start to open the round.
        </p>
        <div className="mt-2 flex items-center gap-2">
          <input
            id={`schedule-${finale.weekId}`}
            type="datetime-local"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-700"
          />
          <button
            onClick={save}
            disabled={saving}
            className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg text-slate-600 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
          >
            {saving ? 'Saving' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

function FinaleCard({
  finale, onStart, onPause, onResume, onEnd, onToggleLock, onSchedule, onReset, onToggleEntry,
  onDuration,
}: {
  finale: AdminFinaleResponse
  onStart: (finale: AdminFinaleResponse) => void
  onPause: (finale: AdminFinaleResponse) => void
  onResume: (finale: AdminFinaleResponse) => void
  onEnd: (finale: AdminFinaleResponse) => void
  onToggleLock: (finale: AdminFinaleResponse, locked: boolean) => void
  onSchedule: (finale: AdminFinaleResponse, scheduledStartAt: string | null) => void
  onReset: (finale: AdminFinaleResponse) => void
  onToggleEntry: (finale: AdminFinaleResponse, open: boolean) => void
  onDuration: (finale: AdminFinaleResponse, durationSeconds: number) => Promise<void>
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
            {finale.templatesLocked && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-100 text-amber-700">
                Templates locked
              </span>
            )}
            {finale.entryOpen && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700">
                Entry open
              </span>
            )}
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
          {finale.state !== 'DRAFT' && (
            <button
              onClick={() => onReset(finale)}
              title="Put this finale back to DRAFT for a rehearsal"
              className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg text-slate-600 hover:border-slate-300 hover:bg-slate-50"
            >
              Reset to draft
            </button>
          )}
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

      <TemplateWindowPanel
        finale={finale}
        onToggleLock={onToggleLock}
        onSchedule={onSchedule}
        onToggleEntry={onToggleEntry}
        onDuration={onDuration}
      />

      <ParticipantTemplatesPanel finale={finale} />

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

  function handleReset(finale: AdminFinaleResponse) {
    setConfirmRequest({
      title: 'Reset this finale',
      body: `"${finale.title}" goes back to DRAFT with its full duration restored. Submissions already made are not deleted.`,
      confirmLabel: 'Reset to draft',
      tone: 'neutral',
      onConfirm: async () => {
        setActionError(null)
        try {
          const status = await resetFinale(finale.weekId)
          patchFinale(finale.weekId, {
            state: status.state,
            remainingSeconds: status.remainingSeconds,
            liveSince: status.liveSince ?? null,
          })
        } catch (e) {
          setActionError(e instanceof Error ? e.message : `Could not reset "${finale.title}".`)
        }
      },
    })
  }

  async function handleDuration(finale: AdminFinaleResponse, durationSeconds: number) {
    setActionError(null)
    try {
      const status = await setFinaleDuration(finale.weekId, durationSeconds)
      patchFinale(finale.weekId, { remainingSeconds: status.remainingSeconds })
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : `Could not change the length of "${finale.title}".`
      )
    }
  }

  async function handleToggleEntry(finale: AdminFinaleResponse, open: boolean) {
    setActionError(null)
    try {
      const status = await setEntryOpen(finale.weekId, open)
      patchFinale(finale.weekId, { entryOpen: status.entryOpen })
    } catch (e) {
      setActionError(
        e instanceof Error
          ? e.message
          : `Could not ${open ? 'open' : 'close'} entry for "${finale.title}".`
      )
    }
  }

  async function handleToggleLock(finale: AdminFinaleResponse, locked: boolean) {
    setActionError(null)
    try {
      const status = await setTemplatesLock(finale.weekId, locked)
      patchFinale(finale.weekId, { templatesLocked: status.templatesLocked })
    } catch (e) {
      setActionError(
        e instanceof Error
          ? e.message
          : `Could not ${locked ? 'lock' : 'unlock'} templates for "${finale.title}".`
      )
    }
  }

  async function handleSchedule(finale: AdminFinaleResponse, scheduledStartAt: string | null) {
    setActionError(null)
    try {
      const status = await setFinaleSchedule(finale.weekId, scheduledStartAt)
      patchFinale(finale.weekId, { scheduledStartAt: status.scheduledStartAt ?? null })
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : `Could not set the start time for "${finale.title}".`
      )
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

        {finales.length > 0 && <ScoringNote />}

        {finales.map(finale => (
          <FinaleCard
            key={finale.weekId}
            finale={finale}
            onStart={handleStart}
            onPause={handlePause}
            onResume={handleResume}
            onEnd={handleEnd}
            onToggleLock={handleToggleLock}
            onSchedule={handleSchedule}
            onReset={handleReset}
            onToggleEntry={handleToggleEntry}
            onDuration={handleDuration}
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
