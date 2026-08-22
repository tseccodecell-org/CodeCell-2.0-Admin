'use client'

import { useState } from 'react'

export default function DownloadPdfButton({
  label = 'Download PDF',
  onDownload,
  variant = 'solid',
}: {
  label?: string
  onDownload: () => Promise<void> | void
  variant?: 'solid' | 'ghost'
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run() {
    setBusy(true)
    setError(null)
    try {
      await onDownload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not build the PDF.')
    } finally {
      setBusy(false)
    }
  }

  const base = 'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
  const skin = variant === 'solid'
    ? 'bg-slate-900 text-white hover:bg-slate-800'
    : 'border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'

  return (
    <div className="flex flex-col items-end gap-1">
      <button onClick={run} disabled={busy} className={`${base} ${skin}`} title={label}>
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
        </svg>
        {busy ? 'Building...' : label}
      </button>
      {error && <span className="text-[11px] text-rose-600">{error}</span>}
    </div>
  )
}
