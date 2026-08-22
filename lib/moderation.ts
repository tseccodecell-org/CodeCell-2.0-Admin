import { call } from './api'

export interface AdminUserRow {
  id: number
  name: string
  username: string
  email: string
  isTsecUser: boolean
  rating: number
  seasonXp: number
  isBanned: boolean
  banReason?: string
  bannedAt?: string
  collegeName?: string
  warningCount?: number
  problemsSolved?: number
  totalSubmissions?: number
  weeksParticipated?: number
}

export interface AdminSubmissionRow {
  id: string
  userId: number
  username: string
  problemId: string
  problemName: string
  language: string
  status: string
  verdict: string
  score: number
  invalidated: boolean
  submittedAt: string
  weekId?: string
  weekTitle?: string
  invalidatedReason?: string
}

export interface AdminSubmissionDetail extends AdminSubmissionRow {
  sourceCode: string
  invalidatedAt?: string
}

export interface AdminWarning {
  id: string
  userId?: number
  stage?: number
  reason: string
  revoked?: boolean
  issuedAt: string
  issuedBy?: string
}

export interface AdminUserStats {
  totalSubmissions: number
  acceptedSubmissions: number
  problemsSolved: number
  invalidatedSubmissions: number
}

export interface AdminUserDetail extends AdminUserRow {
  course?: string
  year?: string
  location?: string
  isRegistered?: boolean
  createdAt?: string
  warnings?: AdminWarning[]
  stats?: AdminUserStats
}


export function listUsers(search: string, limit = 50, offset = 0) {
  const q = new URLSearchParams({ search, limit: String(limit), offset: String(offset) })
  return call<{ users: AdminUserRow[]; total: number }>('GET', `/api/admin/users?${q}`)
}

export function getUser(userId: number) {
  return call<AdminUserDetail>('GET', `/api/admin/users/${userId}`)
}

export function warnUser(userId: number, reason: string) {
  return call<unknown>('POST', `/api/admin/users/${userId}/warn`, { reason })
}

export function revokeWarning(userId: number, warningId: string) {
  return call<unknown>('POST', `/api/admin/users/${userId}/warnings/${warningId}/revoke`)
}

export function banUser(userId: number, reason: string) {
  return call<unknown>('POST', `/api/admin/users/${userId}/ban`, { reason })
}

export function unbanUser(userId: number) {
  return call<unknown>('POST', `/api/admin/users/${userId}/unban`)
}

export function listSubmissions(params: {
  problemId?: string
  weekId?: string
  userId?: number
  limit?: number
  offset?: number
}) {
  const q = new URLSearchParams()
  if (params.problemId) q.set('problemId', params.problemId)
  if (params.weekId) q.set('weekId', params.weekId)
  if (params.userId) q.set('userId', String(params.userId))
  q.set('limit', String(params.limit ?? 50))
  q.set('offset', String(params.offset ?? 0))
  return call<{ submissions: AdminSubmissionRow[]; total: number }>(
    'GET',
    `/api/admin/submissions?${q}`
  )
}

export function getSubmission(submissionId: string) {
  return call<AdminSubmissionDetail>('GET', `/api/admin/submissions/${submissionId}`)
}

export function invalidateSubmission(submissionId: string, reason: string) {
  return call<unknown>('POST', `/api/admin/submissions/${submissionId}/invalidate`, { reason })
}

export function restoreSubmission(submissionId: string) {
  return call<unknown>('POST', `/api/admin/submissions/${submissionId}/restore`)
}

// pages through every participant. a flat limit would quietly cut the
// leaderboard off at whatever the first page happened to hold
export async function listAllUsers(): Promise<AdminUserRow[]> {
  // the api caps limit at 200 and silently falls back to 50 above that
  const PAGE = 200
  const MAX_PAGES = 40
  const all: AdminUserRow[] = []

  for (let page = 0; page < MAX_PAGES; page++) {
    const result = await listUsers('', PAGE, page * PAGE)
    const batch = result.users ?? []
    all.push(...batch)
    const total = result.total ?? all.length
    if (batch.length < PAGE || all.length >= total) break
  }
  return all
}
