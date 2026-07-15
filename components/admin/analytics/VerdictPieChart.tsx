'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { VerdictDistribution } from '@/lib/analyticsTypes'

// same verdict palette as the VerdictBadge in the problem test-bench page,
// so a verdict always reads the same color everywhere in the admin panel
const VERDICT_LABEL: Record<string, string> = {
  ACCEPTED: 'Accepted',
  WRONG_ANSWER: 'Wrong Answer',
  TIME_LIMIT_EXCEEDED: 'Time Limit Exceeded',
  MEMORY_LIMIT_EXCEEDED: 'Memory Limit Exceeded',
  COMPILATION_ERROR: 'Compilation Error',
  RUNTIME_ERROR: 'Runtime Error',
  SYSTEM_ERROR: 'System Error',
}

const VERDICT_COLOR: Record<string, string> = {
  ACCEPTED: '#10b981',
  WRONG_ANSWER: '#f43f5e',
  TIME_LIMIT_EXCEEDED: '#f59e0b',
  MEMORY_LIMIT_EXCEEDED: '#f97316',
  COMPILATION_ERROR: '#ef4444',
  RUNTIME_ERROR: '#ec4899',
  SYSTEM_ERROR: '#8b5cf6',
}

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const p = payload[0]
  return (
    <div className="bg-white border border-slate-200 shadow-lg rounded-xl px-4 py-2.5 text-xs">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full" style={{ background: p.payload.fill }} />
        <span className="text-slate-500">{p.name}:</span>
        <span className="font-semibold text-slate-800">{p.value}</span>
      </div>
    </div>
  )
}

export default function VerdictPieChart({ data }: { data: VerdictDistribution }) {
  const entries = Object.entries(data)
    .map(([key, value]) => ({
      key, value, name: VERDICT_LABEL[key] || key, fill: VERDICT_COLOR[key] || '#94a3b8',
    }))
    .filter(e => e.value > 0)

  const total = entries.reduce((s, e) => s + e.value, 0)

  if (total === 0) {
    return <div className="py-12 text-center text-sm text-slate-400">No submissions yet</div>
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <ResponsiveContainer width={200} height={200} className="shrink-0">
        <PieChart>
          <Pie data={entries} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
            {entries.map(e => <Cell key={e.key} fill={e.fill} stroke="none" />)}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-col gap-2 flex-1 w-full min-w-0">
        {entries.map(e => (
          <div key={e.key} className="flex items-center justify-between gap-3 text-xs">
            <span className="flex items-center gap-2 text-slate-600 truncate">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: e.fill }} />
              {e.name}
            </span>
            <span className="font-semibold text-slate-800 tabular-nums shrink-0">
              {e.value} <span className="text-slate-400 font-normal">({((e.value / total) * 100).toFixed(0)}%)</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
