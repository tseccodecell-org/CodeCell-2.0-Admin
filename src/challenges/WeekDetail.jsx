import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useData } from '../context/DataContext'

const DIFF_COLORS = {
  Easy: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60',
  Medium: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/60',
  Hard: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/60',
}


const TABS = ['Details', 'Challenges', 'Moderators', 'Notifications', 'Signups', 'Statistics']

const fieldCls = 'px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white'

function InfoIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-slate-400 inline-block ml-1 cursor-help" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0-2a8 8 0 100-16 8 8 0 000 16zM11 7h2v2h-2V7zm0 4h2v6h-2v-6z" />
    </svg>
  )
}

function FormRow({ label, required, hint, children }) {
  return (
    <div className="flex items-start gap-6 py-4 border-b border-slate-100 last:border-0">
      <div className="w-40 shrink-0 pt-2">
        <span className="text-sm font-semibold text-slate-700">
          {label}
          {required && <span className="text-rose-500 ml-0.5">*</span>}
        </span>
      </div>
      <div className="flex-1">
        {children}
        {hint && <p className="text-xs text-slate-400 mt-1.5">{hint}</p>}
      </div>
    </div>
  )
}

export default function WeekDetail() {
  const { weekId } = useParams()
  const navigate = useNavigate()
  const { weeks, deleteProblem, updateWeek } = useData()
  const week = weeks.find(w => w.id === Number(weekId))

  const [activeTab, setActiveTab] = useState('Details')

  const [details, setDetails] = useState(() => week ? {
    title: week.title,
    startDate: week.startDate || '',
    startTime: week.startTime || '10:00',
    noEndTime: week.contestType !== 'fixed',
    endDate: '',
    endTime: '',
  } : {})

  const [mods, setMods] = useState(['You (owner)'])
  const [modInput, setModInput] = useState('')

  const [notif, setNotif] = useState({ recipients: 'all', subject: '', message: '' })
  const [notifHistory, setNotifHistory] = useState([])

  if (!week) return (
    <div className="flex items-center justify-center h-full text-slate-400 text-sm">Week not found.</div>
  )

  const totalScore = week.problems.reduce((s, p) => s + (p.maxScore || 0), 0)
  const slug = week.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

  function saveDetails() {
    updateWeek(week.id, {
      title: details.title,
      startDate: details.startDate,
      startTime: details.startTime,
    })
  }

  function addMod() {
    const v = modInput.trim()
    if (v && !mods.includes(v)) {
      setMods(m => [...m, v])
      setModInput('')
    }
  }

  function sendNotif() {
    if (!notif.subject.trim() || !notif.message.trim()) return
    setNotifHistory(h => [{
      id: Date.now(),
      recipients: notif.recipients,
      subject: notif.subject,
      message: notif.message,
      sentAt: new Date().toLocaleString(),
    }, ...h])
    setNotif(n => ({ ...n, subject: '', message: '' }))
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Breadcrumb */}
      <div className="h-16 bg-white border-b border-slate-200/80 flex items-center px-8 gap-2 shrink-0">
        <Link to="/challenges" className="text-sm text-slate-400 hover:text-slate-700 transition-colors font-medium">
          Weekly Challenges
        </Link>
        <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-sm font-semibold text-slate-900">{week.title}</span>
      </div>

      {/* Contest header + tab bar */}
      <div className="bg-white border-b border-slate-200 px-8 pt-6 pb-0 shrink-0">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{week.title}</h1>
            <p className="text-sm text-indigo-500 mt-0.5 font-medium">cell-contest.com/{slug}</p>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="text-center px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xl font-bold text-slate-900 tabular-nums">{week.problems.length}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Challenges</p>
            </div>
            <div className="text-center px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xl font-bold text-slate-900 tabular-nums">{totalScore}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Total Score</p>
            </div>
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${
              week.active ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60' : 'bg-slate-100 text-slate-500'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${week.active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              {week.active ? 'Active' : 'Inactive'}
            </span>
            <button
              onClick={() => updateWeek(week.id, { active: !week.active })}
              className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-colors"
            >
              {week.active ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex items-end">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-sm border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab
                  ? 'border-indigo-600 text-indigo-700 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 font-medium'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 p-8 overflow-auto">

        {/* ── Details ── */}
        {activeTab === 'Details' && (
          <div className="max-w-2xl">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900">Contest Details</h2>
              <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                Customize your contest by providing more information needed to create your landing page. Your contest will only be available to those who have access to the contest URL.
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100 px-2">
              <FormRow label="Contest Name" required>
                <input
                  className={`${fieldCls} w-64`}
                  value={details.title}
                  onChange={e => setDetails(d => ({ ...d, title: e.target.value }))}
                  placeholder="Contest name"
                />
              </FormRow>

              <FormRow label="Contest URL">
                <div className="flex items-center gap-2.5 text-sm">
                  <span className="text-slate-600">cell-contest.com/{slug}</span>
                  <button className="text-indigo-600 hover:text-indigo-700 text-xs font-semibold underline underline-offset-2">edit</button>
                </div>
              </FormRow>

              <FormRow label="Start Time" required>
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="date"
                    className={`${fieldCls} w-40`}
                    value={details.startDate}
                    onChange={e => setDetails(d => ({ ...d, startDate: e.target.value }))}
                  />
                  <span className="text-sm text-slate-400">at</span>
                  <input
                    type="time"
                    className={`${fieldCls} w-32`}
                    value={details.startTime}
                    onChange={e => setDetails(d => ({ ...d, startTime: e.target.value }))}
                  />
                  <span className="text-xs font-semibold text-slate-400">IST</span>
                </div>
              </FormRow>

              <FormRow label="End Time" required>
                <div className="flex flex-col gap-2.5">
                  <div className={`flex items-center gap-2 flex-wrap ${details.noEndTime ? 'opacity-40 pointer-events-none select-none' : ''}`}>
                    <input
                      type="date"
                      className={`${fieldCls} w-40`}
                      value={details.endDate}
                      onChange={e => setDetails(d => ({ ...d, endDate: e.target.value }))}
                    />
                    <span className="text-sm text-slate-400">at</span>
                    <input
                      type="time"
                      className={`${fieldCls} w-32`}
                      value={details.endTime}
                      onChange={e => setDetails(d => ({ ...d, endTime: e.target.value }))}
                    />
                    <span className="text-xs font-semibold text-slate-400">IST</span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer w-fit">
                    <input
                      type="checkbox"
                      checked={details.noEndTime}
                      onChange={e => setDetails(d => ({ ...d, noEndTime: e.target.checked }))}
                      className="w-4 h-4 rounded accent-emerald-600"
                    />
                    <span className="text-sm text-emerald-600 font-medium">This contest has no end time.</span>
                  </label>
                </div>
              </FormRow>
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={saveDetails}
                className="px-5 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-sm shadow-indigo-500/20"
              >
                Save Changes
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
              onClick={() => navigate(`/challenges/${week.id}/problems/new`)}
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
                  onClick={() => navigate(`/challenges/${week.id}/problems/new`)}
                  className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                  Add the first challenge →
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200">
                      <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest w-16">No.</th>
                      <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Name</th>
                      <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Difficulty</th>
                      <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                        Max Score <InfoIcon />
                      </th>
                      <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                        Binary <InfoIcon />
                      </th>
                      <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
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
                          <button className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 text-left">
                            {p.name}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${DIFF_COLORS[p.difficulty] || 'bg-slate-100 text-slate-600'}`}>
                            {p.difficulty}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="number"
                            defaultValue={p.maxScore}
                            className="w-20 px-2 py-1.5 text-sm border border-slate-200 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <input type="checkbox" className="w-4 h-4 accent-indigo-600 cursor-pointer" />
                        </td>
                        <td className="px-6 py-4">
                          <input type="checkbox" className="w-4 h-4 accent-indigo-600 cursor-pointer" defaultChecked={!!p.approach} />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => { if (confirm('Remove this challenge?')) deleteProblem(week.id, p.id) }}
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
            )}
          </div>
        )}

        {/* ── Moderators ── */}
        {activeTab === 'Moderators' && (
          <div className="max-w-2xl">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900">Moderators</h2>
              <p className="text-sm text-slate-500 mt-1">Manage who can edit and moderate this contest. Moderators have full access to contest settings.</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col gap-4">
              <div className="flex gap-2">
                <input
                  className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  placeholder="Enter username or email to add moderator..."
                  value={modInput}
                  onChange={e => setModInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addMod()}
                />
                <button
                  onClick={addMod}
                  className="px-4 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                >
                  Add
                </button>
              </div>

              <div className="flex flex-col gap-2 mt-1">
                {mods.map((m, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-700 shrink-0">
                        {m.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{m}</p>
                        <p className="text-xs text-slate-400">{i === 0 ? 'Contest owner' : 'Moderator'}</p>
                      </div>
                    </div>
                    {i === 0 ? (
                      <span className="text-xs text-slate-400 font-medium px-2 py-1 bg-slate-100 rounded-md">Owner</span>
                    ) : (
                      <button
                        onClick={() => setMods(ms => ms.filter((_, j) => j !== i))}
                        className="text-xs font-semibold text-rose-500 hover:text-rose-700 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Notifications ── */}
        {activeTab === 'Notifications' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div>
              <div className="mb-5">
                <h2 className="text-xl font-bold text-slate-900">Notify Your Participants</h2>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                  Notify users who signed up for your contest by sending them a notification message. Your notification will appear under the loud speaker icon located on the righthand side of the top navigation bar.
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex items-start gap-5">
                  <label className="w-24 shrink-0 pt-2 text-sm font-semibold text-slate-700">Recipients</label>
                  <select
                    value={notif.recipients}
                    onChange={e => setNotif(n => ({ ...n, recipients: e.target.value }))}
                    className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                  >
                    <option value="all">All Contestants</option>
                    <option value="registered">Registered Only</option>
                    <option value="submitted">Submitted at Least Once</option>
                  </select>
                </div>

                <div className="flex items-start gap-5">
                  <label className="w-24 shrink-0 pt-2 text-sm font-semibold text-slate-700">Subject</label>
                  <input
                    className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                    placeholder="Subject"
                    value={notif.subject}
                    onChange={e => setNotif(n => ({ ...n, subject: e.target.value }))}
                  />
                </div>

                <div className="flex items-start gap-5">
                  <label className="w-24 shrink-0 pt-2 text-sm font-semibold text-slate-700">Message</label>
                  <textarea
                    rows={8}
                    className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white resize-y"
                    value={notif.message}
                    onChange={e => setNotif(n => ({ ...n, message: e.target.value }))}
                  />
                </div>

                <div className="pl-29">
                  <button
                    onClick={sendNotif}
                    disabled={!notif.subject.trim() || !notif.message.trim()}
                    className="px-5 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  >
                    Send Message
                  </button>
                </div>
              </div>
            </div>

            <div>
              <div className="mb-5">
                <h2 className="text-xl font-bold text-slate-900">Notification History</h2>
              </div>
              {notifHistory.length === 0 ? (
                <p className="text-sm text-slate-500">You have not sent any notifications.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {notifHistory.map(n => (
                    <div key={n.id} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-1.5 shadow-sm">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-800 truncate">{n.subject}</p>
                        <span className="text-xs text-slate-400 tabular-nums shrink-0">{n.sentAt}</span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2">{n.message}</p>
                      <span className="text-xs text-slate-400">
                        To: {n.recipients === 'all' ? 'All Contestants' : n.recipients === 'registered' ? 'Registered Only' : 'Submitted at Least Once'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Signups ── */}
        {activeTab === 'Signups' && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900">Signups</h2>
              <p className="text-sm text-slate-500 mt-1">Participants who have registered for this contest.</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
              <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center mb-1">
                <svg className="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="font-semibold text-sm text-slate-600">No signups yet</p>
              <p className="text-xs text-slate-400">Participants will appear here once they register for the contest</p>
            </div>
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
    </div>
  )
}
