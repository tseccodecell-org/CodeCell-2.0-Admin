'use client'

import { useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useData } from '@/context/DataContext'

// test bench for a single problem: run with custom input, or make a real
// submission and see the per-testcase verdicts — without touching the main frontend

const LANGUAGES = [
  { id: 'CPP', label: 'C++' },
  { id: 'JAVA', label: 'Java' },
  { id: 'PYTHON', label: 'Python 3' },
]

const STARTER: Record<string, string> = {
  CPP: `#include <iostream>\nusing namespace std;\n\nint main() {\n    // read from stdin, print to stdout\n    return 0;\n}`,
  JAVA: `public class Main {\n    public static void main(String[] args) {\n        // read from stdin, print to stdout\n    }\n}`,
  PYTHON: `# read from stdin, print to stdout\n`,
}

const VERDICT_STYLE: Record<string, string> = {
  ACCEPTED:              'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60',
  WRONG_ANSWER:          'bg-rose-50 text-rose-700 ring-1 ring-rose-200/60',
  TIME_LIMIT_EXCEEDED:   'bg-amber-50 text-amber-700 ring-1 ring-amber-200/60',
  MEMORY_LIMIT_EXCEEDED: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/60',
  RUNTIME_ERROR:         'bg-rose-50 text-rose-700 ring-1 ring-rose-200/60',
  COMPILATION_ERROR:     'bg-rose-50 text-rose-700 ring-1 ring-rose-200/60',
  SYSTEM_ERROR:          'bg-violet-50 text-violet-700 ring-1 ring-violet-200/60',
  SKIPPED:               'bg-slate-100 text-slate-500',
}

function VerdictBadge({ verdict }: { verdict?: string }) {
  return (
    <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full ${VERDICT_STYLE[verdict || ''] || 'bg-slate-100 text-slate-600'}`}>
      {verdict?.replaceAll('_', ' ')}
    </span>
  )
}

function formatMemory(kb?: number | null) {
  if (kb == null) return '—'
  return `${(kb / 1024).toFixed(1)} MB`
}

const fieldCls = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 bg-white'

interface TestResultRow {
  orderNum: number
  verdict: string
  timeMs?: number | null
  memoryKb?: number | null
}

interface RunResult {
  status: string
  stdout?: string | null
  stderr?: string | null
  executionTimeMs?: number | null
}

interface Submission {
  status: string
  verdict?: string
  executionTimeMs?: number | null
  memoryUsedKb?: number | null
  errorMessage?: string
  testResults?: TestResultRow[]
}

export default function ProblemTest() {
  const { weekId, problemId } = useParams<{ weekId: string; problemId: string }>()
  const { weeks } = useData()

  const week = weeks.find(w => w.id === weekId)
  const problem = week?.problems.find(p => p.id === problemId)

  const [language, setLanguage] = useState('CPP')
  const [code, setCode] = useState(STARTER['CPP'])
  const [stdin, setStdin] = useState('')
  const [busy, setBusy] = useState(false)
  const [runResult, setRunResult] = useState<RunResult | null>(null)   // { status, stdout, stderr, executionTimeMs }
  const [submission, setSubmission] = useState<Submission | null>(null) // { status, verdict, testResults, ... }
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }

  function pickLanguage(lang: string) {
    setLanguage(lang)
    setCode(STARTER[lang])
  }

  // polls `url` every second until status is COMPLETED/FAILED, then hands the data over
  function pollUntilDone(url: string, onData: (data: any) => void) {
    let tries = 0
    stopPolling()
    pollRef.current = setInterval(async () => {
      tries++
      try {
        const res = await fetch(url, { credentials: 'include' })
        const body = await res.json()
        if (!body.success) return
        onData(body.data)
        if (body.data.status === 'COMPLETED' || body.data.status === 'FAILED' || tries > 30) {
          stopPolling()
          setBusy(false)
        }
      } catch {
        // backend hiccup, keep polling until the cap
      }
      if (tries > 30) { stopPolling(); setBusy(false) }
    }, 1000)
  }

  async function handleRun() {
    if (!code.trim() || busy) return
    setBusy(true)
    setRunResult({ status: 'QUEUED' })
    setSubmission(null)
    try {
      const res = await fetch(`/api/admin/problems/${problemId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language, sourceCode: code, stdin }),
        credentials: 'include',
      })
      const body = await res.json()
      if (!body.success) throw new Error(body.error?.message || res.status)
      pollUntilDone(`/api/admin/runs/${body.data.runId}`, setRunResult)
    } catch (e: any) {
      alert(`run failed: ${e.message}`)
      setBusy(false)
      setRunResult(null)
    }
  }

  async function handleSubmit() {
    if (!code.trim() || busy) return
    setBusy(true)
    setSubmission({ status: 'QUEUED' })
    setRunResult(null)
    try {
      const res = await fetch(`/api/admin/problems/${problemId}/test-submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language, sourceCode: code }),
        credentials: 'include',
      })
      if (!res.ok) throw new Error(await res.text())
      const body = await res.json()
      pollUntilDone(`/api/admin/test-submissions/${body.data.submissionId}`, setSubmission)
    } catch (e: any) {
      alert(`submit failed: ${e.message}`)
      setBusy(false)
      setSubmission(null)
    }
  }

  if (!week || !problem) return (
    <div className="flex items-center justify-center h-full text-slate-400 text-sm">Problem not found.</div>
  )

  return (
    <div className="flex flex-col min-h-full">
      {/* Breadcrumb */}
      <div className="h-auto sm:h-16 bg-white border-b border-slate-200/80 flex flex-wrap items-center px-4 sm:px-8 py-3 sm:py-0 gap-2 shrink-0">
        <Link href="/challenges" className="text-sm text-slate-400 hover:text-slate-700 font-medium">Weekly Challenges</Link>
        <span className="text-slate-300">/</span>
        <Link href={`/challenges/${weekId}`} className="text-sm text-slate-400 hover:text-slate-700 font-medium">{week.title}</Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-semibold text-slate-900">Test: {problem.name}</span>
      </div>

      <div className="flex-1 p-4 sm:p-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* left — editor */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <select value={language} onChange={e => pickLanguage(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-slate-400">
              {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
            </select>
            <span className="text-xs text-slate-400">{problem.difficulty} · {problem.basePoints} pts</span>
          </div>

          <textarea value={code} onChange={e => setCode(e.target.value)} spellCheck={false} rows={18}
            className={`${fieldCls} font-mono resize-y`} placeholder="write your solution here..." />

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Custom input (used by Run, leave empty for the sample input)
            </label>
            <textarea value={stdin} onChange={e => setStdin(e.target.value)} spellCheck={false} rows={3}
              className={`${fieldCls} font-mono resize-y`} placeholder="stdin for your program..." />
          </div>

          <div className="flex gap-2">
            <button onClick={handleRun} disabled={busy}
              className="px-5 py-2 text-sm font-semibold border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-40">
              {busy ? 'working…' : 'Run ▶'}
            </button>
            <button onClick={handleSubmit} disabled={busy}
              className="px-5 py-2 text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg disabled:opacity-40">
              Submit
            </button>
          </div>
        </div>

        {/* right — results */}
        <div className="flex flex-col gap-4">
          {!runResult && !submission && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-24 text-slate-400 gap-1">
              <p className="text-sm font-semibold text-slate-500">Run or submit to see results</p>
              <p className="text-xs">Run = custom input · Submit = judged against all testcases</p>
            </div>
          )}

          {runResult && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-sm font-bold text-slate-800">Run result</h3>
                <span className="text-xs text-slate-500">{runResult.status}</span>
                {runResult.executionTimeMs != null && <span className="text-xs text-slate-500">⏱ {runResult.executionTimeMs} ms</span>}
              </div>
              {runResult.stdout != null && (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">stdout</p>
                  <pre className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm font-mono text-slate-800 whitespace-pre-wrap min-h-10">{runResult.stdout || ' '}</pre>
                </div>
              )}
              {runResult.stderr && (
                <div>
                  <p className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-1">stderr</p>
                  <pre className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm font-mono text-rose-700 whitespace-pre-wrap">{runResult.stderr}</pre>
                </div>
              )}
            </div>
          )}

          {submission && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-sm font-bold text-slate-800">Submission</h3>
                <span className="text-xs text-slate-500">{submission.status}</span>
                {submission.verdict && submission.status === 'COMPLETED' && <VerdictBadge verdict={submission.verdict} />}
                {submission.executionTimeMs != null && <span className="text-xs text-slate-500">⏱ {submission.executionTimeMs} ms</span>}
                {submission.memoryUsedKb != null && <span className="text-xs text-slate-500">📦 {formatMemory(submission.memoryUsedKb)}</span>}
              </div>

              {submission.errorMessage && (
                <div>
                  <p className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-1">
                    {submission.verdict === 'COMPILATION_ERROR' ? 'compiler output' : 'error output'}
                  </p>
                  <pre className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm font-mono text-rose-700 whitespace-pre-wrap max-h-64 overflow-y-auto">{submission.errorMessage}</pre>
                </div>
              )}

              {submission.testResults?.length ? (
                <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border border-slate-200 rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-2.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">#</th>
                      <th className="px-4 py-2.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Verdict</th>
                      <th className="px-4 py-2.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Time</th>
                      <th className="px-4 py-2.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Memory</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {submission.testResults.map(tc => (
                      <tr key={tc.orderNum}>
                        <td className="px-4 py-2.5 text-slate-500 tabular-nums">TC {tc.orderNum + 1}</td>
                        <td className="px-4 py-2.5"><VerdictBadge verdict={tc.verdict} /></td>
                        <td className="px-4 py-2.5 text-slate-600 tabular-nums">{tc.timeMs != null ? `${tc.timeMs} ms` : '—'}</td>
                        <td className="px-4 py-2.5 text-slate-600 tabular-nums">{formatMemory(tc.memoryKb)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
