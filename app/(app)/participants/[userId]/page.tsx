'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import type { ReactNode } from 'react'
import Toast, { type ToastState } from '@/components/Toast'
import Pagination, { PAGE_SIZE } from '@/components/Pagination'
import ReasonModal from '@/components/ReasonModal'
import SubmissionList, { VERDICT_SHORT } from '@/components/SubmissionList'
import DisciplineCard from '@/components/DisciplineCard'
import {
  listUsers,
  getUser,
  banUser,
  unbanUser,
  warnUser,
  revokeWarning,
  listSubmissions,
  getSubmission,
  invalidateSubmission,
  restoreSubmission,
  type AdminSubmissionDetail,
  type AdminSubmissionRow,
  type AdminUserDetail,
  type AdminWarning,
} from '@/lib/moderation'

type Tab = 'Submissions' | 'Profile' | 'Discipline'

const TABS: Tab[] = ['Submissions', 'Profile', 'Discipline']

const VERDICT_ORDER = [
  'ACCEPTED',
  'WRONG_ANSWER',
  'TIME_LIMIT_EXCEEDED',
  'MEMORY_LIMIT_EXCEEDED',
  'RUNTIME_ERROR',
  'COMPILATION_ERROR',
]

type Action =
  | { kind: 'ban' }
  | { kind: 'unban' }
  | { kind: 'warn' }
  | { kind: 'revoke'; warning: AdminWarning }
  | { kind: 'invalidate'; row: AdminSubmissionRow }
  | { kind: 'restore'; row: AdminSubmissionRow }

interface ModalCopy {
  title: string
  body: string
  label?: string
  placeholder?: string
  confirmLabel: string
  tone: 'danger' | 'neutral'
  requireReason: boolean
}

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const s = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm'
  const colors = ['bg-slate-200 text-slate-700', 'bg-teal-100 text-teal-700', 'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700', 'bg-sky-100 text-sky-700', 'bg-violet-100 text-violet-700']
  const letter = (name || '?')[0]
  return (
    <div className={`${s} ${colors[letter.charCodeAt(0) % colors.length]} rounded-full flex items-center justify-center font-bold shrink-0`}>
      {letter.toUpperCase()}
    </div>
  )
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-6 py-4 border-b border-slate-100 last:border-0">
      <div className="w-40 shrink-0">
        <span className="text-sm font-semibold text-slate-700">{label}</span>
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

function InfoValue({ value }: { value?: string | number | null }) {
  if (value === null || value === undefined || value === '') {
    return <p className="text-sm text-slate-400 italic">Not provided</p>
  }
  return <p className="text-sm text-slate-700">{value}</p>
}

export default function ParticipantDetail() {
  const { userId } = useParams<{ userId: string }>()
  const id = Number(userId)

  const [user, setUser] = useState<AdminUserDetail | null>(null)
  const [rows, setRows] = useState<AdminSubmissionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [subError, setSubError] = useState<string | null>(null)

  const [tab, setTab] = useState<Tab>('Submissions')
  const [toast, setToast] = useState<ToastState | null>(null)
  const [action, setAction] = useState<Action | null>(null)
  const [busy, setBusy] = useState(false)

  const [weekFilter, setWeekFilter] = useState('all')
  const [problemFilter, setProblemFilter] = useState('all')
  const [verdictFilter, setVerdictFilter] = useState('all')
  const [invalidatedOnly, setInvalidatedOnly] = useState(false)
  const [page, setPage] = useState(1)

  const [openId, setOpenId] = useState<string | null>(null)
  const [details, setDetails] = useState<Record<string, AdminSubmissionDetail>>({})
  const [pending, setPending] = useState<string | null>(null)

  const loadSubmissions = useCallback(async () => {
    try {
      const data = await listSubmissions({ userId: id, limit: 200 })
      setRows(data.submissions ?? [])
      setSubError(null)
    } catch (e) {
      setRows([])
      setSubError(e instanceof Error ? e.message : 'Could not load submissions.')
    }
  }, [id])

  const loadUser = useCallback(async () => {
    try {
      const detail = await getUser(id)
      setUser(detail)
      setError(null)
      return
    } catch {
      try {
        const list = await listUsers('')
        const found = (list.users ?? []).find(u => u.id === id)
        if (found) {
          setUser(found)
          setError(null)
        } else {
          setError('Could not load this participant.')
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load this participant.')
      }
    }
  }, [id])

  useEffect(() => {
    let alive = true
    setLoading(true)
    Promise.all([loadUser(), loadSubmissions()]).finally(() => {
      if (alive) setLoading(false)
    })
    return () => { alive = false }
  }, [loadUser, loadSubmissions])

  useEffect(() => {
    setProblemFilter('all')
  }, [weekFilter])

  useEffect(() => {
    setPage(1)
  }, [weekFilter, problemFilter, verdictFilter, invalidatedOnly])

  const warnings = user?.warnings ?? []

  const derived = useMemo(() => {
    const accepted = rows.filter(r => r.verdict === 'ACCEPTED' && !r.invalidated)
    const solved = new Set(accepted.map(r => r.problemId))
    return {
      totalSubmissions: rows.length,
      acceptedSubmissions: accepted.length,
      problemsSolved: solved.size,
      invalidatedSubmissions: rows.filter(r => r.invalidated).length,
    }
  }, [rows])

  const stats = user?.stats ?? derived
  const invalidatedCount = user?.stats?.invalidatedSubmissions ?? derived.invalidatedSubmissions

  const weekOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const r of rows) {
      if (r.weekId) map.set(r.weekId, r.weekTitle || r.weekId)
    }
    return Array.from(map, ([id, title]) => ({ id, title }))
  }, [rows])

  const weekRows = useMemo(
    () => (weekFilter === 'all' ? rows : rows.filter(r => r.weekId === weekFilter)),
    [rows, weekFilter]
  )

  const problemOptions = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>()
    for (const r of weekRows) {
      const entry = map.get(r.problemId)
      if (entry) entry.count += 1
      else map.set(r.problemId, { name: r.problemName, count: 1 })
    }
    return Array.from(map, ([id, v]) => ({ id, name: v.name, count: v.count }))
  }, [weekRows])

  const problemRows = useMemo(
    () => (problemFilter === 'all' ? weekRows : weekRows.filter(r => r.problemId === problemFilter)),
    [weekRows, problemFilter]
  )

  const verdictCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const r of problemRows) counts[r.verdict] = (counts[r.verdict] || 0) + 1
    return counts
  }, [problemRows])

  const filtered = useMemo(() => {
    let out = problemRows
    if (verdictFilter !== 'all') out = out.filter(r => r.verdict === verdictFilter)
    if (invalidatedOnly) out = out.filter(r => r.invalidated)
    return out
  }, [problemRows, verdictFilter, invalidatedOnly])

  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

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

  function forgetDetail(rowId: string) {
    setDetails(prev => {
      const next = { ...prev }
      delete next[rowId]
      return next
    })
  }

  async function runAction(reason: string) {
    if (!action) return
    setBusy(true)
    if (action.kind === 'invalidate' || action.kind === 'restore') setPending(action.row.id)
    try {
      if (action.kind === 'ban') {
        await banUser(id, reason)
        setToast({ message: 'Participant banned', kind: 'success' })
      } else if (action.kind === 'unban') {
        await unbanUser(id)
        setToast({ message: 'Ban lifted', kind: 'success' })
      } else if (action.kind === 'warn') {
        await warnUser(id, reason)
        setToast({ message: 'Warning issued', kind: 'success' })
      } else if (action.kind === 'revoke') {
        await revokeWarning(id, action.warning.id)
        setToast({ message: 'Warning revoked', kind: 'success' })
      } else if (action.kind === 'invalidate') {
        await invalidateSubmission(action.row.id, reason)
        forgetDetail(action.row.id)
        setToast({ message: 'Submission invalidated', kind: 'success' })
      } else {
        await restoreSubmission(action.row.id)
        forgetDetail(action.row.id)
        setToast({ message: 'Submission restored', kind: 'success' })
      }
      setAction(null)
      await Promise.all([loadUser(), loadSubmissions()])
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : 'That did not work. Try again.', kind: 'error' })
    } finally {
      setBusy(false)
      setPending(null)
    }
  }

  const modalProps = useMemo<ModalCopy | null>(() => {
    if (!action) return null
    const who = user?.username || 'this participant'
    if (action.kind === 'ban') {
      return {
        title: 'Ban participant',
        body: `Banning ${who} blocks them from submitting and running code until you lift it. Points they already earned stay.`,
        label: 'Why are they being banned?',
        placeholder: 'Copied a solution from another participant.',
        confirmLabel: 'Ban participant',
        tone: 'danger' as const,
        requireReason: true,
      }
    }
    if (action.kind === 'unban') {
      return {
        title: 'Lift the ban',
        body: `${who} will be able to submit and run code again straight away.`,
        confirmLabel: 'Lift the ban',
        tone: 'neutral' as const,
        requireReason: false,
      }
    }
    if (action.kind === 'warn') {
      return {
        title: 'Issue a warning',
        body: `A warning goes on ${who}'s record. Three warnings ban the account automatically.`,
        label: 'What went wrong?',
        placeholder: 'Shared a solution in the group chat during a live week.',
        confirmLabel: 'Issue warning',
        tone: 'neutral' as const,
        requireReason: true,
      }
    }
    if (action.kind === 'revoke') {
      return {
        title: 'Revoke this warning',
        body: 'The warning is removed from the record and stops counting towards an automatic ban. It does not lift an existing ban.',
        confirmLabel: 'Revoke warning',
        tone: 'neutral' as const,
        requireReason: false,
      }
    }
    if (action.kind === 'invalidate') {
      return {
        title: 'Invalidate submission',
        body: `This submission to ${action.row.problemName} stops counting towards the score and the leaderboard right away. The score recalculation will not undo it.`,
        label: 'Why is it being invalidated?',
        placeholder: 'Identical to another participant character for character.',
        confirmLabel: 'Invalidate',
        tone: 'danger' as const,
        requireReason: true,
      }
    }
    return {
      title: 'Restore submission',
      body: `This submission to ${action.row.problemName} will count towards the score again.`,
      confirmLabel: 'Restore',
      tone: 'neutral' as const,
      requireReason: false,
    }
  }, [action, user])

  if (loading) {
    return <div className="flex items-center justify-center h-full text-slate-400 text-sm">Loading participant...</div>
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <p className="text-sm text-rose-600">{error || 'Participant not found.'}</p>
        <Link href="/participants" className="text-sm font-semibold text-slate-600 hover:text-slate-900">
          Back to participants
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-full">
      <div className="h-16 bg-white border-b border-slate-200/80 flex items-center px-8 gap-2 shrink-0">
        <Link href="/participants" className="text-sm text-slate-400 hover:text-slate-700 transition-colors font-medium">
          Participants
        </Link>
        <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-sm font-semibold text-slate-900">{user.name || user.username}</span>
      </div>

      <div className="bg-white border-b border-slate-200 px-8 pt-6 pb-0 shrink-0">
        <div className="flex items-start justify-between gap-6 mb-5">
          <div className="flex items-start gap-4 min-w-0">
            <Avatar name={user.name || user.username} />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-slate-900">{user.name || user.username}</h1>
                {user.isBanned ? (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-rose-100 text-rose-700">Banned</span>
                ) : (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700">Active</span>
                )}
                {warnings.length > 0 && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700">
                    {warnings.length} {warnings.length === 1 ? 'warning' : 'warnings'}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-400 mt-0.5 font-mono">@{user.username}</p>
              <p className="text-sm text-slate-500">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="text-center px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xl font-bold text-slate-900 tabular-nums">{stats.totalSubmissions}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Submissions</p>
            </div>
            <div className="text-center px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xl font-bold text-slate-900 tabular-nums">{stats.acceptedSubmissions}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Accepted</p>
            </div>
            <div className="text-center px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xl font-bold text-slate-900 tabular-nums">{stats.problemsSolved}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Problems Solved</p>
            </div>
            <div className="text-center px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xl font-bold text-slate-900 tabular-nums">{user.rating}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Rating</p>
            </div>
          </div>
        </div>

        <div className="flex items-end">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-3 text-sm border-b-2 transition-all whitespace-nowrap ${
                tab === t
                  ? 'border-slate-900 text-slate-900 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 font-medium'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-8 overflow-auto">

        {tab === 'Submissions' && (
          <div className="flex flex-col gap-4">
            {subError && <p className="text-sm text-rose-600">{subError}</p>}

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 pt-4 pb-3 flex flex-col gap-2.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider w-16 shrink-0">Week</span>
                <select
                  value={weekFilter}
                  onChange={e => setWeekFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg text-slate-700 bg-white focus:outline-none focus:border-slate-400"
                >
                  <option value="all">All weeks</option>
                  {weekOptions.map(w => (
                    <option key={w.id} value={w.id}>{w.title}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider w-16 shrink-0">Problem</span>
                <button onClick={() => setProblemFilter('all')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${problemFilter === 'all' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  All
                </button>
                {problemOptions.map(p => (
                  <button key={p.id} onClick={() => setProblemFilter(p.id)}
                    className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${problemFilter === p.id ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    {p.name.length > 18 ? p.name.slice(0, 18) + '...' : p.name}
                    <span className={`text-[10px] tabular-nums ${problemFilter === p.id ? 'opacity-70' : 'text-slate-400'}`}>{p.count}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider w-16 shrink-0">Verdict</span>
                <button onClick={() => setVerdictFilter('all')}
                  className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${verdictFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  All
                  <span className={`text-[10px] tabular-nums ${verdictFilter === 'all' ? 'opacity-70' : 'text-slate-400'}`}>{problemRows.length}</span>
                </button>
                {VERDICT_ORDER.map(v => {
                  const n = verdictCounts[v] || 0
                  if (n === 0) return null
                  return (
                    <button key={v} onClick={() => setVerdictFilter(v)}
                      className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${verdictFilter === v ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                      {VERDICT_SHORT[v] || v}
                      <span className={`text-[10px] tabular-nums ${verdictFilter === v ? 'opacity-70' : 'text-slate-400'}`}>{n}</span>
                    </button>
                  )
                })}
                <button onClick={() => setInvalidatedOnly(o => !o)}
                  className={`ml-auto px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${invalidatedOnly ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  Invalidated only
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <SubmissionList
                rows={visible}
                openId={openId}
                details={details}
                pending={pending}
                onToggleOpen={toggleOpen}
                onToggleInvalid={row => setAction(row.invalidated ? { kind: 'restore', row } : { kind: 'invalidate', row })}
              />
              <Pagination total={filtered.length} page={page} setPage={setPage} />
            </div>
          </div>
        )}

        {tab === 'Profile' && (
          <div className="max-w-3xl">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900">Profile</h2>
              <p className="text-sm text-slate-500 mt-1">What the participant filled in when they registered.</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-2">
              <InfoRow label="Full name"><InfoValue value={user.name} /></InfoRow>
              <InfoRow label="Username"><p className="text-sm text-slate-700 font-mono">@{user.username}</p></InfoRow>
              <InfoRow label="Email"><InfoValue value={user.email} /></InfoRow>
              <InfoRow label="College">
                {user.isTsecUser ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-900 text-white">TSEC</span>
                    {user.collegeName && <span className="text-sm text-slate-700">{user.collegeName}</span>}
                  </div>
                ) : (
                  <InfoValue value={user.collegeName} />
                )}
              </InfoRow>
              <InfoRow label="Course"><InfoValue value={user.course} /></InfoRow>
              <InfoRow label="Year"><InfoValue value={user.year} /></InfoRow>
              <InfoRow label="Location"><InfoValue value={user.location} /></InfoRow>
              <InfoRow label="Rating"><p className="text-sm text-slate-700 tabular-nums">{user.rating}</p></InfoRow>
              <InfoRow label="Season XP"><p className="text-sm text-slate-700 tabular-nums">{user.seasonXp}</p></InfoRow>
            </div>
          </div>
        )}

        {tab === 'Discipline' && (
          <DisciplineCard
            user={user}
            warnings={warnings}
            invalidatedCount={invalidatedCount}
            busy={busy}
            onWarn={() => setAction({ kind: 'warn' })}
            onRevokeWarning={warning => setAction({ kind: 'revoke', warning })}
            onBan={() => setAction({ kind: 'ban' })}
            onUnban={() => setAction({ kind: 'unban' })}
            onGoToSubmissions={() => setTab('Submissions')}
          />
        )}

      </div>

      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

      {action && modalProps && (
        <ReasonModal
          key={action.kind}
          title={modalProps.title}
          body={modalProps.body}
          label={modalProps.label}
          placeholder={modalProps.placeholder}
          confirmLabel={modalProps.confirmLabel}
          tone={modalProps.tone}
          requireReason={modalProps.requireReason}
          busy={busy}
          onConfirm={runAction}
          onCancel={() => { if (!busy) setAction(null) }}
        />
      )}
    </div>
  )
}
