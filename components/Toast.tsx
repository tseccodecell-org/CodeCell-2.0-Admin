'use client'

import { useEffect } from 'react'

export interface ToastState {
  message: string
  kind: 'success' | 'error'
}

export default function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [toast, onClose])

  const success = toast.kind === 'success'
  return (
    <div className="fixed bottom-20 right-8 z-50 animate-in fade-in slide-in-from-bottom-2">
      <div className={`flex items-center gap-2.5 pl-4 pr-3 py-3 rounded-lg shadow-lg border text-sm font-medium ${
        success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
      }`}>
        <svg className={`w-4 h-4 shrink-0 ${success ? 'text-emerald-500' : 'text-rose-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {success
            ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />}
        </svg>
        {toast.message}
        <button onClick={onClose} className="ml-1 p-0.5 rounded hover:bg-black/5 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
    </div>
  )
}
