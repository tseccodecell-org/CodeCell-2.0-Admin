import { call } from './api'

export interface AuditLog {
  id: string
  admin_id: number
  admin_email: string
  admin_name: string
  action: string
  target: string
  method: string
  path: string
  status: number
  reason?: string
  created_at: string
}

export interface AuditAdmin {
  id: number
  name: string
  username: string
  email: string
}

export interface AuditQuery {
  adminId?: number
  action?: string
  from?: string
  to?: string
  limit?: number
  offset?: number
}

export function listAuditLogs(params: AuditQuery) {
  const q = new URLSearchParams()
  if (params.adminId) q.set('adminId', String(params.adminId))
  if (params.action) q.set('action', params.action)
  if (params.from) q.set('from', params.from)
  if (params.to) q.set('to', params.to)
  q.set('limit', String(params.limit ?? 100))
  q.set('offset', String(params.offset ?? 0))
  return call<{ logs: AuditLog[]; total: number }>('GET', `/api/admin/audit-logs?${q}`)
}

export function listAuditActions() {
  return call<string[]>('GET', '/api/admin/audit-logs/actions')
}

export function listAdmins() {
  return call<AuditAdmin[]>('GET', '/api/admin/admins')
}
