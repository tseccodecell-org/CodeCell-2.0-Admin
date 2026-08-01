'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useData } from '@/context/DataContext'
import Countdown from '@/components/Countdown'
import ConfirmModal, { type ConfirmRequest } from '@/components/ConfirmModal'
import type { Week } from '@/lib/types'

const inputCls = 'w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 bg-white'

type CreateForm = {
  title: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
}

const emptyForm: CreateForm = { title: '', startDate: '', startTime: '10:00', endDate: '', endTime: '10:00' }

function formatDuration(start: Date | null, end: Date | null) {
  if (!start || !end) return null
  const ms = end.getTime() - start.getTime()
  if (ms <= 0) return null
  const hours = Math.round(ms / 3600000)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  const rest = hours % 24
  return rest ? `${days}d ${rest}h` : `${days}d`
}

export default function ChallengeList() {
  const { weeks, addWeek, updateWeek, deleteWeek, refreshWeeks } = useData()
  const router = useRouter()

  // when a countdown hits zero the backend scheduler flips the week live
  // (15s tick), so refresh once right away and once after the tick
  function refreshSoon() {
    setTimeout(refreshWeeks, 2000)
    setTimeout(refreshWeeks, 18000)
  }
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<CreateForm>(emptyForm)
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null)

  const filtered = weeks.filter(w => w.title.toLowerCase().includes(search.toLowerCase()))
  const activeCount = weeks.filter(w => w.active).length

  function resetCreate() {
    setShowCreate(false)
    setForm(emptyForm)
  }

  const createStart = form.startDate ? new Date(`${form.startDate}T${form.startTime || '10:00'}:00`) : null
  const createEnd = form.endDate ? new Date(`${form.endDate}T${form.endTime || '10:00'}:00`) : null
  const rangeError = createStart && createEnd && createEnd <= createStart ? 'End time must be after the start time.' : null
  const createDuration = formatDuration(createStart, createEnd)
  const canCreate = !!form.title.trim() && !!form.startDate && !!form.endDate && !rangeError

  function handleCreate() {
    if (!canCreate) return
    addWeek(form)
    resetCreate()
  }

  function handleDelete(e: React.MouseEvent, week: Week) {
    e.stopPropagation()
    setConfirmRequest({
      title: 'Delete this week',
      body: `"${week.title}" and everything under it will be removed.`,
      confirmLabel: 'Delete week',
      tone: 'danger',
      typeToConfirm: week.title,
      consequences: [
        `${week.problems.length} problems go with it`,
        'Submissions and leaderboard history are kept',
      ],
      onConfirm: () => deleteWeek(week.id),
    })
  }

  function handleToggleActive(week: Week) {
    if (week.active) {
      setConfirmRequest({
        title: 'Deactivate this week',
        body: `"${week.title}" will stop being visible to participants and they will not be able to submit.`,
        confirmLabel: 'Deactivate',
        tone: 'danger',
        typeToConfirm: week.title,
        consequences: [
          'Participants lose access to its problems',
          'The scheduler will not put it back live on its own',
        ],
        onConfirm: () => updateWeek(week.id, { active: false }),
      })
      return
    }

    setConfirmRequest({
      title: 'Activate this week',
      body: `"${week.title}" goes live and participants can start submitting straight away.`,
      confirmLabel: 'Activate',
      tone: 'neutral',
      typeToConfirm: week.title,
      consequences: [
        `${week.problems.length} problems become visible`,
        'Submissions start counting towards the leaderboard',
      ],
      onConfirm: () => updateWeek(week.id, { active: true }),
    })
  }

  return (
    <div className="flex flex-col min-h-full">
      <div className="h-auto sm:h-16 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-8 py-3 sm:py-0 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-bold text-slate-900">Weekly Challenges</h1>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{weeks.length}</span>
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <svg className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
              className="pl-8 pr-4 py-2 text-sm border border-slate-200 rounded-lg w-full sm:w-48 focus:outline-none focus:border-slate-400 bg-slate-50" />
          </div>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 shrink-0 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-4 py-2 rounded-lg">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Create Week
          </button>
        </div>
      </div>

      <div className="px-4 sm:px-8 py-3 border-b border-slate-200 bg-white flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="text-xs text-slate-500">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
        <span className="text-slate-200">·</span>
        <span className="text-xs text-slate-500"><span className="text-emerald-600 font-semibold">{activeCount}</span> active</span>
        <span className="text-slate-200">·</span>
        <span className="text-xs text-slate-500">Click a row to manage problems</span>
      </div>

      <div className="flex-1 p-4 sm:p-8">
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
              <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center mb-1">
                <svg className="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="font-semibold text-sm text-slate-600">No challenge weeks yet</p>
              <p className="text-xs text-slate-400">Create your first biweekly challenge to get started</p>
              <button onClick={() => setShowCreate(true)} className="mt-1 text-sm font-semibold text-slate-600 hover:text-slate-900">
                Create the first one →
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Challenge</th>
                  <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Week #</th>
                  <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Problems</th>
                  <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Status</th>
                  <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(w => (
                  <tr key={w.id} onClick={() => router.push(`/challenges/${w.id}`)}
                    className="hover:bg-slate-50 cursor-pointer group">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-800 text-sm group-hover:text-slate-900">{w.title}</p>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-600 tabular-nums">{w.weekNumber ?? '—'}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-600">{w.problems.length}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col items-start gap-1">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
                          w.active ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60' : 'bg-slate-100 text-slate-500'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${w.active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {w.active ? 'Active' : 'Inactive'}
                        </span>
                        {!w.active && w.startsAt && (
                          <Countdown target={w.startsAt} onDone={refreshSoon} />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleToggleActive(w)}
                          className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg text-slate-600 hover:border-slate-300 hover:bg-slate-50">
                          {w.active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button onClick={e => handleDelete(e, w)}
                          className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
              <h2 className="text-base font-bold text-slate-900">Create Challenge Week</h2>
              <button onClick={resetCreate} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="px-6 py-5 flex flex-col gap-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Week Title</label>
                <input className={inputCls} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Biweekly Challenge 7" required />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Start Time</label>
                <p className="text-xs text-slate-400 mb-2">Problems open to contestants at this moment.</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1.5">Date</label>
                    <input type="date" className={inputCls} value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1.5">Time</label>
                    <input type="time" className={inputCls} value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">End Time</label>
                <p className="text-xs text-slate-400 mb-2">Scoring stops here and editorials become visible. The week stays open for practice.</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1.5">Date</label>
                    <input type="date" className={`${inputCls} ${rangeError ? 'border-rose-300' : ''}`} value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1.5">Time</label>
                    <input type="time" className={`${inputCls} ${rangeError ? 'border-rose-300' : ''}`} value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} />
                  </div>
                </div>
                {rangeError && <p className="text-xs text-rose-600 mt-1.5">{rangeError}</p>}
                {createDuration && !rangeError && (
                  <p className="text-xs text-slate-500 mt-1.5">Runs for <span className="font-semibold text-slate-700">{createDuration}</span>.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-lg shrink-0">
              <button type="button" onClick={resetCreate}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg">
                Cancel
              </button>
              <button type="button" disabled={!canCreate}
                onClick={handleCreate}
                className="px-5 py-2 text-sm font-semibold bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg">
                Create Week
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmRequest && (
        <ConfirmModal request={confirmRequest} onCancel={() => setConfirmRequest(null)} />
      )}
    </div>
  )
}
