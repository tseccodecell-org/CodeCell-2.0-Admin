'use client'

import { useRouter } from 'next/navigation'
import { useData } from '@/context/DataContext'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

type Stats = { participants: number; submissions: number; avgScore: number; topScore: number }

const SEED_STATS: Record<string, Stats> = {
  1: { participants: 247, submissions: 891, avgScore: 68, topScore: 250 },
  2: { participants: 183, submissions: 456, avgScore: 54, topScore: 200 },
  3: { participants: 0,   submissions: 0,   avgScore: 0,  topScore: 0 },
}

function getStats(id: string): Stats {
  return SEED_STATS[id] || { participants: 0, submissions: 0, avgScore: 0, topScore: 0 }
}

/* ── Historical trend data (blends mock history with real weeks) ── */
const HISTORY = [
  { contest: 'Entry Week',  participants: 38,  submissions: 92  },
  { contest: 'Grind Week',  participants: 61,  submissions: 148 },
  { contest: 'Storm Week',  participants: 85,  submissions: 207 },
  { contest: 'Clash Week',  participants: 112, submissions: 318 },
  { contest: 'ShowOff Week',participants: 147, submissions: 401 },
]

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 shadow-lg rounded-xl px-4 py-3 text-sm">
      <p className="font-bold text-slate-700 mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-500">{p.name}:</span>
          <span className="font-semibold text-slate-800">{p.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}


export default function StatsList() {
  const { weeks } = useData()
  const router = useRouter()

  const totalParticipants = weeks.reduce((s, w) => s + getStats(w.id).participants, 0)
  const totalSubmissions  = weeks.reduce((s, w) => s + getStats(w.id).submissions, 0)
  const activeContests    = weeks.filter(w => w.active).length

  /* Build trend series: history + real weeks */
  const trendData = [
    ...HISTORY,
    ...weeks
      .filter(w => getStats(w.id).participants > 0)
      .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''))
      .map(w => ({
        contest: w.title,
        participants: getStats(w.id).participants,
        submissions:  getStats(w.id).submissions,
      })),
  ]

  return (
    <div className="flex flex-col min-h-full">
      {/* Header with inline KPI strip */}
      <div className="h-16 bg-white border-b border-slate-200/80 flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-bold text-slate-900">Analytics</h1>
        </div>
        <div className="flex items-center divide-x divide-slate-200">
          {[
            { label: 'Contests',     value: weeks.length,                       color: 'text-slate-900' },
            { label: 'Active',       value: activeContests,                     color: 'text-emerald-600' },
            { label: 'Participants', value: totalParticipants.toLocaleString(), color: 'text-slate-900' },
            { label: 'Submissions',  value: totalSubmissions.toLocaleString(),  color: 'text-amber-600' },
          ].map(k => (
            <div key={k.label} className="flex items-baseline gap-1.5 px-5">
              <span className={`text-lg font-bold tabular-nums ${k.color}`}>{k.value}</span>
              <span className="text-xs text-slate-400">{k.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 px-8 py-6 flex flex-col gap-6">
        {/* ── Participation trend ── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="mb-5">
            <h2 className="font-bold text-slate-900">Participation Trend</h2>
            <p className="text-xs text-slate-500 mt-0.5">How participant count and submissions are growing or declining across contests</p>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={trendData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gprt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gsub" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="contest" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={36} />
              <Tooltip content={<ChartTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: 16, fontSize: 12 }}
                formatter={v => <span style={{ color: '#64748b' }}>{v}</span>}
              />
              <Area
                type="monotone" dataKey="participants" name="Participants"
                stroke="#6366f1" strokeWidth={2.5} fill="url(#gprt)"
                dot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
              <Area
                type="monotone" dataKey="submissions" name="Submissions"
                stroke="#8b5cf6" strokeWidth={2} fill="url(#gsub)" strokeDasharray="5 3"
                dot={{ r: 3, fill: '#8b5cf6', strokeWidth: 0 }}
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* ── Difficulty solve rates ── */}
        {/* Contest table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-900">All Contests</h2>
            <p className="text-xs text-slate-500 mt-0.5">Click a row to drill into full contest analytics</p>
          </div>

          {weeks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
              <p className="text-sm font-semibold text-slate-600">No contests yet</p>
              <p className="text-xs">Create a weekly challenge to start tracking analytics</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  {['Contest','Status','Problems','Participants','Submissions','Avg Score','Top Score','Schedule'].map(h => (
                    <th key={h} className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {weeks.map(w => {
                  const s = getStats(w.id)
                  const maxPts = w.problems.reduce((sum, p) => sum + (p.maxScore || 100), 0) || 100
                  return (
                    <tr key={w.id} onClick={() => router.push(`/statistics/${w.id}`)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors group">
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-slate-800 group-hover:text-slate-900 transition-colors">{w.title}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
                          w.active ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60' : 'bg-slate-100 text-slate-500'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${w.active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {w.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 font-medium">{w.problems.length}</td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-700 tabular-nums">{s.participants.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 tabular-nums">{s.submissions.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        {s.participants > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 max-w-20 bg-slate-100 rounded-full h-1.5">
                              <div className="bg-slate-700 h-1.5 rounded-full" style={{ width: `${Math.min(100,(s.avgScore/maxPts)*100)}%` }} />
                            </div>
                            <span className="text-sm font-semibold text-slate-700 tabular-nums">{s.avgScore}</span>
                          </div>
                        ) : <span className="text-sm text-slate-400">—</span>}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-700 tabular-nums">
                        {s.topScore > 0 ? s.topScore : '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 tabular-nums">
                        {w.startDate ? `${w.startDate} · ${w.startTime || '10:00'}` : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
