'use client'

import { useCallback, useEffect, useState } from 'react'
import { listUsers, banUser, unbanUser, type AdminUserRow } from '@/lib/moderation'

export default function Participants() {
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<number | null>(null)

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

  async function toggleBan(user: AdminUserRow) {
    if (user.isBanned) {
      if (!confirm(`Lift the ban on ${user.username}? They will be able to submit again.`)) return
      setPending(user.id)
      try {
        await unbanUser(user.id)
        await load(search)
      } catch (e) {
        alert(e instanceof Error ? e.message : 'Could not unban.')
      } finally {
        setPending(null)
      }
      return
    }

    const reason = prompt(`Why is ${user.username} being banned? This is shown to them when they try to submit.`)
    if (reason === null) return

    setPending(user.id)
    try {
      await banUser(user.id, reason.trim())
      await load(search)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not ban.')
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
          Banning blocks a participant from submitting and running code. It does not remove points they
          already earned, invalidate their submissions individually for that.
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
                  <tr key={user.id} className={user.isBanned ? 'bg-rose-50/40' : 'hover:bg-slate-50/60'}>
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
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => toggleBan(user)}
                        disabled={pending === user.id}
                        className={`px-3 py-1.5 text-xs font-bold border rounded-lg transition-colors disabled:opacity-40 ${
                          user.isBanned
                            ? 'border-slate-200 text-slate-600 hover:bg-slate-50'
                            : 'border-slate-200 text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600'
                        }`}
                      >
                        {pending === user.id ? 'Saving...' : user.isBanned ? 'Unban' : 'Ban'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
