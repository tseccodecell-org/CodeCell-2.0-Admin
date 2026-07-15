import Link from 'next/link'
import type { ReactNode } from 'react'

interface AnalyticsLayoutProps {
  title: string
  subtitle?: string
  backHref?: string
  backLabel?: string
  badge?: ReactNode
  children: ReactNode
}

export default function AnalyticsLayout({
  title, subtitle, backHref, backLabel = 'Back', badge, children,
}: AnalyticsLayoutProps) {
  return (
    <div className="flex flex-col min-h-full">
      <div className="h-16 bg-white border-b border-slate-200/80 flex items-center gap-4 px-8 shrink-0">
        {backHref && (
          <>
            <Link
              href={backHref}
              className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {backLabel}
            </Link>
            <span className="w-px h-5 bg-slate-200 shrink-0" />
          </>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-slate-900 truncate">{title}</h1>
            {badge}
          </div>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5 truncate">{subtitle}</p>}
        </div>
      </div>

      <div className="flex-1 px-8 py-6 flex flex-col gap-6">
        {children}
      </div>
    </div>
  )
}
