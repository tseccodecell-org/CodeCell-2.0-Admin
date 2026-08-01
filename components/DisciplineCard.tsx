'use client'

import type { AdminUserDetail, AdminWarning } from '@/lib/moderation'

const RUNGS = [
  { label: 'Warning', blurb: 'A written note on the record. The participant sees it the next time they open the site.' },
  { label: 'Invalidation', blurb: 'Individual submissions stop counting towards the score and the leaderboard.' },
  { label: 'Ban', blurb: 'Submitting and running code is blocked entirely until the ban is lifted.' },
]

interface DisciplineCardProps {
  user: AdminUserDetail
  warnings: AdminWarning[]
  invalidatedCount: number
  busy: boolean
  onWarn: () => void
  onRevokeWarning: (warning: AdminWarning) => void
  onBan: () => void
  onUnban: () => void
  onGoToSubmissions: () => void
}

export default function DisciplineCard({
  user, warnings, invalidatedCount, busy, onWarn, onRevokeWarning, onBan, onUnban, onGoToSubmissions,
}: DisciplineCardProps) {
  const done = [warnings.length > 0, invalidatedCount > 0, user.isBanned]
  const next = done.findIndex(d => !d)

  return (
    <div className="max-w-3xl flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Discipline</h2>
        <p className="text-sm text-slate-500 mt-1 leading-relaxed">
          Work down the ladder. Each step is heavier than the one before it, so start with a warning unless
          the behaviour is blatant.
        </p>
      </div>

      <ol className="grid gap-3 sm:grid-cols-3">
        {RUNGS.map((rung, i) => {
          const isNext = i === next
          const isDone = done[i]
          return (
            <li
              key={rung.label}
              className={`rounded-xl border px-4 py-3 ${
                isNext
                  ? 'border-slate-900 bg-slate-900'
                  : isDone
                    ? 'border-slate-200 bg-white'
                    : 'border-dashed border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-5 h-5 shrink-0 rounded-full text-[10px] font-bold flex items-center justify-center ${
                    isNext ? 'bg-white text-slate-900' : isDone ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {isDone ? (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </span>
                <span className={`text-sm font-semibold ${isNext ? 'text-white' : 'text-slate-500'}`}>
                  {rung.label}
                </span>
                {isNext && (
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Next
                  </span>
                )}
                {!isNext && isDone && (
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                    Done
                  </span>
                )}
              </div>
              <p className={`text-xs mt-2 leading-relaxed ${isNext ? 'text-slate-300' : 'text-slate-400'}`}>
                {rung.blurb}
              </p>
            </li>
          )
        })}
      </ol>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-5">
        <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Recommended next action</h3>
        {next === 0 && (
          <p className="text-sm text-slate-600 leading-relaxed">
            Nothing on this record yet. Issue a warning describing what went wrong so the participant knows
            what to fix.
          </p>
        )}
        {next === 1 && (
          <p className="text-sm text-slate-600 leading-relaxed">
            The participant has already been warned. If specific submissions are the problem, invalidate them
            from the Submissions tab so the points stop counting.
          </p>
        )}
        {next === 2 && (
          <p className="text-sm text-slate-600 leading-relaxed">
            Warnings and invalidations have not worked. A ban stops them submitting until you lift it.
          </p>
        )}
        {next === -1 && (
          <p className="text-sm text-slate-600 leading-relaxed">
            Every step has been used. The participant is banned and their flagged submissions no longer count.
          </p>
        )}

        <div className="flex items-center gap-3 mt-4 flex-wrap">
          <button
            onClick={onWarn}
            disabled={busy}
            className="px-4 py-2 text-sm font-semibold border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40"
          >
            Issue a warning
          </button>
          <button
            onClick={onGoToSubmissions}
            className="px-4 py-2 text-sm font-semibold border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Review submissions
          </button>
          {user.isBanned ? (
            <button
              onClick={onUnban}
              disabled={busy}
              className="px-4 py-2 text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors disabled:opacity-40"
            >
              Lift the ban
            </button>
          ) : (
            <button
              onClick={onBan}
              disabled={busy}
              className="px-4 py-2 text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors disabled:opacity-40"
            >
              Ban participant
            </button>
          )}
        </div>
      </div>

      {user.isBanned && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/60 px-6 py-5">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-rose-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            <h3 className="text-sm font-bold text-rose-800">This participant is banned</h3>
          </div>
          <p className="text-sm text-rose-700 mt-2 leading-relaxed">
            {user.banReason || 'No reason was recorded.'}
          </p>
          {user.bannedAt && (
            <p className="text-xs text-rose-600/80 mt-1">Banned on {new Date(user.bannedAt).toLocaleString()}</p>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Warning history</h3>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{warnings.length}</span>
        </div>
        {warnings.length === 0 ? (
          <p className="px-6 py-6 text-sm text-slate-400">No warnings have been issued.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {warnings.map((w, i) => (
              <li key={w.id} className="px-6 py-4 flex items-start gap-4">
                <span className="w-6 h-6 shrink-0 rounded-md bg-amber-50 text-amber-700 text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 leading-relaxed">{w.reason}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(w.issuedAt).toLocaleString()}
                    {w.issuedBy ? ` by ${w.issuedBy}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => onRevokeWarning(w)}
                  disabled={busy}
                  className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40 shrink-0"
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
