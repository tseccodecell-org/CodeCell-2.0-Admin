'use client'

import { useCallback, useEffect, useState } from 'react'
import { getProblemAnalytics, type ProblemAnalytics } from '@/lib/analytics'

const SEVERITY_STYLE: Record<string, string> = {
  critical: 'bg-rose-50 border-rose-200 text-rose-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  info: 'bg-sky-50 border-sky-200 text-sky-800',
}

const SEVERITY_DOT: Record<string, string> = {
  critical: 'bg-rose-500',
  warning: 'bg-amber-500',
  info: 'bg-sky-500',
}

const VERDICT_SHORT: Record<string, string> = {
  ACCEPTED: 'AC',
  WRONG_ANSWER: 'WA',
  TIME_LIMIT_EXCEEDED: 'TLE',
  MEMORY_LIMIT_EXCEEDED: 'MLE',
  RUNTIME_ERROR: 'RE',
  COMPILATION_ERROR: 'CE',
  SYSTEM_ERROR: 'SYS',
}

function percent(value: number) {
  return `${Math.round(value * 100)}%`
}

function Metric({ label, value, tone = 'text-slate-900' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="bg-slate-50 rounded-lg border border-slate-200 px-4 py-3">
      <p className={`text-xl font-bold tabular-nums ${tone}`}>{value}</p>
      <p className="text-[11px] text-slate-500 mt-0.5">{label}</p>
    </div>
  )
}

export default function ProblemDiagnostics({ problemId }: { problemId: string }) {
  const [data, setData] = useState<ProblemAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getProblemAnalytics(problemId)
      setData(result)
      setError(null)
    } catch (e) {
      setData(null)
      setError(e instanceof Error ? e.message : 'Could not load diagnostics.')
    } finally {
      setLoading(false)
    }
  }, [problemId])

  useEffect(() => { load() }, [load])

  if (loading) {
    return <div className="px-6 py-10 text-sm text-slate-400">Loading diagnostics...</div>
  }

  if (error || !data) {
    return (
      <div className="px-6 py-10 flex flex-col items-start gap-3">
        <p className="text-sm text-rose-600">{error}</p>
        <button onClick={load} className="text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg px-3 py-1.5 hover:bg-slate-100">
          Retry
        </button>
      </div>
    )
  }

  const { overview, healthFlags, testCaseFailures, languageVerdicts, runtime } = data
  const worstTestCase = testCaseFailures.reduce<number>((max, t) => Math.max(max, t.failureRate), 0)

  return (
    <div className="px-4 sm:px-6 py-5 flex flex-col gap-6">
      {healthFlags.length === 0 ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-start gap-2.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
          <p className="text-sm text-emerald-800">
            Nothing looks wrong with this problem based on the submissions so far.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {healthFlags.map((flag, i) => (
            <div key={`${flag.code}-${i}`} className={`rounded-lg border px-4 py-3 flex items-start gap-2.5 ${SEVERITY_STYLE[flag.severity]}`}>
              <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${SEVERITY_DOT[flag.severity]}`} />
              <p className="text-sm">{flag.message}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="Participants" value={overview.participants.toLocaleString()} />
        <Metric label="Solved" value={overview.acceptedUsers.toLocaleString()} tone="text-emerald-600" />
        <Metric label="Acceptance" value={percent(overview.acceptanceRate)} />
        <Metric label="Avg Attempts" value={overview.averageAttempts.toFixed(1)} tone="text-amber-600" />
      </div>

      <div>
        <h4 className="font-bold text-slate-900 text-sm">Test Case Failures</h4>
        <p className="text-xs text-slate-500 mt-0.5 mb-3">
          One test failing far more than its neighbours usually means its expected output is wrong.
        </p>
        {testCaseFailures.length === 0 ? (
          <p className="text-sm text-slate-400">No judged submissions yet.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {testCaseFailures.map(tc => {
              const isWorst = tc.failureRate === worstTestCase && tc.failureRate >= 0.8 && tc.attempts >= 5
              return (
                <div key={tc.testCaseId} className="flex items-center gap-3">
                  <span className="text-xs font-mono text-slate-500 w-16 shrink-0">
                    Test {tc.orderNum + 1}
                    {tc.isSample && <span className="text-slate-400"> S</span>}
                  </span>
                  <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full ${isWorst ? 'bg-rose-500' : tc.failureRate >= 0.5 ? 'bg-amber-500' : 'bg-slate-400'}`}
                      style={{ width: `${Math.min(100, tc.failureRate * 100)}%` }}
                    />
                  </div>
                  <span className={`text-xs tabular-nums w-28 text-right shrink-0 ${isWorst ? 'font-bold text-rose-700' : 'text-slate-600'}`}>
                    {percent(tc.failureRate)} of {tc.attempts.toLocaleString()}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div>
        <h4 className="font-bold text-slate-900 text-sm">Verdicts By Language</h4>
        <p className="text-xs text-slate-500 mt-0.5 mb-3">
          A language that never passes while others do points at its time limit or starter code.
        </p>
        {languageVerdicts.length === 0 ? (
          <p className="text-sm text-slate-400">No submissions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  {['Language', 'Total', 'Accepted', 'Breakdown'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {languageVerdicts.map(l => (
                  <tr key={l.language} className={l.accepted === 0 && l.total >= 5 ? 'bg-rose-50/40' : ''}>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-800 whitespace-nowrap">{l.language}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 tabular-nums">{l.total.toLocaleString()}</td>
                    <td className={`px-4 py-3 text-sm tabular-nums font-semibold ${l.accepted === 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {l.accepted.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(l.verdicts)
                          .sort((a, b) => b[1] - a[1])
                          .map(([verdict, count]) => (
                            <span key={verdict} className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 whitespace-nowrap">
                              {VERDICT_SHORT[verdict] || verdict} {count}
                            </span>
                          ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h4 className="font-bold text-slate-900 text-sm">Runtime Against The Limit</h4>
        <p className="text-xs text-slate-500 mt-0.5 mb-3">
          Accepted solutions crowding the limit means correct but slower ones are being rejected.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Metric label="Time Limit" value={`${runtime.timeLimitMs} ms`} />
          <Metric label="Slowest Accepted" value={`${runtime.maxTimeMs} ms`} />
          <Metric label="Average Accepted" value={`${Math.round(runtime.avgTimeMs)} ms`} />
          <Metric
            label="Near The Limit"
            value={runtime.acceptedCount > 0 ? `${runtime.nearLimit} of ${runtime.acceptedCount}` : 'none'}
            tone={runtime.nearLimit > 0 ? 'text-amber-600' : 'text-slate-900'}
          />
        </div>
      </div>
    </div>
  )
}
