import autoTable from 'jspdf-autotable'
import type { AnalyticsOverview, WeekAnalytics } from '@/lib/analytics'
import type { AdminUserRow } from '@/lib/moderation'
import type { Problem } from '@/lib/types'
import {
  BAND, BAD, CONTENT_W, FAINT, GOOD, INK, MARGIN, MUTED, PAGE_H, RULE, WARN,
  coverHeading, displayName, ensureRoom, newDoc, paginate, paragraph, percent,
  sectionTitle, setColor, statRow,
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

const tableBase = {
  theme: 'plain' as const,
  styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 5, textColor: INK },
  headStyles: {
    fillColor: BAND, textColor: MUTED, fontStyle: 'bold' as const,
    fontSize: 7.5, cellPadding: 5,
  },
  alternateRowStyles: { fillColor: [252, 253, 254] as [number, number, number] },
  margin: { left: MARGIN, right: MARGIN },
}

function acceptanceTone(rate: number) {
  if (rate >= 0.5) return GOOD
  if (rate >= 0.2) return WARN
  return BAD
}

// ---------- overall ----------

export function buildOverallReport(overview: AnalyticsOverview) {
  const doc = newDoc()
  let y = coverHeading(doc, 'Contest Statistics', 'All weeks to date')

  y = sectionTitle(doc, 'At a glance', y)
  y = statRow(doc, [
    { label: 'Participants', value: String(overview.totalUsers) },
    { label: 'Problems', value: String(overview.totalProblems) },
    { label: 'Weeks', value: String(overview.totalWeeks) },
  ], y)
  y = statRow(doc, [
    { label: 'Submissions', value: overview.totalSubmissions.toLocaleString() },
    { label: 'Accepted', value: overview.acceptedSubmissions.toLocaleString(), tone: GOOD },
    {
      label: 'Acceptance', value: percent(overview.acceptanceRate),
      tone: acceptanceTone(overview.acceptanceRate),
    },
  ], y)

  y = sectionTitle(doc, 'Week by week', y)

  const trend = overview.weeklyTrend ?? []
  autoTable(doc, {
    ...tableBase,
    startY: y,
    head: [['Week', 'Participants', 'Submissions', 'Accepted', 'Acceptance']],
    body: trend.map(w => {
      const rate = w.submissions > 0 ? w.accepted / w.submissions : 0
      return [
        `Week ${w.weekNumber}`,
        String(w.participants),
        w.submissions.toLocaleString(),
        w.accepted.toLocaleString(),
        percent(rate),
      ]
    }),
    columnStyles: {
      1: { halign: 'right' }, 2: { halign: 'right' },
      3: { halign: 'right' }, 4: { halign: 'right' },
    },
  })

  paginate(doc, 'Contest statistics, all weeks')
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

  let y = coverHeading(
    doc,
    week.title || `Week ${week.weekNumber}`,
    `Week ${week.weekNumber} report`
  )

  y = sectionTitle(doc, 'At a glance', y)
  y = statRow(doc, [
    { label: 'Participants', value: String(o.participants) },
    { label: 'Submitted', value: String(o.usersSubmitted) },
    { label: 'Solved at least one', value: String(o.acceptedUsers), tone: GOOD },
  ], y)
  y = statRow(doc, [
    { label: 'Submissions', value: o.totalSubmissions.toLocaleString() },
    { label: 'Avg per user', value: o.averageSubmissionsPerUser.toFixed(1) },
    { label: 'Completion', value: percent(o.completionRate) },
  ], y)

  // verdicts
  const verdicts = Object.entries(analytics.verdictDistribution ?? {})
    .filter(([, n]) => Number(n) > 0)
    .sort((a, b) => Number(b[1]) - Number(a[1]))

  if (verdicts.length) {
    y = ensureRoom(doc, y, 120)
    y = sectionTitle(doc, 'Verdicts', y)
    const total = verdicts.reduce((s, [, n]) => s + Number(n), 0)
    autoTable(doc, {
      ...tableBase,
      startY: y,
      head: [['Verdict', 'Count', 'Share']],
      body: verdicts.map(([v, n]) => [
        VERDICT_LABEL[v] || v,
        Number(n).toLocaleString(),
        percent(Number(n) / total),
      ]),
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
    })
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 26
  }

  // per problem
  const breakdown = analytics.problemBreakdown ?? []
  y = ensureRoom(doc, y, 140)
  y = sectionTitle(doc, 'Problems', y)

  autoTable(doc, {
    ...tableBase,
    startY: y,
    head: [['#', 'Problem', 'Difficulty', 'Solved', 'Attempts', 'Avg tries', 'Acceptance']],
    body: breakdown.map((p, i) => [
      String(i + 1),
      p.title,
      p.difficulty,
      String(p.acceptedUsers),
      p.totalSubmissions.toLocaleString(),
      p.averageAttempts.toFixed(1),
      percent(p.acceptanceRate),
    ]),
    columnStyles: {
      0: { cellWidth: 22 },
      3: { halign: 'right' }, 4: { halign: 'right' },
      5: { halign: 'right' }, 6: { halign: 'right' },
    },
  })
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 26

  // full statements, the part the concise report leaves out
  if (includeStatements && problems.length) {
    doc.addPage()
    let cursor = MARGIN + 12
    cursor = sectionTitle(doc, 'Problem statements', cursor)

    problems.forEach((p, i) => {
      cursor = ensureRoom(doc, cursor, 90)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      setColor(doc, INK)
      doc.text(`${i + 1}. ${p.name}`, MARGIN, cursor)
      cursor += 15

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      setColor(doc, MUTED)
      doc.text(
        `${p.difficulty}  ·  ${p.basePoints} points`.replace('·', '|'),
        MARGIN, cursor
      )
      cursor += 16

      if (p.problemStatement) cursor = paragraph(doc, p.problemStatement, cursor)
      cursor += 6

      const parts: [string, string | undefined][] = [
        ['Input', p.inputFormat],
        ['Output', p.outputFormat],
        ['Constraints', p.constraints],
      ]
      for (const [label, body] of parts) {
        if (!body) continue
        cursor = ensureRoom(doc, cursor, 40)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8.5)
        setColor(doc, MUTED)
        doc.text(label, MARGIN, cursor)
        cursor += 12
        cursor = paragraph(doc, body, cursor, 8.5)
        cursor += 6
      }

      cursor += 8
      doc.setDrawColor(RULE[0], RULE[1], RULE[2])
      doc.line(MARGIN, cursor, MARGIN + CONTENT_W, cursor)
      cursor += 20
    })
  }

  paginate(doc, `${week.title || `Week ${week.weekNumber}`} report`)
  return doc
}

// ---------- leaderboard ----------

// contest performance only. no email, college or location, so the file stays
// safe to forward
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

  let y = coverHeading(doc, 'Leaderboard', scopeLabel)

  const solvedTotal = ranked.reduce((s, u) => s + (u.problemsSolved ?? 0), 0)
  y = statRow(doc, [
    { label: 'Ranked participants', value: String(ranked.length) },
    { label: 'Problems solved', value: solvedTotal.toLocaleString(), tone: GOOD },
    {
      label: 'Top rating',
      value: ranked.length ? String(ranked[0].rating ?? 0) : '0',
    },
  ], y)

  autoTable(doc, {
    ...tableBase,
    startY: y,
    head: [['Rank', 'Name', 'Username', 'Rating', 'Season XP', 'Solved']],
    body: ranked.map((u, i) => [
      String(i + 1),
      u.name || '',
      displayName(u),
      String(u.rating ?? 0),
      Math.round(u.seasonXp ?? 0).toLocaleString(),
      String(u.problemsSolved ?? 0),
    ]),
    columnStyles: {
      0: { cellWidth: 34, halign: 'right' },
      3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' },
    },
    didParseCell: data => {
      // podium in bold so the top three read at a glance
      if (data.section === 'body' && data.row.index < 3) {
        data.cell.styles.fontStyle = 'bold'
      }
    },
  })

  paginate(doc, `Leaderboard, ${scopeLabel}`)
  return doc
}

export function save(doc: ReturnType<typeof newDoc>, filename: string) {
  doc.save(filename)
}

export function slug(text: string) {
  return (text || 'report').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
