import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useData } from '../context/DataContext'

const DIFF_COLORS = {
  Easy: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60',
  Medium: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/60',
  Hard: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/60',
}

const STATUS_META = {
  upcoming: { label: 'Upcoming', dot: 'bg-slate-400', badge: 'bg-slate-100 text-slate-500', pulse: false },
  live: { label: 'Live', dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60', pulse: true },
  ended: { label: 'Ended', dot: 'bg-rose-400', badge: 'bg-rose-50 text-rose-600 ring-1 ring-rose-200/60', pulse: false },
}

function ConfirmModal({ title, description, confirmLabel, danger = false, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200">
        <div className="p-6 flex flex-col gap-3">
          <div className={`w-11 h-11 rounded-full flex items-center justify-center mb-1 ${danger ? 'bg-rose-50' : 'bg-amber-50'}`}>
            {danger ? (
              <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
          </div>
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
        </div>
        <div className="flex gap-2 px-6 pb-6">
          <button onClick={onCancel}
            className="flex-1 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm}
            className={`flex-1 py-2.5 text-sm font-semibold text-white rounded-lg transition-colors ${
              danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function EventDetail() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const { events, deleteEventProblem, updateEvent } = useData()
  const [confirmState, setConfirmState] = useState(null)
  const event = events.find(e => e.id === Number(eventId))

  if (!event) return (
    <div className="flex items-center justify-center h-full text-slate-400 text-sm">Event not found.</div>
  )

  const status = event.status || 'upcoming'
  const meta = STATUS_META[status]

  function endTime() {
    if (!event.startTime) return '—'
    const [h, m] = event.startTime.split(':').map(Number)
    const end = new Date(0, 0, 0, h + event.durationHours, m)
    return end.toTimeString().slice(0, 5)
  }

  function askStart() {
    setConfirmState({
      title: `Start "${event.title}"?`,
      description: 'This will make the contest live. Participants can begin submitting immediately.',
      confirmLabel: 'Start Contest',
      danger: false,
      onConfirm: () => { updateEvent(event.id, { status: 'live' }); setConfirmState(null) },
    })
  }

  function askEnd() {
    setConfirmState({
      title: `End "${event.title}"?`,
      description: 'This will close all submissions for participants. This action cannot be reversed.',
      confirmLabel: 'End Contest',
      danger: true,
      onConfirm: () => { updateEvent(event.id, { status: 'ended' }); setConfirmState(null) },
    })
  }

  const totalScore = event.problems.reduce((s, p) => s + (p.maxScore || 0), 0)

  return (
    <div className="flex flex-col min-h-full">
      <div className="h-16 bg-white border-b border-slate-200/80 flex items-center px-8 gap-2 shrink-0">
        <Link to="/events" className="text-sm text-slate-400 hover:text-slate-700 transition-colors font-medium">
          Events
        </Link>
        <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-sm font-semibold text-slate-900">{event.title}</span>
      </div>

      <div className="flex-1 p-8 flex flex-col gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-2.5">
            <h2 className="text-xl font-bold text-slate-900">{event.title}</h2>
            <div className="flex items-center gap-3 flex-wrap text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="tabular-nums">{event.startDate}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="tabular-nums">{event.startTime} → {endTime()} · {event.durationHours}h</span>
              </span>
              <span className={`inline-flex items-center gap-1.5 font-semibold px-2 py-0.5 rounded-full ${meta.badge}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${meta.dot} ${meta.pulse ? 'animate-pulse' : ''}`} />
                {meta.label}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="text-center px-5 py-3 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-2xl font-bold text-slate-900 tabular-nums">{event.problems.length}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Problems</p>
            </div>
            <div className="text-center px-5 py-3 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-2xl font-bold text-slate-900 tabular-nums">{totalScore}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Total Score</p>
            </div>
            {status === 'upcoming' && (
              <button
                onClick={askStart}
                className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-sm shadow-emerald-500/20"
              >
                Start Contest
              </button>
            )}
            {status === 'live' && (
              <button
                onClick={askEnd}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors shadow-sm shadow-rose-500/20"
              >
                End Contest
              </button>
            )}
            {status === 'ended' && (
              <span className="px-4 py-2 text-xs font-bold text-slate-400 border border-slate-200 rounded-lg">
                Contest ended
              </span>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900">Problems</h3>
              <p className="text-xs text-slate-500 mt-0.5">Standard CP/DSA problems for this contest</p>
            </div>
            <button
              onClick={() => navigate(`/events/${event.id}/problems/new`)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm shadow-indigo-500/20"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Add Problem
            </button>
          </div>

          {event.problems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-slate-600">No problems yet</p>
              <button
                onClick={() => navigate(`/events/${event.id}/problems/new`)}
                className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                Add the first problem →
              </button>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">#</th>
                  <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Problem Name</th>
                  <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Difficulty</th>
                  <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Max Score</th>
                  <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Time Limit</th>
                  <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {event.problems.map((p, i) => (
                  <tr key={p.id} className="hover:bg-indigo-50/20 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-slate-400 font-mono">{String.fromCharCode(65 + i)}</td>
                    <td className="px-6 py-4 font-semibold text-slate-800 text-sm">{p.name}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${DIFF_COLORS[p.difficulty] || 'bg-slate-100 text-slate-600'}`}>
                        {p.difficulty}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-700 tabular-nums">{p.maxScore} pts</td>
                    <td className="px-6 py-4 text-sm text-slate-500 font-mono tabular-nums">{p.timeLimit}s</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => { if (confirm('Delete this problem?')) deleteEventProblem(event.id, p.id) }}
                        className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {confirmState && (
        <ConfirmModal
          title={confirmState.title}
          description={confirmState.description}
          confirmLabel={confirmState.confirmLabel}
          danger={confirmState.danger}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(null)}
        />
      )}
    </div>
  )
}
