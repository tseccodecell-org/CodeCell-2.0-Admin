'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  listAdmins,
  listAuditActions,
  listAuditLogs,
  type AuditAdmin,
  type AuditLog,
} from '@/lib/audit'
import Pagination, { PAGE_SIZE } from '@/components/Pagination'

const ACTION_STYLE: Record<string, string> = {
  BAN_USER: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/60',
  UNBAN_USER: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60',
  WARN_USER: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/60',
  REVOKE_WARNING: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200/60',
  INVALIDATE_SUBMISSION: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/60',
  RESTORE_SUBMISSION: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60',
  DELETE_WEEK: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/60',
  DELETE_PROBLEM: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/60',
  DELETE_TEST_CASE: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/60',
  DELETE_EVENT: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/60',
  DELETE_CHECKER: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/60',
  ACTIVATE_WEEK: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60',
  DEACTIVATE_WEEK: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/60',
}

const RANGES = [
  { label: 'Today', days: 0 },
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: 'All time', days: -1 },
]

function isoDate(d: Date) {
  return d.toLocaleDateString('en-CA')
}

function prettyAction(action: string) {
  if (action.includes(' ')) return action
  return action.toLowerCase().replace(/_/g, ' ')
}

function prettyTarget(target: string) {
  if (!target) return ''
  return target
    .split(' ')
    .map(pair => {
      const [key, value] = pair.split('=')
      if (!value) return pair
      const short = value.length > 12 ? `${value.slice(0, 8)}...` : value
      return `${key} ${short}`
    })
    .join(', ')
}

export default function LogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [admins, setAdmins] = useState<AuditAdmin[]>([])
  const [actions, setActions] = useState<string[]>([])

  const [adminId, setAdminId] = useState<number | 0>(0)
  const [action, setAction] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listAdmins().then(setAdmins).catch(() => setAdmins([]))
    listAuditActions().then(setActions).catch(() => setActions([]))
  }, [])

  useEffect(() => { setPage(1) }, [adminId, action, from, to])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listAuditLogs({
        adminId: adminId || undefined,
        action: action || undefined,
        from: from || undefined,
        to: to || undefined,
        limit: 500,
      })
      setLogs(data.logs ?? [])
      setTotal(data.total ?? 0)
      setError(null)
    } catch (e) {
      setLogs([])
      setError(e instanceof Error ? e.message : 'Could not load activity.')
    } finally {
      setLoading(false)
    }
  }, [adminId, action, from, to])

  useEffect(() => { load() }, [load])

  function applyRange(days: number) {
    if (days < 0) {
      setFrom('')
      setTo('')
      return
    }
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - days)
    setFrom(isoDate(start))
    setTo(isoDate(end))
  }

  function clearFilters() {
    setAdminId(0)
    setAction('')
    setFrom('')
    setTo('')
  }

  const paged = useMemo(
    () => logs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [logs, page]
  )

  const filtersActive = adminId !== 0 || action !== '' || from !== '' || to !== ''

  const selectCls = 'px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-800 bg-white'

  return (
    <div className="flex flex-col min-h-full">
      <div className="h-auto sm:h-16 bg-white border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-8 py-3 sm:py-0 shrink-0">
        <h1 className="text-base font-bold text-slate-900">Activity Log</h1>
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-bold tabular-nums text-slate-900">{total.toLocaleString()}</span>
          <span className="text-xs text-slate-400">actions recorded</span>
        </div>
      </div>

      <div className="flex-1 px-4 sm:px-8 py-6 flex flex-col gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {RANGES.map(r => (
              <button
                key={r.label}
                onClick={() => applyRange(r.days)}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                {r.label}
              </button>
            ))}
            {filtersActive && (
              <button
                onClick={clearFilters}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 ml-auto"
              >
                Clear filters
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Admin</label>
              <select value={adminId} onChange={e => setAdminId(Number(e.target.value))} className={selectCls}>
                <option value={0}>All admins</option>
                {admins.map(a => (
                  <option key={a.id} value={a.id}>{a.email}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Action</label>
              <select value={action} onChange={e => setAction(e.target.value)} className={selectCls}>
                <option value="">All actions</option>
                {actions.map(a => (
                  <option key={a} value={a}>{prettyAction(a)}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">From</label>
              <input type="date" value={from} onChange={e => setFrom(e.target.value)} className={selectCls} />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">To</label>
              <input type="date" value={to} onChange={e => setTo(e.target.value)} className={selectCls} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <p className="px-6 py-16 text-sm text-slate-400 text-center">Loading activity...</p>
          ) : error ? (
            <div className="px-6 py-16 flex flex-col items-center gap-3">
              <p className="text-sm text-rose-600">{error}</p>
              <button onClick={load} className="text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg px-3 py-1.5 hover:bg-slate-100">
                Retry
              </button>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2 text-slate-400">
              <p className="text-sm font-semibold text-slate-600">No activity in this range</p>
              <p className="text-xs">
                {filtersActive ? 'Try widening the filters' : 'Admin actions appear here as they happen'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200">
                      {['When', 'Admin', 'Action', 'Target', 'Reason', 'Result'].map(h => (
                        <th key={h} className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paged.map(row => {
                      const failed = row.status >= 400
                      return (
                        <tr key={row.id} className={`hover:bg-slate-50 transition-colors ${failed ? 'bg-rose-50/30' : ''}`}>
                          <td className="px-6 py-3.5 text-sm text-slate-500 tabular-nums whitespace-nowrap">
                            {new Date(row.created_at).toLocaleString()}
                          </td>
                          <td className="px-6 py-3.5 whitespace-nowrap">
                            <p className="text-sm font-semibold text-slate-800">{row.admin_name || row.admin_email}</p>
                            {row.admin_name && <p className="text-xs text-slate-400">{row.admin_email}</p>}
                          </td>
                          <td className="px-6 py-3.5 whitespace-nowrap">
                            <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full ${ACTION_STYLE[row.action] || 'bg-slate-100 text-slate-600 ring-1 ring-slate-200/60'}`}>
                              {prettyAction(row.action)}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-xs font-mono text-slate-500 whitespace-nowrap">
                            {prettyTarget(row.target) || 'none'}
                          </td>
                          <td className="px-6 py-3.5 text-sm text-slate-600 max-w-xs">
                            {row.reason ? <span title={row.reason}>{row.reason}</span> : <span className="text-slate-300">none</span>}
                          </td>
                          <td className="px-6 py-3.5 whitespace-nowrap">
                            <span className={`text-xs font-semibold tabular-nums ${failed ? 'text-rose-600' : 'text-emerald-600'}`}>
                              {failed ? `failed ${row.status}` : 'ok'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination total={logs.length} page={page} setPage={setPage} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
