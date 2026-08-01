'use client'

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useData } from '@/context/DataContext'
import { getWeekAnalytics, type WeekAnalytics } from '@/lib/analytics'
import {
  getSubmission,
  invalidateSubmission,
  listSubmissions,
  restoreSubmission,
  type AdminSubmissionDetail,
  type AdminSubmissionRow,
} from '@/lib/moderation'
import SubmissionList from '@/components/SubmissionList'
import ProblemDiagnostics from '@/components/ProblemDiagnostics'
import Pagination, { PAGE_SIZE } from '@/components/Pagination'
import ReasonModal from '@/components/ReasonModal'
import Toast, { type ToastState } from '@/components/Toast'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'

type Tab = 'Overview' | 'Problems' | 'Submissions'

const TABS: Tab[] = ['Overview', 'Problems', 'Submissions']

const VERDICT_ORDER = [
  'ACCEPTED',
  'WRONG_ANSWER',
  'TIME_LIMIT_EXCEEDED',
  'MEMORY_LIMIT_EXCEEDED',
  'RUNTIME_ERROR',
  'COMPILATION_ERROR',
  'SYSTEM_ERROR',
]

const VERDICT_LABEL: Record<string, string> = {
  ACCEPTED: 'Accepted',
  WRONG_ANSWER: 'Wrong Answer',
  TIME_LIMIT_EXCEEDED: 'Time Limit',
  MEMORY_LIMIT_EXCEEDED: 'Memory Limit',
  RUNTIME_ERROR: 'Runtime Error',
  COMPILATION_ERROR: 'Compile Error',
  SYSTEM_ERROR: 'System Error',
}

const VERDICT_COLOR: Record<string, string> = {
  ACCEPTED: '#10b981',
  WRONG_ANSWER: '#f43f5e',
  TIME_LIMIT_EXCEEDED: '#f59e0b',
  MEMORY_LIMIT_EXCEEDED: '#f97316',
  RUNTIME_ERROR: '#a855f7',
  COMPILATION_ERROR: '#94a3b8',
  SYSTEM_ERROR: '#64748b',
}

const DIFFICULTY_STYLE: Record<string, string> = {
  easy: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60',
  medium: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/60',
  hard: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/60',
}

type Action =
  | { kind: 'invalidate'; row: AdminSubmissionRow }
  | { kind: 'restore'; row: AdminSubmissionRow }

function percent(value: number) {
  return `${Math.round(value * 100)}%`
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 shadow-lg rounded-xl px-4 py-3 text-sm">
      <p className="font-bold text-slate-700 mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="text-slate-500">{p.name}:</span>
          <span className="font-semibold text-slate-800">{Number(p.value).toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

export default function StatsDetail() {
  const { weekId } = useParams<{ weekId: string }>()
  const { weeks } = useData()
  const week = weeks.find(w => w.id === weekId)

  const [activeTab, setActiveTab] = useState<Tab>('Overview')

  const [data, setData] = useState<WeekAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [rows, setRows] = useState<AdminSubmissionRow[]>([])
  const [subError, setSubError] = useState<string | null>(null)
  const [verdictFilter, setVerdictFilter] = useState('all')
  const [page, setPage] = useState(1)

  const [openId, setOpenId] = useState<string | null>(null)
  const [details, setDetails] = useState<Record<string, AdminSubmissionDetail>>({})
  const [pending, setPending] = useState<string | null>(null)
  const [action, setAction] = useState<Action | null>(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [openProblemId, setOpenProblemId] = useState<string | null>(null)

  const loadAnalytics = useCallback(async () => {
    if (!weekId) return
    try {
      const result = await getWeekAnalytics(weekId)
      setData(result)
      setError(null)
    } catch (e) {
      setData(null)
      setError(e instanceof Error ? e.message : 'Could not load analytics for this contest.')
    }
  }, [weekId])

  const loadSubmissions = useCallback(async () => {
    if (!weekId) return
    try {
      const result = await listSubmissions({ weekId, limit: 200 })
      setRows(result.submissions ?? [])
      setSubError(null)
    } catch (e) {
      setRows([])
      setSubError(e instanceof Error ? e.message : 'Could not load submissions.')
    }
  }, [weekId])

  useEffect(() => {
    let alive = true
    setLoading(true)
    Promise.all([loadAnalytics(), loadSubmissions()]).finally(() => {
      if (alive) setLoading(false)
    })
    return () => { alive = false }
  }, [loadAnalytics, loadSubmissions])

  useEffect(() => { setPage(1) }, [verdictFilter])

  const verdictCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const r of rows) counts[r.verdict] = (counts[r.verdict] ?? 0) + 1
    return counts
  }, [rows])

  const filtered = useMemo(
    () => (verdictFilter === 'all' ? rows : rows.filter(r => r.verdict === verdictFilter)),
    [rows, verdictFilter]
  )

  const paged = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  )

  const dailyData = useMemo(
    () =>
      (data?.dailyActivity ?? []).map(d => ({
        date: d.date,
        participants: d.participants,
        submissions: d.submissions,
      })),
    [data]
  )

  const verdictData = useMemo(() => {
    const dist = data?.verdictDistribution ?? {}
    return VERDICT_ORDER
      .map(v => ({ verdict: VERDICT_LABEL[v] || v, key: v, count: Number(dist[v] ?? 0) }))
      .filter(d => d.count > 0)
  }, [data])

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
        setToast({ message: 'Submission invalidated', kind: 'success' })
      } else {
        await restoreSubmission(action.row.id)
        setToast({ message: 'Submission restored', kind: 'success' })
      }
      setDetails(prev => {
        const next = { ...prev }
        delete next[action.row.id]
        return next
      })
      await Promise.all([loadSubmissions(), loadAnalytics()])
      setAction(null)
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : 'That action failed.', kind: 'error' })
    } finally {
      setBusy(false)
      setPending(null)
    }
  }

  if (!week && !loading && !data) {
    return <div className="flex items-center justify-center h-full text-slate-400 text-sm">Contest not found.</div>
  }

  const title = data?.week.title || week?.title || 'Contest'
  const overview = data?.overview

  const kpiTiles = [
    { v: (overview?.participants ?? 0).toLocaleString(), l: 'Participants' },
    { v: (overview?.totalSubmissions ?? 0).toLocaleString(), l: 'Submissions' },
    { v: percent(overview?.completionRate ?? 0), l: 'Completion' },
  ]

  const overviewCards = [
    { label: 'Participants', value: (overview?.participants ?? 0).toLocaleString(), color: 'text-slate-900' },
    { label: 'Submissions', value: (overview?.totalSubmissions ?? 0).toLocaleString(), color: 'text-slate-900' },
    { label: 'Average Score', value: Math.round(overview?.averageScore ?? 0).toLocaleString(), color: 'text-amber-600' },
    { label: 'Solved At Least One', value: (overview?.acceptedUsers ?? 0).toLocaleString(), color: 'text-emerald-600' },
  ]

  return (
    <div className="flex flex-col min-h-full">
      <div className="h-auto sm:h-16 bg-white border-b border-slate-200/80 flex flex-wrap items-center px-4 sm:px-8 py-3 sm:py-0 gap-2 shrink-0">
        <Link href="/statistics" className="text-sm text-slate-400 hover:text-slate-700 transition-colors font-medium">Analytics</Link>
        <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-sm font-semibold text-slate-900">{title}</span>
      </div>

      <div className="bg-white border-b border-slate-200 px-4 sm:px-8 pt-5 pb-0 shrink-0">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap text-xs text-slate-500">
              {week?.startDate && <span className="tabular-nums">{week.startDate}, {week.startTime || '10:00'}</span>}
              {week && (
                <span className={`inline-flex items-center gap-1.5 font-semibold px-2 py-0.5 rounded-full ${
                  week.active ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60' : 'bg-slate-100 text-slate-500'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${week.active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                  {week.active ? 'Live' : 'Ended'}
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2.5 sm:flex sm:flex-wrap sm:items-center">
            {kpiTiles.map(k => (
              <div key={k.l} className="text-center px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-xl font-bold text-slate-900 tabular-nums">{k.v}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{k.l}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-end overflow-x-auto">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-sm border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab
                  ? 'border-slate-900 text-slate-900 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 font-medium'
              }`}>
              {tab}
              {tab === 'Problems' && (data?.problemBreakdown.length ?? 0) > 0 && (
                <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">{data?.problemBreakdown.length}</span>
              )}
              {tab === 'Submissions' && rows.length > 0 && (
                <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">{rows.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-4 sm:p-8 overflow-auto">
        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-center py-24 text-sm text-slate-400">
            Loading analytics...
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-24 gap-3">
            <p className="text-sm font-semibold text-slate-600">{error}</p>
            <button
              onClick={() => { setLoading(true); Promise.all([loadAnalytics(), loadSubmissions()]).finally(() => setLoading(false)) }}
              className="text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg px-3 py-1.5 hover:bg-slate-100"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'Overview' && (
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {overviewCards.map(k => (
                    <div key={k.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                      <p className={`text-3xl font-bold tabular-nums ${k.color}`}>{k.value}</p>
                      <p className="text-xs text-slate-500 mt-1.5">{k.label}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6">
                  <h3 className="font-bold text-slate-900">Daily Activity</h3>
                  <p className="text-xs text-slate-500 mt-0.5 mb-4">Participants and submissions per day across the contest window</p>
                  {dailyData.length === 0 ? (
                    <div className="h-55 flex items-center justify-center text-sm text-slate-400">No activity recorded yet</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={dailyData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gDaily1" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gDaily2" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.12} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={36} />
                        <Tooltip content={<ChartTooltip />} />
                        <Area type="monotone" dataKey="participants" name="Participants" stroke="#6366f1" strokeWidth={2.5} fill="url(#gDaily1)" />
                        <Area type="monotone" dataKey="submissions" name="Submissions" stroke="#8b5cf6" strokeWidth={2} fill="url(#gDaily2)" strokeDasharray="5 3" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6">
                  <h3 className="font-bold text-slate-900">Verdict Distribution</h3>
                  <p className="text-xs text-slate-500 mt-0.5 mb-4">How every submission in this contest was judged</p>
                  {verdictData.length === 0 ? (
                    <div className="h-55 flex items-center justify-center text-sm text-slate-400">No submissions judged yet</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={verdictData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="verdict" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={36} />
                        <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f8fafc' }} />
                        <Bar dataKey="count" name="Submissions" radius={[6, 6, 0, 0]}>
                          {verdictData.map(d => (
                            <Cell key={d.key} fill={VERDICT_COLOR[d.key] || '#94a3b8'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'Problems' && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 sm:px-6 py-4 border-b border-slate-100">
                  <h2 className="font-bold text-slate-900">Problem Breakdown</h2>
                  <p className="text-xs text-slate-500 mt-0.5">A low acceptance rate with high attempts usually means the problem is the wall</p>
                </div>

                {(data?.problemBreakdown.length ?? 0) === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                    <p className="text-sm font-semibold text-slate-600">No problem data yet</p>
                    <p className="text-xs">Data appears once participants start submitting</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-200">
                          {['Problem','Difficulty','Participants','Solved','Submissions','Avg Attempts','Acceptance'].map(h => (
                            <th key={h} className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data?.problemBreakdown.map(p => (
                          <Fragment key={p.problemId}>
                          <tr
                            onClick={() => setOpenProblemId(openProblemId === p.problemId ? null : p.problemId)}
                            className="hover:bg-slate-50 transition-colors cursor-pointer"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <svg
                                  className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${openProblemId === p.problemId ? 'rotate-90' : ''}`}
                                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                                <p className="text-sm font-semibold text-slate-800">{p.title}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${
                                DIFFICULTY_STYLE[p.difficulty?.toLowerCase()] || 'bg-slate-100 text-slate-600'
                              }`}>
                                {p.difficulty || 'unknown'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm font-bold text-slate-700 tabular-nums">{p.participants.toLocaleString()}</td>
                            <td className="px-6 py-4 text-sm text-emerald-700 font-semibold tabular-nums">{p.acceptedUsers.toLocaleString()}</td>
                            <td className="px-6 py-4 text-sm text-slate-600 tabular-nums">{p.totalSubmissions.toLocaleString()}</td>
                            <td className="px-6 py-4 text-sm text-slate-600 tabular-nums">{p.averageAttempts.toFixed(1)}</td>
                            <td className="px-6 py-4">
                              {p.participants > 0 ? (
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 max-w-20 bg-slate-100 rounded-full h-1.5">
                                    <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, p.acceptanceRate * 100)}%` }} />
                                  </div>
                                  <span className="text-sm font-semibold text-slate-700 tabular-nums">{percent(p.acceptanceRate)}</span>
                                </div>
                              ) : <span className="text-sm text-slate-400">none yet</span>}
                            </td>
                          </tr>
                          {openProblemId === p.problemId && (
                            <tr>
                              <td colSpan={7} className="bg-slate-50/60 border-t border-slate-200 p-0">
                                <ProblemDiagnostics problemId={p.problemId} />
                              </td>
                            </tr>
                          )}
                          </Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'Submissions' && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex flex-col gap-3">
                  <div>
                    <h2 className="font-bold text-slate-900">Submissions</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Every submission in this contest. Expand a row to read the code or invalidate it.</p>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setVerdictFilter('all')}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                        verdictFilter === 'all'
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      All {rows.length}
                    </button>
                    {VERDICT_ORDER.filter(v => (verdictCounts[v] ?? 0) > 0).map(v => (
                      <button
                        key={v}
                        onClick={() => setVerdictFilter(v)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                          verdictFilter === v
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {VERDICT_LABEL[v] || v} {verdictCounts[v]}
                      </button>
                    ))}
                  </div>
                </div>

                {subError ? (
                  <p className="px-6 py-8 text-sm text-rose-600">{subError}</p>
                ) : (
                  <>
                    <SubmissionList
                      rows={paged}
                      openId={openId}
                      details={details}
                      pending={pending}
                      onToggleOpen={toggleOpen}
                      onToggleInvalid={row => setAction(row.invalidated ? { kind: 'restore', row } : { kind: 'invalidate', row })}
                    />
                    <Pagination total={filtered.length} page={page} setPage={setPage} />
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {action && (
        <ReasonModal
          title={action.kind === 'invalidate' ? 'Invalidate submission' : 'Restore submission'}
          body={
            action.kind === 'invalidate'
              ? `This removes the score for ${action.row.username} on ${action.row.problemName}. The participant can see the reason.`
              : `This puts the score for ${action.row.username} on ${action.row.problemName} back.`
          }
          label={action.kind === 'invalidate' ? 'Reason' : undefined}
          placeholder={action.kind === 'invalidate' ? 'Explain why this submission is being invalidated' : undefined}
          confirmLabel={action.kind === 'invalidate' ? 'Invalidate' : 'Restore'}
          tone={action.kind === 'invalidate' ? 'danger' : 'neutral'}
          requireReason={action.kind === 'invalidate'}
          busy={busy}
          onConfirm={runAction}
          onCancel={() => setAction(null)}
        />
      )}

      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </div>
  )
}
