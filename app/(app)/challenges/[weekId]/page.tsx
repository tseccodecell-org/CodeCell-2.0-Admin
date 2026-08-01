'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useData } from '@/context/DataContext'
import Countdown from '@/components/Countdown'
import ConfirmModal, { type ConfirmRequest } from '@/components/ConfirmModal'

const DIFF_COLORS: Record<string, string> = {
  Easy: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60',
  Medium: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/60',
  Hard: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/60',
}


const TABS = ['Details', 'Challenges', 'Statistics']

const fieldCls = 'px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 bg-white'

function InfoIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-slate-400 inline-block ml-1 cursor-help" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0-2a8 8 0 100-16 8 8 0 000 16zM11 7h2v2h-2V7zm0 4h2v6h-2v-6z" />
    </svg>
  )
}

type Phase = 'locked' | 'live' | 'ended'

const PHASES: { id: Phase; label: string; blurb: string }[] = [
  { id: 'locked', label: 'Locked', blurb: 'Contestants cannot open the problems or submit. The server rejects both.' },
  { id: 'live', label: 'Live', blurb: 'Problems are open and every accepted submission earns points.' },
  { id: 'ended', label: 'Ended', blurb: 'Stays open for practice. Editorials become visible and submissions score 0.' },
]

function phaseOf(active: boolean, endsAt: string | null): Phase {
  if (endsAt && Date.now() > new Date(endsAt).getTime()) return 'ended'
  return active ? 'live' : 'locked'
}

function formatDuration(startsAt: string | null, endsAt: string | null) {
  if (!startsAt || !endsAt) return null
  const ms = new Date(endsAt).getTime() - new Date(startsAt).getTime()
  if (ms <= 0) return null
  const hours = Math.round(ms / 3600000)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  const rest = hours % 24
  return rest ? `${days}d ${rest}h` : `${days}d`
}

function ContestFlow({ phase }: { phase: Phase }) {
  const current = PHASES.findIndex(p => p.id === phase)

  return (
    <ol className="grid gap-3 sm:grid-cols-3">
      {PHASES.map((p, i) => {
        const isNow = i === current
        return (
          <li
            key={p.id}
            className={`rounded-xl border px-4 py-3 ${
              isNow
                ? 'border-slate-900 bg-slate-900'
                : i < current
                  ? 'border-slate-200 bg-white'
                  : 'border-dashed border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`w-5 h-5 shrink-0 rounded-full text-[10px] font-bold flex items-center justify-center ${
                  isNow ? 'bg-white text-slate-900' : 'bg-slate-100 text-slate-400'
                }`}
              >
                {i + 1}
              </span>
              <span className={`text-sm font-semibold ${isNow ? 'text-white' : 'text-slate-500'}`}>
                {p.label}
              </span>
              {isNow && (
                <span className="ml-auto text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Now
                </span>
              )}
            </div>
            <p className={`text-xs mt-2 leading-relaxed ${isNow ? 'text-slate-300' : 'text-slate-400'}`}>
              {p.blurb}
            </p>
          </li>
        )
      })}
    </ol>
  )
}

type FormRowProps = {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}

function FormRow({ label, required, hint, children }: FormRowProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-6 py-4 border-b border-slate-100 last:border-0">
      <div className="w-full sm:w-40 shrink-0 sm:pt-2">
        <span className="text-sm font-semibold text-slate-700">
          {label}
          {required && <span className="text-rose-500 ml-0.5">*</span>}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        {children}
        {hint && <p className="text-xs text-slate-400 mt-1.5">{hint}</p>}
      </div>
    </div>
  )
}

type DetailsForm = {
  title: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
}

export default function WeekDetail() {
  const { weekId } = useParams<{ weekId: string }>()
  const router = useRouter()
  const { weeks, deleteProblem, updateWeek, deleteWeek, refreshWeeks } = useData()
  const week = weeks.find(w => w.id === weekId) // ids are uuid strings now

  const [activeTab, setActiveTab] = useState('Details')

  const [details, setDetails] = useState<DetailsForm>({
    title: '', startDate: '', startTime: '10:00', endDate: '', endTime: '10:00',
  })
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null)

  const loadedId = week?.id
  const loadedTitle = week?.title
  const loadedStartDate = week?.startDate
  const loadedStartTime = week?.startTime
  const loadedEndDate = week?.endDate
  const loadedEndTime = week?.endTime

  useEffect(() => {
    if (!loadedId) return
    setDetails({
      title: loadedTitle || '',
      startDate: loadedStartDate || '',
      startTime: loadedStartTime || '10:00',
      endDate: loadedEndDate || '',
      endTime: loadedEndTime || '10:00',
    })
  }, [loadedId, loadedTitle, loadedStartDate, loadedStartTime, loadedEndDate, loadedEndTime])

  if (!week) return (
    <div className="flex items-center justify-center h-full text-slate-400 text-sm">Week not found.</div>
  )

  const totalScore = week.problems.reduce((s, p) => s + (p.basePoints || 0), 0)
  const slug = week.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const phase = phaseOf(week.active, week.endsAt)
  const duration = formatDuration(week.startsAt, week.endsAt)

  const startAt = details.startDate ? new Date(`${details.startDate}T${details.startTime || '10:00'}:00`) : null
  const endAt = details.endDate ? new Date(`${details.endDate}T${details.endTime || '10:00'}:00`) : null
  const rangeError = startAt && endAt && endAt <= startAt ? 'End time must be after the start time.' : null
  const incomplete = !details.title.trim() || !details.startDate || !details.endDate
  const canSave = !rangeError && !incomplete && saveState !== 'saving'

  const update = (patch: Partial<DetailsForm>) => {
    setDetails(d => ({ ...d, ...patch }))
    setSaveState('idle')
  }

  async function saveDetails() {
    setSaveState('saving')
    try {
      await updateWeek(week!.id, {
        title: details.title,
        startDate: details.startDate,
        startTime: details.startTime,
        endDate: details.endDate,
        endTime: details.endTime,
      })
      setSaveState('saved')
    } catch {
      setSaveState('error')
    }
  }

  function handleDelete() {
    setConfirmRequest({
      title: 'Delete this week',
      body: `"${week!.title}" and everything under it will be removed.`,
      confirmLabel: 'Delete week',
      tone: 'danger',
      typeToConfirm: week!.title,
      consequences: [
        `${week!.problems.length} problems go with it`,
        'Submissions and leaderboard history are kept',
      ],
      onConfirm: async () => {
        await deleteWeek(week!.id)
        router.push('/challenges')
      },
    })
  }

  function handleToggleActive() {
    if (week!.active) {
      setConfirmRequest({
        title: 'Deactivate this week',
        body: `"${week!.title}" will stop being visible to participants and they will not be able to submit.`,
        confirmLabel: 'Deactivate',
        tone: 'danger',
        typeToConfirm: week!.title,
        consequences: [
          'Participants lose access to its problems',
          'The scheduler will not put it back live on its own',
        ],
        onConfirm: () => updateWeek(week!.id, { active: false }),
      })
      return
    }

    setConfirmRequest({
      title: 'Activate this week',
      body: `"${week!.title}" goes live and participants can start submitting straight away.`,
      confirmLabel: 'Activate',
      tone: 'neutral',
      consequences: [`${week!.problems.length} problems become visible`],
      onConfirm: () => updateWeek(week!.id, { active: true }),
    })
  }

  function handleDeleteProblem(problemId: string | number, problemName: string) {
    setConfirmRequest({
      title: 'Remove this problem',
      body: `"${problemName}" will be removed from this week.`,
      confirmLabel: 'Remove problem',
      tone: 'danger',
      typeToConfirm: problemName,
      consequences: ['Existing submissions for it are kept but stop counting'],
      onConfirm: () => deleteProblem(week!.id, problemId),
    })
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Breadcrumb */}
      <div className="h-auto sm:h-16 bg-white border-b border-slate-200/80 flex flex-wrap items-center px-4 sm:px-8 py-3 sm:py-0 gap-2 shrink-0">
        <Link href="/challenges" className="text-sm text-slate-400 hover:text-slate-700 transition-colors font-medium">
          Weekly Challenges
        </Link>
        <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-sm font-semibold text-slate-900">{week.title}</span>
      </div>

      {/* Contest header + tab bar */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-8 pt-6 pb-0 shrink-0">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-5">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-slate-900">{week.title}</h1>
            <p className="text-sm text-slate-400 mt-0.5 font-mono break-all">cell-contest.com/{slug}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="text-center px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xl font-bold text-slate-900 tabular-nums">{week.problems.length}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Challenges</p>
            </div>
            <div className="text-center px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xl font-bold text-slate-900 tabular-nums">{totalScore}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Total Score</p>
            </div>
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${
              phase === 'live'
                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60'
                : phase === 'ended'
                  ? 'bg-sky-50 text-sky-700 ring-1 ring-sky-200/60'
                  : 'bg-slate-100 text-slate-500'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                phase === 'live' ? 'bg-emerald-500' : phase === 'ended' ? 'bg-sky-500' : 'bg-slate-400'
              }`} />
              {phase === 'live' ? 'Live' : phase === 'ended' ? 'Ended' : 'Locked'}
            </span>
            {!week.active && week.startsAt && (
              <Countdown
                target={week.startsAt}
                onDone={() => { setTimeout(refreshWeeks, 2000); setTimeout(refreshWeeks, 18000) }}
              />
            )}
            <button
              onClick={handleToggleActive}
              className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-colors"
            >
              {week.active ? 'Deactivate' : 'Activate'}
            </button>
            <button
              onClick={handleDelete}
              className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex items-end overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-sm border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab
                  ? 'border-slate-900 text-slate-900 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 font-medium'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 p-4 sm:p-8 overflow-auto">

        {/* ── Details ── */}
        {activeTab === 'Details' && (
          <div className="max-w-2xl">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900">Contest Details</h2>
              <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                The schedule below drives what contestants can reach. Everything is enforced by the server, not just hidden in the interface.
              </p>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Contest flow</h3>
                {duration && (
                  <span className="text-xs text-slate-400">
                    Runs for <span className="font-semibold text-slate-600">{duration}</span>
                  </span>
                )}
              </div>
              <ContestFlow phase={phase} />
              {phase === 'locked' && (
                <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                  {week.startsAt && new Date(week.startsAt) > new Date()
                    ? 'This week activates automatically at its start time. Activate now to open it early.'
                    : 'This week is switched off. Activate it to let contestants in.'}
                </p>
              )}
              {phase === 'ended' && (
                <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                  Past the end time the week is open to everyone regardless of the Active toggle, so deactivating it now will not close it. Push the end time back if you need to reopen scoring.
                </p>
              )}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100 px-2">
              <FormRow label="Contest Name" required>
                <input
                  className={`${fieldCls} w-full sm:w-64`}
                  value={details.title}
                  onChange={e => update({ title: e.target.value })}
                  placeholder="Contest name"
                />
              </FormRow>

              <FormRow label="Start Time" required hint="Problems open automatically at this moment.">
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="date"
                    className={`${fieldCls} w-40`}
                    value={details.startDate}
                    onChange={e => update({ startDate: e.target.value })}
                  />
                  <span className="text-sm text-slate-400">at</span>
                  <input
                    type="time"
                    className={`${fieldCls} w-32`}
                    value={details.startTime}
                    onChange={e => update({ startTime: e.target.value })}
                  />
                  <span className="text-xs font-semibold text-slate-400">IST</span>
                </div>
              </FormRow>

              <FormRow label="End Time" required hint="Scoring stops here and editorials go public.">
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="date"
                    className={`${fieldCls} w-40 ${rangeError ? 'border-rose-300' : ''}`}
                    value={details.endDate}
                    onChange={e => update({ endDate: e.target.value })}
                  />
                  <span className="text-sm text-slate-400">at</span>
                  <input
                    type="time"
                    className={`${fieldCls} w-32 ${rangeError ? 'border-rose-300' : ''}`}
                    value={details.endTime}
                    onChange={e => update({ endTime: e.target.value })}
                  />
                  <span className="text-xs font-semibold text-slate-400">IST</span>
                </div>
                {rangeError && <p className="text-xs text-rose-600 mt-1.5">{rangeError}</p>}
              </FormRow>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 mt-4">
              {saveState === 'saved' && <span className="text-xs font-semibold text-emerald-600">Saved</span>}
              {saveState === 'error' && <span className="text-xs font-semibold text-rose-600">Could not save. Try again.</span>}
              {incomplete && !rangeError && <span className="text-xs text-slate-400">Name, start and end are all required.</span>}
              <button
                onClick={saveDetails}
                disabled={!canSave}
                className="px-5 py-2 text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
              >
                {saveState === 'saving' ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}

        {/* ── Challenges ── */}
        {activeTab === 'Challenges' && (
          <div>
            <div className="mb-5">
              <h2 className="text-xl font-bold text-slate-900">Contest Challenges</h2>
              <p className="text-sm text-slate-500 mt-1">
                Add challenges to your contest. To reorder your challenges, simply select and drag to the desired location.
              </p>
            </div>

            <button
              onClick={() => router.push(`/challenges/${week.id}/problems/new`)}
              className="mb-5 px-4 py-2 text-sm font-semibold border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors font-mono tracking-tight"
            >
              Add Challenge
            </button>

            {week.problems.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-slate-600">No challenges yet</p>
                <button
                  onClick={() => router.push(`/challenges/${week.id}/problems/new`)}
                  className="text-sm font-semibold text-slate-600 hover:text-slate-900"
                >
                  Add the first challenge →
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200">
                      <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest w-16 whitespace-nowrap">No.</th>
                      <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Name</th>
                      <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Difficulty</th>
                      <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                        Base Points <InfoIcon />
                      </th>
                      <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                        Binary <InfoIcon />
                      </th>
                      <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                        Editorial <InfoIcon />
                      </th>
                      <th className="px-6 py-3.5 text-right" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {week.problems.map((p, i) => (
                      <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4 text-sm text-slate-500">{i + 1}.</td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => router.push(`/challenges/${week.id}/problems/${p.id}/edit`)}
                            className="text-sm font-semibold text-slate-700 hover:text-slate-900 text-left"
                          >
                            {p.name}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${DIFF_COLORS[p.difficulty] || 'bg-slate-100 text-slate-600'}`}>
                            {p.difficulty}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-700">{p.basePoints}</span>
                        </td>
                        <td className="px-6 py-4">
                          <input type="checkbox" className="w-4 h-4 accent-slate-900 cursor-pointer" />
                        </td>
                        <td className="px-6 py-4">
                          {p.editorial ? (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700">Written</span>
                          ) : (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-500">Missing</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => router.push(`/challenges/${week.id}/problems/${p.id}/test`)}
                              className="px-2.5 py-1 text-xs font-bold border border-slate-200 rounded-lg text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-colors"
                              title="Run/submit code against this problem"
                            >
                              Test
                            </button>
                            <button
                              onClick={() => router.push(`/challenges/${week.id}/problems/${p.id}/edit`)}
                              className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                              title="Edit problem"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteProblem(p.id, p.name)}
                              className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Statistics ── */}
        {activeTab === 'Statistics' && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900">Statistics</h2>
              <p className="text-sm text-slate-500 mt-1">Submission and participation data for this contest.</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Total Signups', value: '0', icon: '👥' },
                { label: 'Submissions', value: '0', icon: '📨' },
                { label: 'Unique Solvers', value: '0', icon: '✅' },
                { label: 'Avg. Score', value: '—', icon: '📊' },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 text-center">
                  <p className="text-3xl font-bold text-slate-900 tabular-nums">{s.value}</p>
                  <p className="text-xs text-slate-500 mt-1.5">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-24 gap-2">
              <svg className="w-10 h-10 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-sm text-slate-400 mt-1">No submission data available yet</p>
            </div>
          </div>
        )}

      </div>

      {confirmRequest && (
        <ConfirmModal request={confirmRequest} onCancel={() => setConfirmRequest(null)} />
      )}
    </div>
  )
}
