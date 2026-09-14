'use client'

import { useState } from 'react'
import ConfirmModal, { type ConfirmRequest } from '@/components/ConfirmModal'
import Toast, { type ToastState } from '@/components/Toast'
import { AuthError } from '@/lib/auth'
import {
  syncInvalidatedSubmissions,
  type InvalidatedSyncResult,
} from '@/lib/moderation'

function isInvalidatedSyncResult(value: unknown): value is InvalidatedSyncResult {
  if (!value || typeof value !== 'object') return false
  const result = value as Record<string, unknown>
  return ['processed', 'failed'].every(key => typeof result[key] === 'number') &&
    ['pendingBefore', 'pendingAfter', 'affectedUsers']
      .every(key => result[key] === null || typeof result[key] === 'number')
}

export default function MaintenancePage() {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<InvalidatedSyncResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)

  async function runSync() {
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const nextResult = await syncInvalidatedSubmissions()
      setResult(nextResult)
      setToast({ message: 'Invalidated scores have been synchronized.', kind: 'success' })
    } catch (caught) {
      if (caught instanceof AuthError && isInvalidatedSyncResult(caught.data)) {
        setResult(caught.data)
      }
      const message = caught instanceof Error ? caught.message : 'Could not synchronize invalidated scores.'
      setError(message)
      setToast({ message, kind: 'error' })
    } finally {
      setBusy(false)
      setConfirmOpen(false)
    }
  }

  const confirmation: ConfirmRequest = {
    title: 'Sync invalidated scores',
    body: 'Repair invalidated submissions whose score or leaderboard data is stale.',
    confirmLabel: 'Run sync',
    tone: 'neutral',
    consequences: [
      'Every invalidated submission with a non-zero score will be processed.',
      'Accepted attempts for the same user and problem may also be invalidated.',
      'Affected weekly and season leaderboard totals will be recalculated.',
    ],
    onConfirm: runSync,
  }

  const metrics = result && [
    { label: 'Pending before', value: result.pendingBefore === null ? 'Unavailable' : `${result.pendingBefore} pending before` },
    { label: 'Processed', value: `${result.processed} processed` },
    { label: 'Failed', value: `${result.failed} failed` },
    { label: 'Still pending', value: result.pendingAfter === null ? 'Unavailable' : `${result.pendingAfter} still pending` },
    { label: 'Affected users', value: result.affectedUsers === null ? 'Unavailable' : `${result.affectedUsers} affected users` },
  ]

  return (
    <div className="flex flex-col min-h-full">
      <div className="h-auto sm:h-16 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-8 py-3 sm:py-0 shrink-0">
        <div>
          <h1 className="text-base font-bold text-slate-900">Maintenance</h1>
          <p className="text-xs text-slate-400 mt-0.5">Repair administrative data after moderation changes.</p>
        </div>
      </div>

      <div className="flex-1 px-4 sm:px-8 py-6">
        <section className="max-w-3xl bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 sm:p-6 flex flex-col gap-5">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Invalidated score synchronization</h2>
              <p className="text-sm text-slate-500 mt-1">
                Recalculate scores and leaderboard totals affected by invalidated submissions.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setConfirmOpen(true)}
                disabled={busy}
                className="px-4 py-2 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {busy ? 'Synchronizing...' : 'Sync invalidated scores'}
              </button>
              <p className="text-xs text-slate-400">This action only runs after confirmation.</p>
            </div>

            {error && (
              <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            {metrics && (
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-1">
                {metrics.map(metric => (
                  <div key={metric.label} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{metric.label}</p>
                    <p className="mt-1 text-sm font-bold tabular-nums text-slate-800">{metric.value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {confirmOpen && <ConfirmModal request={confirmation} onCancel={() => setConfirmOpen(false)} />}
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </div>
  )
}
