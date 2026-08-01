'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Toast, { type ToastState } from '@/components/Toast'
import ReasonModal from '@/components/ReasonModal'
import { listUsers, banUser, unbanUser, type AdminUserRow } from '@/lib/moderation'

export default function Participants() {
  const router = useRouter()
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<number | null>(null)
  const [target, setTarget] = useState<AdminUserRow | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)

  const load = useCallback(async (term: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = await listUsers(term)
      setUsers(data.users ?? [])
      setTotal(data.total ?? 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load participants.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => load(search), 300)
    return () => clearTimeout(timer)
  }, [search, load])

  async function confirmBan(reason: string) {
    if (!target) return
    const user = target
    setPending(user.id)
    try {
      if (user.isBanned) {
        await unbanUser(user.id)
        setToast({ message: `Ban lifted on @${user.username}`, kind: 'success' })
      } else {
        await banUser(user.id, reason)
        setToast({ message: `@${user.username} is banned`, kind: 'success' })
      }
      setTarget(null)
      await load(search)
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : 'That did not work. Try again.', kind: 'error' })
    } finally {
      setPending(null)
    }
  }

  const bannedCount = users.filter(u => u.isBanned).length

  return (
    <div className="flex flex-col min-h-full">
      <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-bold text-slate-900">Participants</h1>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{total}</span>
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search name, username or email..."
          className="w-72 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400"
        />
      </div>

      <div className="px-8 py-3 border-b border-slate-200/70 bg-white">
        <p className="text-sm text-slate-500">
          Banning blocks a participant from submitting and running code. Open a participant to see their
          submissions, issue warnings or invalidate individual attempts.
          {bannedCount > 0 && (
            <span className="ml-1 font-semibold text-rose-600">{bannedCount} banned on this page.</span>
          )}
        </p>
      </div>

      <div className="flex-1 p-8 overflow-auto">
        {loading && users.length === 0 && (
          <p className="text-sm text-slate-400">Loading participants...</p>
        )}

        {error && <p className="text-sm text-rose-600">{error}</p>}

        {!loading && !error && users.length === 0 && (
          <p className="text-sm text-slate-400">
            {search ? 'No participants match that search.' : 'No participants yet.'}
          </p>
        )}

        {users.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Participant</th>
                  <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Email</th>
                  <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">College</th>
                  <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Rating</th>
                  <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-3.5 text-right" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map(user => (
                  <tr
                    key={user.id}
                    onClick={() => router.push(`/participants/${user.id}`)}
                    className={`cursor-pointer ${user.isBanned ? 'bg-rose-50/40' : 'hover:bg-slate-50/60'}`}
                  >
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-slate-800">{user.name || user.username}</p>
                      <p className="text-xs text-slate-400 font-mono">@{user.username}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{user.email}</td>
                    <td className="px-6 py-4">
                      {user.isTsecUser ? (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-900 text-white">TSEC</span>
                      ) : (
                        <span className="text-xs text-slate-500">{user.collegeName || 'Other'}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700 tabular-nums">{user.rating}</td>
                    <td className="px-6 py-4">
                      {user.isBanned ? (
                        <div>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-rose-100 text-rose-700">Banned</span>
                          {user.banReason && (
                            <p className="text-xs text-slate-500 mt-1 max-w-xs">{user.banReason}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700">Active</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={e => { e.stopPropagation(); setTarget(user) }}
                          disabled={pending === user.id}
                          className={`px-3 py-1.5 text-xs font-bold border rounded-lg transition-colors disabled:opacity-40 ${
                            user.isBanned
                              ? 'border-slate-200 text-slate-600 hover:bg-slate-50'
                              : 'border-slate-200 text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600'
                          }`}
                        >
                          {pending === user.id ? 'Saving...' : user.isBanned ? 'Unban' : 'Ban'}
                        </button>
                        <svg className="w-4 h-4 text-slate-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

      {target && (
        <ReasonModal
          key={target.id}
          title={target.isBanned ? 'Lift the ban' : 'Ban participant'}
          body={target.isBanned
            ? `@${target.username} will be able to submit and run code again straight away.`
            : `Banning @${target.username} blocks them from submitting and running code until you lift it. Points they already earned stay.`}
          label="Why are they being banned?"
          placeholder="Copied a solution from another participant."
          confirmLabel={target.isBanned ? 'Lift the ban' : 'Ban participant'}
          tone={target.isBanned ? 'neutral' : 'danger'}
          requireReason={!target.isBanned}
          busy={pending === target.id}
          onConfirm={confirmBan}
          onCancel={() => { if (pending === null) setTarget(null) }}
        />
      )}
    </div>
  )
}
