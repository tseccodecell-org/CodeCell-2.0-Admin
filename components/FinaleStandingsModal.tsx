'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AuthError } from '@/lib/auth'
import { getAdminStandings, type Standings, type StandingsCell, type StandingsProblem } from '@/lib/finales'

const REFRESH_MS = 10000

export function formatContestTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(secs)}` : `${minutes}:${pad(secs)}`
}

function firstSolves(standings: Standings): Map<string, number> {
  const first = new Map<string, number>()
  for (const row of standings.rows ?? []) {
    for (const cell of row.cells ?? []) {
      if (!cell.solved || cell.solvedAtSeconds === undefined) continue
      const best = first.get(cell.problemId)
      if (best === undefined || cell.solvedAtSeconds < best) first.set(cell.problemId, cell.solvedAtSeconds)
    }
  }
  return first
}

function cellLabel(problem: StandingsProblem, cell: StandingsCell): string {
  const tries = cell.wrongAttempts > 0 ? `${cell.wrongAttempts} wrong ${cell.wrongAttempts === 1 ? 'attempt' : 'attempts'}` : ''
  if (cell.solved) {
    return `Problem ${problem.label} solved at ${formatContestTime(cell.solvedAtSeconds ?? 0)}${tries ? ` after ${tries}` : ''}`
  }
  if (cell.pending) return `Problem ${problem.label} being judged${tries ? `, ${tries} so far` : ''}`
  if (tries) return `Problem ${problem.label} not solved, ${tries}`
  return `Problem ${problem.label} not attempted`
}

function Cell({ problem, cell, first }: { problem: StandingsProblem; cell: StandingsCell; first: boolean }) {
  const label = cellLabel(problem, cell)
  if (cell.solved) {
    return (
      <div
        title={label}
        aria-label={label}
        className={`mx-auto flex w-16 flex-col items-center rounded-md py-1 ${
          first ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700'
        }`}
      >
        <span className="text-sm font-bold leading-tight">{cell.points}</span>
        <span className={`font-mono text-[10px] leading-tight ${first ? 'text-emerald-50' : 'text-emerald-600'}`}>
          {formatContestTime(cell.solvedAtSeconds ?? 0)}
          {cell.wrongAttempts > 0 && ` (+${cell.wrongAttempts})`}
        </span>
      </div>
    )
  }
  if (cell.wrongAttempts > 0 || cell.pending) {
    return (
      <div title={label} aria-label={label} className="mx-auto flex w-16 flex-col items-center rounded-md bg-rose-50 py-1">
        {cell.wrongAttempts > 0 && <span className="text-sm font-bold leading-tight text-rose-600">-{cell.wrongAttempts}</span>}
        {cell.pending && <span className="text-[10px] font-semibold leading-tight text-amber-600">judging</span>}
      </div>
    )
  }
  return (
    <span aria-label={label} className="text-slate-300">
      .
    </span>
  )
}

export default function FinaleStandingsModal({
  weekId,
  title,
  onClose,
}: {
  weekId: string
  title: string
  onClose: () => void
}) {
  const [standings, setStandings] = useState<Standings | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const closeRef = useRef<HTMLButtonElement>(null)

  const load = useCallback(async () => {
    try {
      setStandings(await getAdminStandings(weekId))
      setError(null)
      setUpdatedAt(Date.now())
    } catch (e) {
      if (e instanceof AuthError && e.status === 404) {
        setError('The server running now cannot show standings to admins yet. Rebuild and restart the backend.')
        return
      }
      setError(e instanceof Error ? e.message : 'Could not load the standings.')
    }
  }, [weekId])

  useEffect(() => {
    load()
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') load()
    }, REFRESH_MS)
    return () => clearInterval(timer)
  }, [load])

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [onClose])

  const problems = standings?.problems ?? []
  const rows = standings?.rows ?? []
  const first = standings ? firstSolves(standings) : new Map<string, number>()
  const secondsAgo = updatedAt ? Math.max(0, Math.round((now - updatedAt) / 1000)) : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center bg-black/50 sm:p-6"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="standings-title"
        className="flex w-full max-w-6xl flex-col bg-white sm:max-h-[90vh] sm:rounded-xl sm:shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id="standings-title" className="truncate text-base font-bold text-slate-900">
              Live standings
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {title}
              {secondsAgo !== null && <span className="text-slate-400">, updated {secondsAgo}s ago</span>}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={load}
              className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
            >
              Refresh
            </button>
            <button
              ref={closeRef}
              onClick={onClose}
              aria-label="Close standings"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {error && <p role="alert" className="px-4 sm:px-6 py-4 text-sm text-rose-600">{error}</p>}
          {!standings && !error && <p className="px-4 sm:px-6 py-10 text-sm text-slate-400">Loading standings...</p>}
          {standings && rows.length === 0 && (
            <p className="px-4 sm:px-6 py-10 text-sm text-slate-500">Nobody has a seat yet, so there is no one to rank.</p>
          )}
          {rows.length > 0 && (
            <table className="w-full border-separate border-spacing-0 text-sm">
              <thead className="sticky top-0 z-20">
                <tr className="bg-slate-50 text-xs text-slate-500">
                  <th className="sticky left-0 z-10 w-12 border-b border-slate-200 bg-slate-50 px-3 py-2.5 text-center font-semibold">
                    #
                  </th>
                  <th className="sticky left-12 z-10 min-w-40 border-b border-r border-slate-200 bg-slate-50 px-3 py-2.5 text-left font-semibold">
                    Participant
                  </th>
                  <th className="border-b border-slate-200 px-3 py-2.5 text-center font-semibold">Score</th>
                  <th className="border-b border-slate-200 px-3 py-2.5 text-center font-semibold">Penalty</th>
                  {problems.map(p => (
                    <th
                      key={p.id}
                      title={p.title ? `${p.label}. ${p.title}` : p.label}
                      className="min-w-20 border-b border-slate-200 px-2 py-2.5 text-center font-semibold"
                    >
                      <div className="text-slate-800">{p.label}</div>
                      <div className="font-normal text-slate-400">{p.points}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(row => {
                  const byProblem = new Map((row.cells ?? []).map(c => [c.problemId, c]))
                  return (
                    <tr key={row.userId} className="group">
                      <td className="sticky left-0 z-10 border-b border-slate-100 bg-white px-3 py-2 text-center font-mono font-bold text-slate-700 group-hover:bg-slate-50">
                        {row.rank}
                      </td>
                      <td className="sticky left-12 z-10 border-b border-r border-slate-100 bg-white px-3 py-2 group-hover:bg-slate-50">
                        <div className="max-w-48 truncate font-semibold text-slate-800">{row.name}</div>
                        {row.username && <div className="max-w-48 truncate font-mono text-xs text-slate-400">@{row.username}</div>}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2 text-center group-hover:bg-slate-50">
                        <div className="font-bold text-slate-900">{row.score}</div>
                        <div className="text-[10px] text-slate-400">{row.solved} solved</div>
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2 text-center font-mono text-xs text-slate-500 group-hover:bg-slate-50">
                        {row.solved > 0 ? formatContestTime(row.penaltySeconds) : '0:00'}
                      </td>
                      {problems.map(p => {
                        const cell =
                          byProblem.get(p.id) ?? { problemId: p.id, solved: false, points: 0, wrongAttempts: 0, pending: false }
                        const isFirst = cell.solved && cell.solvedAtSeconds !== undefined && first.get(p.id) === cell.solvedAtSeconds
                        return (
                          <td key={p.id} className="border-b border-slate-100 px-2 py-2 text-center group-hover:bg-slate-50">
                            <Cell problem={p} cell={cell} first={isFirst} />
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-slate-100 px-4 py-3 text-xs text-slate-500 sm:px-6">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-emerald-600" /> First to solve
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-emerald-50 ring-1 ring-emerald-200" /> Solved, with time and wrong tries
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-rose-50 ring-1 ring-rose-200" /> Wrong attempts
          </span>
          <span className="text-slate-400">Ranked by score, then penalty. Refreshes every 10s.</span>
        </div>
      </div>
    </div>
  )
}
