import type { AnalyticsOverview, WeekAnalytics } from '@/lib/analytics'
import type { AdminUserRow } from '@/lib/moderation'
import type { Problem } from '@/lib/types'
import { table } from './table'
import {
  MARGIN, describe, displayName, ensureRoom, footers, newDoc, paragraph,
  percent, section, subsection, titleBlock,
} from './theme'

const VERDICT_LABEL: Record<string, string> = {
  ACCEPTED: 'Accepted',
  WRONG_ANSWER: 'Wrong Answer',
  TIME_LIMIT_EXCEEDED: 'Time Limit',
  MEMORY_LIMIT_EXCEEDED: 'Memory Limit',
  RUNTIME_ERROR: 'Runtime Error',
  COMPILATION_ERROR: 'Compile Error',
  SYSTEM_ERROR: 'System Error',
}

const num = (n: number) => (n ?? 0).toLocaleString()

// ---------- overall ----------

export function buildOverallReport(overview: AnalyticsOverview) {
  const doc = newDoc()
  let y = titleBlock(doc, 'Contest Statistics', 'All weeks to date')

  y = section(doc, 1, 'Summary', y)
  y = describe(doc, [
    ['Registered participants', num(overview.totalUsers)],
    ['Weeks run', num(overview.totalWeeks)],
    ['Problems published', num(overview.totalProblems)],
    ['Total submissions', num(overview.totalSubmissions)],
    ['Accepted submissions', num(overview.acceptedSubmissions)],
    ['Acceptance rate', percent(overview.acceptanceRate)],
  ], y)

  y = section(doc, 2, 'Week by week', y)
  const trend = overview.weeklyTrend ?? []
  y = table(doc, [
    { header: 'Week', width: 1.2 },
    { header: 'Participants', width: 1.2, align: 'right' },
    { header: 'Submissions', width: 1.2, align: 'right' },
    { header: 'Accepted', width: 1.1, align: 'right' },
    { header: 'Acceptance', width: 1.1, align: 'right' },
  ], trend.map(w => [
    `Week ${w.weekNumber}`,
    num(w.participants),
    num(w.submissions),
    num(w.accepted),
    percent(w.submissions > 0 ? w.accepted / w.submissions : 0),
  ]), y)

  footers(doc, 'Contest statistics, all weeks')
  return doc
}

// ---------- one week ----------

export function buildWeekReport(
  analytics: WeekAnalytics,
  problems: Problem[],
  includeStatements: boolean
) {
  const doc = newDoc()
  const week = analytics.week
  const o = analytics.overview
  const name = week.title || `Week ${week.weekNumber}`

  let y = titleBlock(doc, name, `Week ${week.weekNumber} report`)

  y = section(doc, 1, 'Summary', y)
  y = describe(doc, [
    ['Participants', num(o.participants)],
    ['Submitted at least once', num(o.usersSubmitted)],
    ['Solved at least one', num(o.acceptedUsers)],
    ['Total submissions', num(o.totalSubmissions)],
    ['Average submissions per user', (o.averageSubmissionsPerUser ?? 0).toFixed(1)],
    ['Average score', (o.averageScore ?? 0).toFixed(1)],
    ['Completion rate', percent(o.completionRate)],
  ], y)

  const verdicts = Object.entries(analytics.verdictDistribution ?? {})
    .filter(([, n]) => Number(n) > 0)
    .sort((a, b) => Number(b[1]) - Number(a[1]))

  let n = 2
  if (verdicts.length) {
    const total = verdicts.reduce((s, [, v]) => s + Number(v), 0)
    y = section(doc, n++, 'Verdicts', y)
    y = table(doc, [
      { header: 'Verdict', width: 2.4 },
      { header: 'Count', width: 1, align: 'right' },
      { header: 'Share', width: 1, align: 'right' },
    ], verdicts.map(([v, c]) => [
      VERDICT_LABEL[v] || v,
      num(Number(c)),
      percent(Number(c) / total),
    ]), y)
  }

  y = section(doc, n++, 'Problems', y)
  y = table(doc, [
    { header: '#', width: 0.35, align: 'right' },
    { header: 'Problem', width: 2.9 },
    { header: 'Difficulty', width: 0.95 },
    { header: 'Solved', width: 0.7, align: 'right' },
    { header: 'Subs', width: 0.7, align: 'right' },
    { header: 'Tries', width: 0.65, align: 'right' },
    { header: 'Acc.', width: 0.7, align: 'right' },
  ], (analytics.problemBreakdown ?? []).map((p, i) => [
    String(i + 1),
    p.title,
    p.difficulty,
    num(p.acceptedUsers),
    num(p.totalSubmissions),
    (p.averageAttempts ?? 0).toFixed(1),
    percent(p.acceptanceRate),
  ]), y)

  if (includeStatements && problems.length) {
    doc.addPage()
    y = MARGIN
    y = section(doc, n++, 'Problem statements', y)

    problems.forEach((p, i) => {
      y = ensureRoom(doc, y, 90)
      y = subsection(doc, `${i + 1}.  ${p.name}`, y)
      y = describe(doc, [
        ['Difficulty', String(p.difficulty ?? '')],
        ['Base points', num(p.basePoints)],
      ], y)

      if (p.problemStatement) y = paragraph(doc, p.problemStatement, y) + 8

      const parts: [string, string | undefined][] = [
        ['Input format', p.inputFormat],
        ['Output format', p.outputFormat],
        ['Constraints', p.constraints],
      ]
      for (const [label, body] of parts) {
        if (!body) continue
        y = ensureRoom(doc, y, 40)
        y = subsection(doc, label, y)
        y = paragraph(doc, body, y) + 8
      }
      y += 10
    })
  }

  footers(doc, `${name} report`)
  return doc
}

// ---------- leaderboard ----------

// contest performance and institution only. no email, no location, so the file
// stays safe to forward
export function buildLeaderboardReport(users: AdminUserRow[], scopeLabel: string) {
  const doc = newDoc()

  const ranked = users
    .filter(u => !u.isBanned)
    .slice()
    .sort((a, b) =>
      (b.rating ?? 0) - (a.rating ?? 0) ||
      (b.seasonXp ?? 0) - (a.seasonXp ?? 0) ||
      (b.problemsSolved ?? 0) - (a.problemsSolved ?? 0)
    )

  let y = titleBlock(doc, 'Leaderboard', scopeLabel)

  const solved = ranked.reduce((s, u) => s + (u.problemsSolved ?? 0), 0)
  const subs = ranked.reduce((s, u) => s + (u.totalSubmissions ?? 0), 0)

  y = section(doc, 1, 'Summary', y)
  y = describe(doc, [
    ['Ranked participants', num(ranked.length)],
    ['Problems solved', num(solved)],
    ['Submissions made', num(subs)],
  ], y)

  y = section(doc, 2, 'Standings', y)
  y = table(doc, [
    { header: 'Rank', width: 0.55, align: 'right' },
    { header: 'Name', width: 2.1 },
    { header: 'Username', width: 1.5 },
    { header: 'College', width: 2.0 },
    { header: 'Rating', width: 0.7, align: 'right' },
    { header: 'Solved', width: 0.65, align: 'right' },
    { header: 'Subs', width: 0.6, align: 'right' },
    { header: 'Weeks', width: 0.65, align: 'right' },
  ], ranked.map((u, i) => [
    String(i + 1),
    u.name || '',
    displayName(u),
    u.collegeName || '',
    num(u.rating),
    num(u.problemsSolved ?? 0),
    num(u.totalSubmissions ?? 0),
    num(u.weeksParticipated ?? 0),
  ]), y, { boldFirstRows: 3 })

  doc.setFontSize(9)
  doc.text(
    'Weeks counts the distinct contest weeks a participant submitted in, so it reads as consistency rather than volume.',
    MARGIN,
    ensureRoom(doc, y, 20)
  )

  footers(doc, `Leaderboard, ${scopeLabel}`)
  return doc
}

export function save(doc: ReturnType<typeof newDoc>, filename: string) {
  doc.save(filename)
}

export function slug(text: string) {
  return (text || 'report').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
