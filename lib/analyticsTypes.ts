// shapes for the read-only admin analytics endpoints (/api/admin/analytics/*).
// kept in their own file rather than lib/types.ts since these are a separate,
// self-contained surface (overview -> week -> problem drill-down) and mirror
// the API doc 1:1 rather than any UI form shape.

export interface WeeklyTrendEntry {
  weekId: string
  weekNumber: number
  participants: number
  submissions: number
  accepted: number
}

export interface OverviewData {
  totalUsers: number
  totalProblems: number
  totalWeeks: number
  totalSubmissions: number
  activeWeeks: number
  activeUsersThisWeek: number
  participantsThisWeek: number
  acceptedSubmissions: number
  acceptanceRate: number // fraction 0–1, not a percentage
  weeklyTrend: WeeklyTrendEntry[]
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
  completionRate: number // fraction 0–1
}

export interface DailyActivityEntry {
  date: string // "YYYY-MM-DD"
  participants: number
  submissions: number
}

export interface ProblemBreakdownEntry {
  problemId: string
  title: string
  difficulty: string // "EASY" | "MEDIUM" | "HARD" — free string server-side
  participants: number
  acceptedUsers: number
  totalSubmissions: number
  averageAttempts: number
  acceptanceRate: number // fraction 0–1
}

export interface VerdictDistribution {
  ACCEPTED: number
  WRONG_ANSWER: number
  TIME_LIMIT_EXCEEDED: number
  MEMORY_LIMIT_EXCEEDED: number
  COMPILATION_ERROR: number
  RUNTIME_ERROR: number
  SYSTEM_ERROR: number
}

export interface WeekAnalyticsData {
  week: WeekInfo
  overview: WeekOverview
  dailyActivity: DailyActivityEntry[]
  problemBreakdown: ProblemBreakdownEntry[]
  verdictDistribution: VerdictDistribution
}

export interface ProblemInfo {
  id: string
  title: string
  difficulty: string
}

export interface ProblemOverview {
  participants: number
  acceptedUsers: number
  acceptanceRate: number // fraction 0–1
  totalSubmissions: number
  averageAttempts: number
  firstAttemptAccepted: number // count of users, not a rate
}

export interface LanguageDistributionEntry {
  language: string
  submissions: number
}

export interface AttemptDistribution {
  '1': number
  '2': number
  '3': number
  '4+': number
}

export interface ProblemAnalyticsData {
  problem: ProblemInfo
  overview: ProblemOverview
  verdictDistribution: VerdictDistribution
  languageDistribution: LanguageDistributionEntry[]
  attemptDistribution: AttemptDistribution
}

export interface ApiErrorResponse {
  success: false
  error: { code: string; message: string }
}
