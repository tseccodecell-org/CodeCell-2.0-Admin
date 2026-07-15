// one module for all admin analytics reads. requests go through the same
// next.config.ts rewrite as everything else in DataContext.tsx — no separate
// client needed, this is just fetch + the {success,data}/{success,error} envelope.

import type {
  ApiErrorResponse, OverviewData, ProblemAnalyticsData, WeekAnalyticsData,
} from './analyticsTypes'

export class AnalyticsApiError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url)
  const body = await res.json().catch(() => ({}))
  if (!res.ok || body?.success === false) {
    const err = body as ApiErrorResponse
    throw new AnalyticsApiError(
      err.error?.code || 'UNKNOWN',
      err.error?.message || `${url} failed (${res.status})`,
    )
  }
  return body.data as T
}

export function getOverview(): Promise<OverviewData> {
  return get<OverviewData>('/api/admin/analytics/overview')
}

export function getWeekAnalytics(weekId: string): Promise<WeekAnalyticsData> {
  return get<WeekAnalyticsData>(`/api/admin/weeks/${weekId}/analytics`)
}

export function getProblemAnalytics(problemId: string): Promise<ProblemAnalyticsData> {
  return get<ProblemAnalyticsData>(`/api/admin/problems/${problemId}/analytics`)
}
