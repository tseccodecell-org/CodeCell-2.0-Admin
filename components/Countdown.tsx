'use client'

import { useEffect, useRef, useState } from 'react'

function fmt(ms: number) {
  const s = Math.floor(ms / 1000)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return d > 0 ? `${d}d ${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(h)}:${pad(m)}:${pad(sec)}`
}

// live countdown to `target` (iso string). renders nothing if the target is
// already in the past. calls onDone once when it hits zero (the backend
// scheduler auto-activates the week, onDone just refreshes the list)
export default function Countdown({ target, onDone }: { target: string; onDone?: () => void }) {
  // captured once on mount — a week whose start already passed
  // (ended/deactivated) should show nothing, not "starting…"
  const [initialLeft] = useState(() => new Date(target).getTime() - Date.now())
  const [left, setLeft] = useState(initialLeft)
  const doneFired = useRef(false)

  useEffect(() => {
    if (initialLeft <= 0) return
    const timer = setInterval(() => {
      const ms = new Date(target).getTime() - Date.now()
      setLeft(ms)
      if (ms <= 0) {
        clearInterval(timer)
        if (!doneFired.current) {
          doneFired.current = true
          if (onDone) onDone()
        }
      }
    }, 1000)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])

  if (initialLeft <= 0) return null

  if (left <= 0) {
    return <span className="text-xs font-semibold text-amber-600 animate-pulse">starting…</span>
  }

  return (
    <span className="text-xs font-semibold text-slate-500 tabular-nums" title="goes live automatically">
      ⏳ {fmt(left)}
    </span>
  )
}
