import { call } from './api'

export interface WeeklyTrend {
  weekId: string
  weekNumber: number
  participants: number
  submissions: number
  accepted: number
}

export interface AnalyticsOverview {
  totalUsers: number
  totalProblems: number
  totalWeeks: number
  totalSubmissions: number
  activeWeeks: number
  activeUsersThisWeek: number
  participantsThisWeek: number
  acceptedSubmissions: number
  acceptanceRate: number
  weeklyTrend: WeeklyTrend[]
}

export interface WeekInfo {
  id: string
  weekNumber: number
  title: string
}

export interface WeekOverview {
  participants: number
  usersSubmitted: number
  totalSubmissions: number
  acceptedUsers: number
  averageSubmissionsPerUser: number
  averageScore: number
  completionRate: number
}

export interface DailyActivity {
  date: string
  participants: number
  submissions: number
}

export interface ProblemBreakdown {
  problemId: string
  title: string
  difficulty: string
  participants: number
  acceptedUsers: number
  totalSubmissions: number
  averageAttempts: number
  acceptanceRate: number
}

export type VerdictDistribution = Record<string, number>

export interface WeekAnalytics {
  week: WeekInfo
  overview: WeekOverview
  dailyActivity: DailyActivity[]
  problemBreakdown: ProblemBreakdown[]
  verdictDistribution: VerdictDistribution
}

export function getOverview() {
  return call<AnalyticsOverview>('GET', '/api/admin/analytics/overview')
}

export function getWeekAnalytics(weekId: string) {
  return call<WeekAnalytics>('GET', `/api/admin/weeks/${weekId}/analytics`)
}
