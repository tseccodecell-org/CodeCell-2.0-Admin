import { call } from './api'

export type FinaleAccessMode = 'OPEN' | 'RESTRICTED'
export type FinaleState = 'DRAFT' | 'LIVE' | 'PAUSED' | 'ENDED'

export interface AdminFinaleResponse {
  weekId: string
  title: string
  description: string
  weekNumber: number
  accessMode: FinaleAccessMode
  state: FinaleState
  remainingSeconds: number
  liveSince?: string | null
  templatesLocked: boolean
  entryOpen: boolean
  scheduledStartAt?: string | null
  createdAt: string
}

export interface FinaleStatusResponse {
  weekId: string
  state: FinaleState
  accessMode: FinaleAccessMode
  remainingSeconds: number
  scoringActive: boolean
  liveSince?: string | null
  templatesLocked: boolean
  entryOpen: boolean
  scheduledStartAt?: string | null
}

export interface FinaleAccessGrantResponse {
  userId: number
  grantedAt: string
}

export interface CreateFinaleRequest {
  title: string
  description: string
  durationSeconds: number
  accessMode?: FinaleAccessMode
}

export function listFinales() {
  return call<AdminFinaleResponse[]>('GET', '/api/admin/finales')
}

export function createFinale(data: CreateFinaleRequest) {
  return call<AdminFinaleResponse>('POST', '/api/admin/finales', data)
}

export function startFinale(weekId: string) {
  return call<FinaleStatusResponse>('POST', `/api/admin/finales/${weekId}/start`)
}

export function pauseFinale(weekId: string) {
  return call<FinaleStatusResponse>('POST', `/api/admin/finales/${weekId}/pause`)
}

export function resumeFinale(weekId: string) {
  return call<FinaleStatusResponse>('POST', `/api/admin/finales/${weekId}/resume`)
}

export function endFinale(weekId: string) {
  return call<FinaleStatusResponse>('POST', `/api/admin/finales/${weekId}/end`)
}

export function setTemplatesLock(weekId: string, locked: boolean) {
  return call<FinaleStatusResponse>('PUT', `/api/admin/finales/${weekId}/templates-lock`, { locked })
}

export function setEntryOpen(weekId: string, open: boolean) {
  return call<FinaleStatusResponse>('PUT', `/api/admin/finales/${weekId}/entry`, { open })
}

export function setFinaleSchedule(weekId: string, scheduledStartAt: string | null) {
  return call<FinaleStatusResponse>('PUT', `/api/admin/finales/${weekId}/schedule`, {
    scheduledStartAt,
  })
}

export interface AdminTemplate {
  id: string
  name: string
  language: string
  sourceCode: string
  createdAt: string
  updatedAt: string
}

export interface ParticipantTemplates {
  userId: number
  templateCount: number
  templates: AdminTemplate[]
}

export function resetFinale(weekId: string) {
  return call<FinaleStatusResponse>('POST', `/api/admin/finales/${weekId}/reset`)
}

export function listParticipantTemplates(weekId: string) {
  return call<ParticipantTemplates[]>('GET', `/api/admin/finales/${weekId}/participant-templates`)
}

export function listAccessGrants(weekId: string) {
  return call<FinaleAccessGrantResponse[]>('GET', `/api/admin/finales/${weekId}/access-grants`)
}

export function grantAccess(weekId: string, userId: number) {
  return call<{ success: boolean }>('POST', `/api/admin/finales/${weekId}/access-grants`, { userId })
}

export function revokeAccess(weekId: string, userId: number) {
  return call<{ success: boolean }>('DELETE', `/api/admin/finales/${weekId}/access-grants/${userId}`)
}
