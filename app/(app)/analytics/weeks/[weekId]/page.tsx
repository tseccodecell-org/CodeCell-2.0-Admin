'use client'

import { useParams, useRouter } from 'next/navigation'
import AnalyticsLayout from '@/components/admin/analytics/AnalyticsLayout'
import SectionCard from '@/components/admin/analytics/SectionCard'
import StatCard from '@/components/admin/analytics/StatCard'
import AnalyticsTable, { type AnalyticsTableColumn } from '@/components/admin/analytics/AnalyticsTable'
import SimpleBarChart from '@/components/admin/analytics/SimpleBarChart'
import VerdictPieChart from '@/components/admin/analytics/VerdictPieChart'
import LoadingState from '@/components/admin/analytics/LoadingState'
import ErrorState from '@/components/admin/analytics/ErrorState'
import EmptyState from '@/components/admin/analytics/EmptyState'
import { getWeekAnalytics } from '@/lib/adminAnalytics'
import { useAnalyticsData } from '@/lib/useAnalyticsData'
import { fillDailyActivity, formatShortDate } from '@/lib/analyticsUtils'
import type { ProblemBreakdownEntry } from '@/lib/analyticsTypes'

const DIFF_COLORS: Record<string, string> = {
  EASY: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60',
  MEDIUM: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/60',
  HARD: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/60',
}

const LOW_ACCEPTANCE_THRESHOLD = 0.2

function pct(fraction: number) {
  return `${(fraction * 100).toFixed(1)}%`
}

export default function WeekAnalyticsPage() {
  const { weekId } = useParams<{ weekId: string }>()
  const router = useRouter()
  const { state, reload } = useAnalyticsData(() => getWeekAnalytics(weekId), [weekId])

  if (state.status === 'loading') {
    return (
      <AnalyticsLayout title="Week Analytics" backHref="/analytics" backLabel="All Weeks">
        <LoadingState label="Loading week analytics…" />
      </AnalyticsLayout>
    )
  }

  if (state.status === 'error') {
    return (
      <AnalyticsLayout title="Week Analytics" backHref="/analytics" backLabel="All Weeks">
        <ErrorState message={state.message} onRetry={reload} />
      </AnalyticsLayout>
    )
  }

  const { week, overview, dailyActivity, problemBreakdown, verdictDistribution } = state.data
  const filledActivity = fillDailyActivity(dailyActivity).map(d => ({ ...d, label: formatShortDate(d.date) }))

  const columns: AnalyticsTableColumn<ProblemBreakdownEntry>[] = [
    {
      key: 'title', header: 'Problem',
      render: p => (
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800">{p.title}</span>
          {p.acceptanceRate < LOW_ACCEPTANCE_THRESHOLD && (
            <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-600 ring-1 ring-rose-200/60">
              Low AC
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'difficulty', header: 'Difficulty',
      render: p => (
        <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full ${DIFF_COLORS[p.difficulty] || 'bg-slate-100 text-slate-600'}`}>
          {p.difficulty}
        </span>
      ),
    },
    {
      key: 'participants', header: 'Participants', align: 'right', sortable: true, sortValue: p => p.participants,
      render: p => <span className="tabular-nums">{p.participants}</span>,
    },
    {
      key: 'acceptedUsers', header: 'Accepted Users', align: 'right',
      render: p => <span className="tabular-nums">{p.acceptedUsers}</span>,
    },
    {
      key: 'totalSubmissions', header: 'Total Submissions', align: 'right', sortable: true, sortValue: p => p.totalSubmissions,
      render: p => <span className="tabular-nums">{p.totalSubmissions}</span>,
    },
    {
      key: 'averageAttempts', header: 'Avg Attempts', align: 'right',
      render: p => <span className="tabular-nums">{p.averageAttempts.toFixed(2)}</span>,
    },
    {
      key: 'acceptanceRate', header: 'Acceptance Rate', align: 'right', sortable: true, sortValue: p => p.acceptanceRate,
      render: p => (
        <span className={`tabular-nums font-semibold ${p.acceptanceRate < LOW_ACCEPTANCE_THRESHOLD ? 'text-rose-600' : 'text-slate-700'}`}>
          {pct(p.acceptanceRate)}
        </span>
      ),
    },
  ]

  return (
    <AnalyticsLayout
      title={week.title}
      subtitle={`Week ${week.weekNumber}`}
      backHref="/analytics"
      backLabel="All Weeks"
    >
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard label="Participants" value={overview.participants.toLocaleString()} />
        <StatCard label="Accepted Users" value={overview.acceptedUsers.toLocaleString()} accent="emerald" />
        <StatCard label="Completion Rate" value={pct(overview.completionRate)} />
        <StatCard label="Average Score" value={overview.averageScore.toLocaleString()} />
        <StatCard label="Avg Submissions / User" value={overview.averageSubmissionsPerUser.toFixed(2)} />
      </div>

      <SectionCard title="Daily Activity" subtitle="Participants and submissions across the week">
        {filledActivity.length === 0 ? (
          <EmptyState title="No activity yet" subtitle="Daily activity appears once submissions start coming in" />
        ) : (
          <SimpleBarChart
            data={filledActivity}
            xKey="label"
            bars={[
              { key: 'participants', name: 'Participants', color: '#6366f1' },
              { key: 'submissions', name: 'Submissions', color: '#8b5cf6' },
            ]}
          />
        )}
      </SectionCard>

      <SectionCard title="Verdict Distribution" subtitle="Breakdown of all submission verdicts this week">
        <VerdictPieChart data={verdictDistribution} />
      </SectionCard>

      <SectionCard title="Problem Breakdown" subtitle="Click a row to view full problem analytics" noPadding>
        <AnalyticsTable
          columns={columns}
          rows={problemBreakdown}
          rowKey={p => p.problemId}
          onRowClick={p => router.push(`/analytics/weeks/${weekId}/problems/${p.problemId}`)}
          emptyMessage="No problems in this week yet"
        />
      </SectionCard>
    </AnalyticsLayout>
  )
}
