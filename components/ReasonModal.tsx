'use client'

import { useState } from 'react'

interface ReasonModalProps {
  title: string
  body: string
  label?: string
  placeholder?: string
  confirmLabel: string
  tone: 'danger' | 'neutral'
  requireReason: boolean
  busy: boolean
  onConfirm: (reason: string) => void
  onCancel: () => void
}

export default function ReasonModal({
  title, body, label, placeholder, confirmLabel, tone, requireReason, busy, onConfirm, onCancel,
}: ReasonModalProps) {
  const [reason, setReason] = useState('')
  const blocked = busy || (requireReason && !reason.trim())

  const confirmCls = tone === 'danger'
    ? 'bg-rose-600 hover:bg-rose-700 text-white'
    : 'bg-slate-900 hover:bg-slate-800 text-white'

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 pb-6 px-4 bg-black/40 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          <button onClick={onCancel} disabled={busy}
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-40">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          <p className="text-sm text-slate-600 leading-relaxed">{body}</p>

          {requireReason && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">{label || 'Reason'}</label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={4}
                placeholder={placeholder}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-y focus:outline-none focus:border-slate-400 text-slate-800 placeholder:text-slate-400"
              />
              <p className="text-xs text-slate-400 mt-1.5">This reason is shown to the participant.</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button onClick={onCancel} disabled={busy}
            className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button onClick={() => onConfirm(reason.trim())} disabled={blocked}
            className={`px-5 py-2 text-sm font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${confirmCls}`}>
            {busy ? 'Saving...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
