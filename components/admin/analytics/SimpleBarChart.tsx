'use client'

import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'

interface BarSeries {
  key: string
  name: string
  color: string
}

interface SimpleBarChartProps {
  data: Record<string, any>[]
  xKey: string
  bars: BarSeries[]
  height?: number
  /** 'vertical' = horizontal bars (category axis on Y) — matches recharts' own naming */
  layout?: 'horizontal' | 'vertical'
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
          <span className="font-semibold text-slate-800">
            {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function SimpleBarChart({
  data, xKey, bars, height = 260, layout = 'horizontal',
}: SimpleBarChartProps) {
  const horizontalBars = layout === 'vertical'

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout={layout} margin={{ top: 4, right: 16, left: horizontalBars ? 8 : 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={!horizontalBars} vertical={horizontalBars} />
        {horizontalBars ? (
          <>
            <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <YAxis type="category" dataKey={xKey} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={100} />
          </>
        ) : (
          <>
            <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={36} allowDecimals={false} />
          </>
        )}
        <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f8fafc' }} />
        {bars.length > 1 && (
          <Legend wrapperStyle={{ paddingTop: 12, fontSize: 12 }} formatter={(v: string) => <span style={{ color: '#64748b' }}>{v}</span>} />
        )}
        {bars.map(b => (
          <Bar
            key={b.key}
            dataKey={b.key}
            name={b.name}
            fill={b.color}
            radius={horizontalBars ? [0, 4, 4, 0] : [4, 4, 0, 0]}
            maxBarSize={40}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
