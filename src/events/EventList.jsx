import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'

const STATUS_META = {
  upcoming: {
    label: 'Upcoming',
    dot: 'bg-slate-400',
    badge: 'bg-slate-100 text-slate-500',
    pulse: false,
  },
  live: {
    label: 'Live',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60',
    pulse: true,
  },
  ended: {
    label: 'Ended',
    dot: 'bg-rose-400',
    badge: 'bg-rose-50 text-rose-600 ring-1 ring-rose-200/60',
    pulse: false,
  },
}

const inputCls = 'w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white'

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

export default function EventList() {
  const { events, addEvent, updateEvent, deleteEvent } = useData()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ title: '', startDate: '', startTime: '10:00', durationHours: 3 })
  const [confirmState, setConfirmState] = useState(null)

  const filtered = events.filter(e => e.title.toLowerCase().includes(search.toLowerCase()))
  const liveCount = events.filter(e => e.status === 'live').length

  function handleCreate(ev) {
    ev.preventDefault()
    addEvent({ ...form, durationHours: Number(form.durationHours), status: 'upcoming' })
    setShowCreate(false)
    setForm({ title: '', startDate: '', startTime: '10:00', durationHours: 3 })
  }

  function askStart(e, event) {
    e.stopPropagation()
    setConfirmState({
      title: `Start "${event.title}"?`,
      description: 'This will make the contest live. Participants can begin submitting immediately.',
      confirmLabel: 'Start Contest',
      danger: false,
      onConfirm: () => { updateEvent(event.id, { status: 'live' }); setConfirmState(null) },
    })
  }

  function askEnd(e, event) {
    e.stopPropagation()
    setConfirmState({
      title: `End "${event.title}"?`,
      description: 'This will close all submissions for participants. This action cannot be reversed.',
      confirmLabel: 'End Contest',
      danger: true,
      onConfirm: () => { updateEvent(event.id, { status: 'ended' }); setConfirmState(null) },
    })
  }

  function askDelete(e, event) {
    e.stopPropagation()
    setConfirmState({
      title: `Delete "${event.title}"?`,
      description: 'This will permanently delete the contest and all its problems. This cannot be undone.',
      confirmLabel: 'Delete Event',
      danger: true,
      onConfirm: () => { deleteEvent(event.id); setConfirmState(null) },
    })
  }

  function endTime(startTime, hours) {
    if (!startTime) return '—'
    const [h, m] = startTime.split(':').map(Number)
    const end = new Date(0, 0, 0, h + hours, m)
    return end.toTimeString().slice(0, 5)
  }

  return (
    <div className="flex flex-col min-h-full">
      <div className="h-16 bg-white border-b border-slate-200/80 flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-bold text-slate-900">Events</h1>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
            {events.length}
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <svg className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="pl-8 pr-4 py-2 text-sm border border-slate-200 rounded-lg w-48 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50 transition-all"
            />
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm shadow-indigo-500/20"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Create Event
          </button>
        </div>
      </div>

      <div className="px-8 py-3 border-b border-slate-200/60 bg-white flex items-center gap-4">
        <span className="text-xs text-slate-500">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
        <span className="text-slate-200">·</span>
        <span className="text-xs text-slate-500">
          <span className="text-emerald-600 font-semibold">{liveCount}</span> live now
        </span>
        <span className="text-slate-200">·</span>
        <span className="text-xs text-slate-500">Timed CP/DSA contests · Click a card to manage problems</span>
      </div>

      <div className="flex-1 p-8">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
            <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center mb-1">
              <svg className="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <p className="font-semibold text-sm text-slate-600">No events yet</p>
            <p className="text-xs text-slate-400">Create your first timed contest to get started</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              Create the first one →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(ev => {
              const meta = STATUS_META[ev.status] || STATUS_META.upcoming
              return (
                <div
                  key={ev.id}
                  onClick={() => navigate(`/events/${ev.id}`)}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3.5 cursor-pointer hover:border-indigo-300 hover:shadow-md hover:shadow-indigo-500/5 transition-all group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-900 leading-snug group-hover:text-indigo-700 transition-colors">
                      {ev.title}
                    </h3>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${meta.badge}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot} ${meta.pulse ? 'animate-pulse' : ''}`} />
                      {meta.label}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <svg className="w-3.5 h-3.5 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="tabular-nums">{ev.startDate || 'No date set'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-3.5 h-3.5 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="tabular-nums">
                        {ev.startTime} → {endTime(ev.startTime, ev.durationHours)}
                        <span className="text-slate-400"> · {ev.durationHours}h</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-3.5 h-3.5 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>{ev.problems.length} problem{ev.problems.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  <div
                    className="flex items-center gap-1 pt-3 border-t border-slate-100 mt-auto"
                    onClick={e => e.stopPropagation()}
                  >
                    {(ev.status === 'upcoming' || !ev.status) && (
                      <button
                        onClick={e => askStart(e, ev)}
                        className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Start Contest
                      </button>
                    )}
                    {ev.status === 'live' && (
                      <button
                        onClick={e => askEnd(e, ev)}
                        className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          <rect x="9" y="9" width="6" height="6" rx="1" strokeWidth={2} />
                        </svg>
                        End Contest
                      </button>
                    )}
                    {ev.status === 'ended' && (
                      <span className="flex-1 flex items-center justify-center text-xs font-medium py-1.5 text-slate-400 italic">
                        Contest ended
                      </span>
                    )}
                    <button
                      onClick={e => askDelete(e, ev)}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200/80">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">Create Event</h2>
                <p className="text-xs text-slate-500 mt-0.5">Set up a new timed CP contest</p>
              </div>
              <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="px-6 py-5 flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Event Title</label>
                  <input
                    className={inputCls}
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Spring Contest 2025"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Date</label>
                    <input type="date" className={inputCls} value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Start Time</label>
                    <input type="time" className={inputCls} value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Duration (hours)</label>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    step="0.5"
                    className={inputCls}
                    value={form.durationHours}
                    onChange={e => setForm(f => ({ ...f, durationHours: e.target.value }))}
                  />
                </div>
                <div className="flex items-start gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <svg className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-slate-500">The contest will be created as <strong>Upcoming</strong>. Use the <strong>Start Contest</strong> button to go live when ready.</p>
                </div>
              </div>
              <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-sm shadow-indigo-500/20"
                >
                  Create Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
