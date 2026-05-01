import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { SCORING_SYSTEMS } from '../mockData'

const SCORING_COLORS = {
  full: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200/60',
  partial: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200/60',
  time: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/60',
}

const TYPE_META = {
  open: { label: 'Open', color: 'bg-teal-50 text-teal-700 ring-1 ring-teal-200/60' },
  fixed: { label: 'Fixed', color: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/60' },
}

const inputCls = 'w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white'

const emptyForm = { title: '', startDate: '', startTime: '10:00', scoringSystem: 'partial', contestType: 'open', durationHours: 3 }

const DISPLAY_OPTIONS = [
  { value: 'upcoming', label: 'Upcoming', color: 'bg-sky-500 text-white', idle: 'text-sky-600 hover:bg-sky-50' },
  { value: 'past',     label: 'Past',     color: 'bg-slate-500 text-white', idle: 'text-slate-500 hover:bg-slate-100' },
  { value: 'hidden',   label: 'Hidden',   color: 'bg-rose-400 text-white', idle: 'text-rose-400 hover:bg-rose-50' },
]

/* ── Confirm modal ────────────────────────────────────── */
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
              danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-500 hover:bg-amber-600'
            }`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Contest type card ────────────────────────────────── */
function TypeCard({ id, label, desc, icon, selected, onSelect }) {
  return (
    <label className={`flex flex-col gap-1.5 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
      selected ? 'border-indigo-500 bg-indigo-50/60' : 'border-slate-200 hover:border-slate-300 bg-white'
    }`}>
      <input type="radio" name="contestType" value={id} checked={selected} onChange={onSelect} className="sr-only" />
      <div className="flex items-center gap-2">
        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${selected ? 'border-indigo-600' : 'border-slate-300'}`}>
          {selected && <div className="w-2 h-2 rounded-full bg-indigo-600" />}
        </div>
        <span className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
          {icon}
          {label}
        </span>
      </div>
      <p className="text-xs text-slate-500 pl-6">{desc}</p>
    </label>
  )
}

export default function ChallengeList() {
  const { weeks, addWeek, updateWeek, deleteWeek } = useData()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [createStep, setCreateStep] = useState(1)
  const [form, setForm] = useState(emptyForm)
  const [confirmState, setConfirmState] = useState(null)

  const filtered = weeks.filter(w => w.title.toLowerCase().includes(search.toLowerCase()))
  const activeCount = weeks.filter(w => w.active).length

  function resetCreate() {
    setShowCreate(false)
    setCreateStep(1)
    setForm(emptyForm)
  }

  function handleCreate() {
    addWeek({ ...form, durationHours: Number(form.durationHours) })
    resetCreate()
  }

  function askToggleActive(e, week) {
    e.stopPropagation()
    const goingLive = !week.active
    setConfirmState({
      title: goingLive ? `Go live with "${week.title}"?` : `Take "${week.title}" offline?`,
      description: goingLive
        ? 'Participants will be able to submit solutions immediately.'
        : 'Submissions will be closed. You can bring it back live at any time.',
      confirmLabel: goingLive ? 'Go Live' : 'Take Offline',
      danger: false,
      onConfirm: () => { updateWeek(week.id, { active: goingLive }); setConfirmState(null) },
    })
  }

  function askDelete(e, week) {
    e.stopPropagation()
    setConfirmState({
      title: `Delete "${week.title}"?`,
      description: 'This will permanently delete the challenge week and all its problems. This action cannot be undone.',
      confirmLabel: 'Delete Challenge',
      danger: true,
      onConfirm: () => { deleteWeek(week.id); setConfirmState(null) },
    })
  }

  return (
    <div className="flex flex-col min-h-full">
      <div className="h-16 bg-white border-b border-slate-200/80 flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-bold text-slate-900">Weekly Challenges</h1>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{weeks.length}</span>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <svg className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
              className="pl-8 pr-4 py-2 text-sm border border-slate-200 rounded-lg w-48 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50 transition-all" />
          </div>
          <button onClick={() => { setShowCreate(true); setCreateStep(1) }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm shadow-indigo-500/20">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Create Week
          </button>
        </div>
      </div>

      <div className="px-8 py-3 border-b border-slate-200/60 bg-white flex items-center gap-4">
        <span className="text-xs text-slate-500">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
        <span className="text-slate-200">·</span>
        <span className="text-xs text-slate-500"><span className="text-emerald-600 font-semibold">{activeCount}</span> live</span>
        <span className="text-slate-200">·</span>
        <span className="text-xs text-slate-500">Click a row to manage problems</span>
      </div>

      <div className="flex-1 p-8">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
              <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center mb-1">
                <svg className="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="font-semibold text-sm text-slate-600">No challenge weeks yet</p>
              <p className="text-xs text-slate-400">Create your first biweekly challenge to get started</p>
              <button onClick={() => setShowCreate(true)} className="mt-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
                Create the first one →
              </button>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Challenge</th>
                  <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Type</th>
                  <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Scoring</th>
                  <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Problems</th>
                  <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Auto-activates</th>
                  <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Show In</th>
                  <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(w => (
                  <tr key={w.id} onClick={() => navigate(`/challenges/${w.id}`)}
                    className="hover:bg-indigo-50/30 cursor-pointer transition-colors group">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-800 text-sm group-hover:text-indigo-700 transition-colors">{w.title}</p>
                      {w.contestType === 'fixed' && (
                        <p className="text-xs text-slate-400 mt-0.5">{w.durationHours}h duration</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${TYPE_META[w.contestType || 'open']?.color}`}>
                        {TYPE_META[w.contestType || 'open']?.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${SCORING_COLORS[w.scoringSystem]}`}>
                        {SCORING_SYSTEMS[w.scoringSystem]?.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-600">{w.problems.length}</td>
                    <td className="px-6 py-4">
                      {w.startDate ? (
                        <div>
                          <p className="text-sm text-slate-600 tabular-nums">{w.startDate}</p>
                          <p className="text-xs text-slate-400 tabular-nums mt-0.5">at {w.startTime || '10:00'}</p>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
                        w.active ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60' : 'bg-slate-100 text-slate-500'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${w.active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                        {w.active ? 'Live' : 'Offline'}
                      </span>
                    </td>
                    <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                      <div className="inline-flex items-center rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
                        {DISPLAY_OPTIONS.map(opt => {
                          const active = (w.displaySection || 'upcoming') === opt.value
                          return (
                            <button key={opt.value}
                              onClick={() => updateWeek(w.id, { displaySection: opt.value })}
                              className={`px-2.5 py-1 text-[11px] font-semibold transition-colors ${active ? opt.color : opt.idle}`}>
                              {opt.label}
                            </button>
                          )
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-0.5">
                        <button onClick={e => askToggleActive(e, w)} title={w.active ? 'Deactivate' : 'Activate'}
                          className="p-1.5 rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </button>
                        <button onClick={e => askDelete(e, w)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Create modal ── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200/80 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {createStep === 1 ? 'Create Challenge Week' : 'Review & Confirm'}
                </h2>
                <div className="flex items-center gap-2 mt-1.5">
                  {[1, 2].map(s => (
                    <div key={s} className={`h-1 rounded-full transition-all ${s === createStep ? 'w-6 bg-indigo-600' : 'w-3 bg-slate-200'}`} />
                  ))}
                  <span className="text-xs text-slate-400 ml-1">Step {createStep} of 2</span>
                </div>
              </div>
              <button onClick={resetCreate} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Step 1 — Form */}
            {createStep === 1 && (
              <>
                <div className="px-6 py-5 flex flex-col gap-4 overflow-y-auto flex-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Week Title</label>
                    <input className={inputCls} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="e.g. Biweekly Challenge 7" required />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Contest Type</label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <TypeCard id="open" label="Open Challenge"
                        desc="Submit anytime within the date range"
                        icon={<svg className="w-3.5 h-3.5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>}
                        selected={form.contestType === 'open'}
                        onSelect={() => setForm(f => ({ ...f, contestType: 'open' }))} />
                      <TypeCard id="fixed" label="Fixed Duration"
                        desc="Timed contest — participants race the clock"
                        icon={<svg className="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                        selected={form.contestType === 'fixed'}
                        onSelect={() => setForm(f => ({ ...f, contestType: 'fixed' }))} />
                    </div>
                    {form.contestType === 'fixed' && (
                      <div className="mt-2.5">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Duration (hours)</label>
                        <input type="number" min="1" max="24" step="0.5" className={inputCls}
                          value={form.durationHours} onChange={e => setForm(f => ({ ...f, durationHours: e.target.value }))} />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Scoring System</label>
                    <div className="flex flex-col gap-2">
                      {Object.entries(SCORING_SYSTEMS).map(([key, { label, desc }]) => (
                        <label key={key} className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                          form.scoringSystem === key ? 'border-indigo-400 bg-indigo-50 ring-2 ring-indigo-200/60' : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                        }`}>
                          <input type="radio" name="scoring" value={key} checked={form.scoringSystem === key}
                            onChange={() => setForm(f => ({ ...f, scoringSystem: key }))} className="mt-0.5 accent-indigo-600" />
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{label}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Auto-activation Schedule</label>
                    <p className="text-xs text-slate-400 mb-2">The week will activate automatically at this date and time.</p>
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
                </div>

                <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl shrink-0">
                  <button type="button" onClick={resetCreate}
                    className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors">
                    Cancel
                  </button>
                  <button type="button" disabled={!form.title.trim()}
                    onClick={() => setCreateStep(2)}
                    className="px-5 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors shadow-sm shadow-indigo-500/20">
                    Review →
                  </button>
                </div>
              </>
            )}

            {/* Step 2 — Review */}
            {createStep === 2 && (
              <>
                <div className="px-6 py-5 flex flex-col gap-4 overflow-y-auto flex-1">
                  <p className="text-sm text-slate-500">Please review the details before creating this challenge week.</p>

                  <div className="bg-slate-50 rounded-xl border border-slate-200 divide-y divide-slate-200">
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Title</span>
                      <span className="text-sm font-semibold text-slate-800">{form.title}</span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Type</span>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${TYPE_META[form.contestType]?.color}`}>
                        {form.contestType === 'fixed' ? `Fixed — ${form.durationHours}h` : 'Open Challenge'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Scoring</span>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${SCORING_COLORS[form.scoringSystem]}`}>
                        {SCORING_SYSTEMS[form.scoringSystem]?.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Auto-activates</span>
                      <span className="text-sm text-slate-600 tabular-nums">
                        {form.startDate ? `${form.startDate} at ${form.startTime}` : 'Not scheduled'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <svg className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-xs text-amber-700">The week will be created as <strong>Offline</strong>. You can go live once problems are added.</p>
                  </div>
                </div>

                <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl shrink-0">
                  <button type="button" onClick={() => setCreateStep(1)}
                    className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors">
                    ← Back
                  </button>
                  <button type="button" onClick={handleCreate}
                    className="px-5 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-sm shadow-indigo-500/20">
                    Confirm & Create
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Confirm modal ── */}
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
