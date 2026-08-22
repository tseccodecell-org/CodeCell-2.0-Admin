'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useData } from '@/context/DataContext'
import { getOverview, type AnalyticsOverview } from '@/lib/analytics'
import { listAllUsers } from '@/lib/moderation'
import DownloadPdfButton from '@/components/DownloadPdfButton'
import { buildOverallReport, buildLeaderboardReport, save } from '@/lib/pdf/reports'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

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

function percent(value: number) {
  return `${Math.round(value * 100)}%`
}

export default function StatsList() {
  const { weeks } = useData()
  const router = useRouter()

  const [data, setData] = useState<AnalyticsOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const overview = await getOverview()
      setData(overview)
      setError(null)
    } catch (e) {
      setData(null)
      setError(e instanceof Error ? e.message : 'Could not load analytics.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const titleByWeekId = useMemo(() => {
    const map = new Map<string, string>()
    for (const w of weeks) map.set(w.id, w.title)
    return map
  }, [weeks])

  const statsByWeekId = useMemo(() => {
    const map = new Map<string, AnalyticsOverview['weeklyTrend'][number]>()
    for (const t of data?.weeklyTrend ?? []) map.set(t.weekId, t)
    return map
  }, [data])

  const trendData = useMemo(
    () =>
      (data?.weeklyTrend ?? [])
        .slice()
        .sort((a, b) => a.weekNumber - b.weekNumber)
        .map(t => ({
          contest: titleByWeekId.get(t.weekId) || `Week ${t.weekNumber}`,
          participants: t.participants,
          submissions: t.submissions,
        })),
    [data, titleByWeekId]
  )

  const kpis = [
    { label: 'Contests', value: data?.totalWeeks ?? 0, color: 'text-slate-900' },
    { label: 'Active', value: data?.activeWeeks ?? 0, color: 'text-emerald-600' },
    { label: 'Participants', value: (data?.totalUsers ?? 0).toLocaleString(), color: 'text-slate-900' },
    { label: 'Submissions', value: (data?.totalSubmissions ?? 0).toLocaleString(), color: 'text-amber-600' },
  ]

  return (
    <div className="flex flex-col min-h-full">
      <div className="h-auto sm:h-16 bg-white border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-8 py-3 sm:py-0 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-bold text-slate-900">Analytics</h1>
          <DownloadPdfButton
            label="Overall stats"
            variant="ghost"
            onDownload={async () => {
              if (!data) throw new Error("Analytics are still loading.")
              save(buildOverallReport(data), "contest-overall-stats.pdf")
            }}
          />
          <DownloadPdfButton
            label="Leaderboard"
            variant="ghost"
            onDownload={async () => {
              const all = await listAllUsers()
              save(buildLeaderboardReport(all, "Season standings"), "leaderboard.pdf")
            }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          {kpis.map(k => (
            <div key={k.label} className="flex items-baseline gap-1.5">
              <span className={`text-lg font-bold tabular-nums ${k.color}`}>{k.value}</span>
              <span className="text-xs text-slate-400">{k.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 px-4 sm:px-8 py-6 flex flex-col gap-6">
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-rose-700">{error}</p>
            <button
              onClick={load}
              className="text-xs font-semibold text-rose-700 border border-rose-300 rounded-lg px-3 py-1.5 hover:bg-rose-100"
            >
              Retry
            </button>
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6">
          <div className="mb-5">
            <h2 className="font-bold text-slate-900">Participation Trend</h2>
            <p className="text-xs text-slate-500 mt-0.5">Participants and submissions per contest week</p>
          </div>

          {loading ? (
            <div className="h-65 flex items-center justify-center text-sm text-slate-400">Loading analytics...</div>
          ) : trendData.length === 0 ? (
            <div className="h-65 flex flex-col items-center justify-center gap-2 text-slate-400">
              <p className="text-sm font-semibold text-slate-600">No submission activity yet</p>
              <p className="text-xs">The trend appears once participants start submitting</p>
            </div>
          ) : (
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
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-900">All Contests</h2>
            <p className="text-xs text-slate-500 mt-0.5">Click a row to drill into full contest analytics</p>
          </div>

          {weeks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
              <p className="text-sm font-semibold text-slate-600">No contests yet</p>
              <p className="text-xs">Create a weekly challenge to start tracking analytics</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200">
                    {['Contest','Status','Problems','Participants','Submissions','Accepted','Acceptance','Schedule'].map(h => (
                      <th key={h} className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {weeks.map(w => {
                    const s = statsByWeekId.get(w.id)
                    const participants = s?.participants ?? 0
                    const submissions = s?.submissions ?? 0
                    const accepted = s?.accepted ?? 0
                    const rate = submissions > 0 ? accepted / submissions : 0

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
                        <td className="px-6 py-4 text-sm font-bold text-slate-700 tabular-nums">{participants.toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm text-slate-600 tabular-nums">{submissions.toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm text-slate-600 tabular-nums">{accepted.toLocaleString()}</td>
                        <td className="px-6 py-4">
                          {submissions > 0 ? (
                            <div className="flex items-center gap-2">
                              <div className="flex-1 max-w-20 bg-slate-100 rounded-full h-1.5">
                                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, rate * 100)}%` }} />
                              </div>
                              <span className="text-sm font-semibold text-slate-700 tabular-nums">{percent(rate)}</span>
                            </div>
                          ) : <span className="text-sm text-slate-400">none yet</span>}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500 tabular-nums whitespace-nowrap">
                          {w.startDate ? `${w.startDate}, ${w.startTime || '10:00'}` : 'not scheduled'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
