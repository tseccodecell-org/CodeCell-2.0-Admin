interface StatCardProps {
  label: string
  value: string | number
  hint?: string
  accent?: 'default' | 'emerald' | 'amber' | 'rose'
}

const ACCENT_CLS: Record<string, string> = {
  default: 'text-slate-900',
  emerald: 'text-emerald-600',
  amber: 'text-amber-600',
  rose: 'text-rose-600',
}

export default function StatCard({ label, value, hint, accent = 'default' }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4 min-w-0">
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest truncate">{label}</p>
      <p className={`text-2xl font-bold mt-1.5 tabular-nums truncate ${ACCENT_CLS[accent]}`}>{value}</p>
      {hint && <p className="text-xs text-slate-400 mt-1 truncate">{hint}</p>}
    </div>
  )
}
