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
  templatesOpen: boolean
  internshipOpen: boolean
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
  templatesOpen: boolean
  internshipOpen: boolean
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

export function setTemplatesAccess(weekId: string, open: boolean) {
  return call<FinaleStatusResponse>('PUT', `/api/admin/finales/${weekId}/templates-access`, {
    open,
  })
}

export function setInternshipAccess(weekId: string, open: boolean) {
  return call<FinaleStatusResponse>('PUT', `/api/admin/finales/${weekId}/internship-access`, {
    open,
  })
}

export function setFinaleDuration(weekId: string, durationSeconds: number) {
  return call<FinaleStatusResponse>('PUT', `/api/admin/finales/${weekId}/duration`, {
    durationSeconds,
  })
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

export interface ProctorEvent {
  kind: 'TAB_SWITCH' | 'FULLSCREEN_EXIT' | string
  occurredAt: string
}

export interface ProctorParticipant {
  userId: number
  name: string
  username: string
  strikes: number
  locked: boolean
  lockReason?: string
  lockedBy?: 'auto' | 'admin' | string
  lockedAt?: string
  events: ProctorEvent[]
}

export interface ProctorView {
  strikeLimit: number
  participants: ProctorParticipant[]
}

export interface ProctorStatus {
  strikes: number
  strikeLimit: number
  locked: boolean
  lockReason?: string
}

export function getProctorView(weekId: string) {
  return call<ProctorView>('GET', `/api/admin/finales/${weekId}/proctor`)
}

export function lockParticipant(weekId: string, userId: number, reason: string) {
  return call<ProctorStatus>('POST', `/api/admin/finales/${weekId}/participants/${userId}/lock`, { reason })
}

export function unlockParticipant(weekId: string, userId: number) {
  return call<ProctorStatus>('POST', `/api/admin/finales/${weekId}/participants/${userId}/unlock`)
}

export function setStrikeLimit(weekId: string, strikeLimit: number) {
  return call<ProctorView>('PUT', `/api/admin/finales/${weekId}/strike-limit`, { strikeLimit })
}
