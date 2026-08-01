import { call } from './api'

export const AUDIENCE_WEEK = 'WEEK_SUBMITTERS'
export const AUDIENCE_PROBLEM = 'PROBLEM_SUBMITTERS'

export interface AdminNotification {
  id: string
  week_id: string
  problem_id?: string
  audience: string
  subject: string
  message: string
  created_by_email: string
  recipient_count: number
  created_at: string
}

export interface SendNotificationInput {
  audience: string
  problemId?: string
  subject: string
  message: string
}

export function sendNotification(weekId: string, input: SendNotificationInput) {
  return call<AdminNotification>('POST', `/api/admin/weeks/${weekId}/notifications`, input)
}

export function listNotifications(weekId: string) {
  return call<AdminNotification[]>('GET', `/api/admin/weeks/${weekId}/notifications`)
}
