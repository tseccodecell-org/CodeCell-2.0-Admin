import type { DailyActivityEntry } from './analyticsTypes'

// dailyActivity only includes days that had submissions (per API doc) — fill
// the gaps so the bar chart doesn't skip days.
export function fillDailyActivity(entries: DailyActivityEntry[]): DailyActivityEntry[] {
  if (entries.length === 0) return []
  const byDate = new Map(entries.map(e => [e.date, e]))
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))
  const start = new Date(`${sorted[0].date}T00:00:00`)
  const end = new Date(`${sorted[sorted.length - 1].date}T00:00:00`)

  const out: DailyActivityEntry[] = []
  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const iso = d.toLocaleDateString('en-CA') // YYYY-MM-DD, matches API format
    out.push(byDate.get(iso) || { date: iso, participants: 0, submissions: 0 })
  }
  return out
}

// "YYYY-MM-DD" -> "Jul 16" for chart axis labels
export function formatShortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
