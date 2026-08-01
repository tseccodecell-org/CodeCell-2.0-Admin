'use client'

import type { Dispatch, SetStateAction } from 'react'

export const PAGE_SIZE = 20

export default function Pagination({ total, page, setPage }: { total: number; page: number; setPage: Dispatch<SetStateAction<number>> }) {
  const pages = Math.ceil(total / PAGE_SIZE)
  if (pages <= 1) return null
  const start = (page - 1) * PAGE_SIZE + 1
  const end   = Math.min(page * PAGE_SIZE, total)
  return (
    <div className="px-6 py-3.5 border-t border-slate-100 flex items-center justify-between bg-slate-50/60">
      <span className="text-xs text-slate-500 tabular-nums">Showing {start} to {end} of {total}</span>
      <div className="flex items-center gap-1">
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
          className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          ← Prev
        </button>
        {Array.from({ length: Math.min(5, pages) }, (_, i) => {
          let p
          if (pages <= 5) p = i + 1
          else if (page <= 3) p = i + 1
          else if (page >= pages - 2) p = pages - 4 + i
          else p = page - 2 + i
          return (
            <button key={p} onClick={() => setPage(p)}
              className={`w-8 h-8 text-xs font-semibold rounded-lg transition-colors ${p === page ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100 border border-slate-200'}`}>
              {p}
            </button>
          )
        })}
        <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
          className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          Next →
        </button>
      </div>
    </div>
  )
}
