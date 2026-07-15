'use client'

import { useParams } from 'next/navigation'
import AnalyticsLayout from '@/components/admin/analytics/AnalyticsLayout'
import SectionCard from '@/components/admin/analytics/SectionCard'
import StatCard from '@/components/admin/analytics/StatCard'
import SimpleBarChart from '@/components/admin/analytics/SimpleBarChart'
import VerdictPieChart from '@/components/admin/analytics/VerdictPieChart'
import LoadingState from '@/components/admin/analytics/LoadingState'
import ErrorState from '@/components/admin/analytics/ErrorState'
import EmptyState from '@/components/admin/analytics/EmptyState'
import { getProblemAnalytics } from '@/lib/adminAnalytics'
import { useAnalyticsData } from '@/lib/useAnalyticsData'

const DIFF_COLORS: Record<string, string> = {
  EASY: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60',
  MEDIUM: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/60',
  HARD: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/60',
}

function pct(fraction: number) {
  return `${(fraction * 100).toFixed(1)}%`
}

export default function ProblemAnalyticsPage() {
  const { weekId, problemId } = useParams<{ weekId: string; problemId: string }>()
  const { state, reload } = useAnalyticsData(() => getProblemAnalytics(problemId), [problemId])

  if (state.status === 'loading') {
    return (
      <AnalyticsLayout title="Problem Analytics" backHref={`/analytics/weeks/${weekId}`} backLabel="Back to Week">
        <LoadingState label="Loading problem analytics…" />
      </AnalyticsLayout>
    )
  }

  if (state.status === 'error') {
    return (
      <AnalyticsLayout title="Problem Analytics" backHref={`/analytics/weeks/${weekId}`} backLabel="Back to Week">
        <ErrorState message={state.message} onRetry={reload} />
      </AnalyticsLayout>
    )
  }

  const { problem, overview, verdictDistribution, languageDistribution, attemptDistribution } = state.data

  const sortedLanguages = [...languageDistribution].sort((a, b) => b.submissions - a.submissions)
  const languageChartData = sortedLanguages.map(l => ({ label: l.language, submissions: l.submissions }))

  const attemptData = [
    { label: '1', count: attemptDistribution['1'] },
    { label: '2', count: attemptDistribution['2'] },
    { label: '3', count: attemptDistribution['3'] },
    { label: '4+', count: attemptDistribution['4+'] },
  ]

  return (
    <AnalyticsLayout
      title={problem.title}
      backHref={`/analytics/weeks/${weekId}`}
      backLabel="Back to Week"
      badge={
        <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full ${DIFF_COLORS[problem.difficulty] || 'bg-slate-100 text-slate-600'}`}>
          {problem.difficulty}
        </span>
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard label="Participants" value={overview.participants.toLocaleString()} />
        <StatCard label="Accepted Users" value={overview.acceptedUsers.toLocaleString()} accent="emerald" />
        <StatCard
          label="Acceptance Rate"
          value={pct(overview.acceptanceRate)}
          accent={overview.acceptanceRate < 0.2 ? 'rose' : 'emerald'}
        />
        <StatCard label="Average Attempts" value={overview.averageAttempts.toFixed(2)} />
        <StatCard
          label="First-Attempt Accepted"
          value={overview.firstAttemptAccepted.toLocaleString()}
          hint={overview.participants > 0 ? `${pct(overview.firstAttemptAccepted / overview.participants)} of participants` : undefined}
        />
      </div>

      <SectionCard title="Verdict Distribution" subtitle="Breakdown of all submission verdicts for this problem">
        <VerdictPieChart data={verdictDistribution} />
      </SectionCard>

      <SectionCard title="Language Distribution" subtitle="Submissions by language, most used first">
        {languageChartData.length === 0 ? (
          <EmptyState title="No submissions yet" />
        ) : (
          <SimpleBarChart
            data={languageChartData}
            xKey="label"
            layout="vertical"
            height={Math.max(120, languageChartData.length * 48)}
            bars={[{ key: 'submissions', name: 'Submissions', color: '#6366f1' }]}
          />
        )}
      </SectionCard>

      <SectionCard title="Attempt Distribution" subtitle="How many attempts it takes users to solve this problem">
        <SimpleBarChart
          data={attemptData}
          xKey="label"
          height={240}
          bars={[{ key: 'count', name: 'Users', color: '#8b5cf6' }]}
        />
      </SectionCard>
    </AnalyticsLayout>
  )
}
