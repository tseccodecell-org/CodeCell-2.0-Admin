import { AuthError } from './auth'

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
}

export interface AdminSubmissionDetail extends AdminSubmissionRow {
  sourceCode: string
  invalidatedReason?: string
  invalidatedAt?: string
}

async function call<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok || data.success === false) {
    const message =
      data.error?.message ||
      (typeof data.error === 'string' ? data.error : null) ||
      `Request failed (${res.status})`
    throw new AuthError(res.status, message)
  }

  return data.data as T
}

export function listUsers(search: string, limit = 50, offset = 0) {
  const q = new URLSearchParams({ search, limit: String(limit), offset: String(offset) })
  return call<{ users: AdminUserRow[]; total: number }>('GET', `/api/admin/users?${q}`)
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
