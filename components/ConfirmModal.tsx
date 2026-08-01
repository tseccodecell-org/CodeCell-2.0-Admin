'use client'

import { useEffect, useState } from 'react'

export interface ConfirmRequest {
  title: string
  body: string
  confirmLabel: string
  tone: 'danger' | 'neutral'
  // when set, the action stays locked until this is typed back exactly
  typeToConfirm?: string
  consequences?: string[]
  onConfirm: () => void | Promise<void>
}

export default function ConfirmModal({
  request,
  onCancel,
}: {
  request: ConfirmRequest
  onCancel: () => void
}) {
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => { setTyped('') }, [request])

  const needsTyping = Boolean(request.typeToConfirm)
  const matches = !needsTyping || typed.trim() === request.typeToConfirm
  const blocked = busy || !matches

  const confirmCls = request.tone === 'danger'
    ? 'bg-rose-600 hover:bg-rose-700 text-white'
    : 'bg-slate-900 hover:bg-slate-800 text-white'

  async function run() {
    if (blocked) return
    setBusy(true)
    try {
      await request.onConfirm()
      onCancel()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 pb-6 px-4 bg-black/40 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">{request.title}</h3>
        </div>

        <div className="px-5 sm:px-6 py-5 flex flex-col gap-4">
          <p className="text-sm text-slate-600">{request.body}</p>

          {request.consequences && request.consequences.length > 0 && (
            <ul className="flex flex-col gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
              {request.consequences.map(line => (
                <li key={line} className="text-xs text-slate-600 flex items-start gap-2">
                  <span className="w-1 h-1 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                  {line}
                </li>
              ))}
            </ul>
          )}

          {needsTyping && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                Type <span className="font-mono font-bold text-slate-800">{request.typeToConfirm}</span> to confirm
              </label>
              <input
                autoFocus
                value={typed}
                onChange={e => setTyped(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && matches) run() }}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-slate-800 text-sm focus:outline-none focus:border-slate-400"
              />
            </div>
          )}
        </div>

        <div className="px-5 sm:px-6 py-4 border-t border-slate-100 flex flex-wrap justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={run}
            disabled={blocked}
            className={`px-4 py-2 text-sm font-semibold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed ${confirmCls}`}
          >
            {busy ? 'Working...' : request.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
