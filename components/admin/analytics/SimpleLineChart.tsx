'use client'

import {
  CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'

interface LineSeries {
  key: string
  name: string
  color: string
}

interface SimpleLineChartProps {
  data: Record<string, any>[]
  xKey: string
  lines: LineSeries[]
  height?: number
  onPointClick?: (row: any) => void
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 shadow-lg rounded-xl px-4 py-3 text-xs">
      <p className="font-bold text-slate-700 mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-500">{p.name}:</span>
          <span className="font-semibold text-slate-800">{p.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

export default function SimpleLineChart({ data, xKey, lines, height = 280, onPointClick }: SimpleLineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart
        data={data}
        margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
        onClick={onPointClick ? (state: any) => {
          const point = state?.activePayload?.[0]?.payload
          if (point) onPointClick(point)
        } : undefined}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={36} allowDecimals={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#e2e8f0' }} />
        <Legend wrapperStyle={{ paddingTop: 12, fontSize: 12 }} formatter={(v: string) => <span style={{ color: '#64748b' }}>{v}</span>} />
        {lines.map(l => (
          <Line
            key={l.key}
            type="monotone"
            dataKey={l.key}
            name={l.name}
            stroke={l.color}
            strokeWidth={2.5}
            dot={{ r: 4, fill: l.color, strokeWidth: 0, cursor: onPointClick ? 'pointer' : undefined }}
            activeDot={{ r: 6, strokeWidth: 0, cursor: onPointClick ? 'pointer' : undefined }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
