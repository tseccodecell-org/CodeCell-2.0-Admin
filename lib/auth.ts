// Admin auth mirrors the go backend: POST /admin/login sets an HttpOnly
// admin_jwt_token cookie, so the browser cannot read or clear it. Session
// state is therefore always confirmed with the server, never with storage.

const SESSION_PROBE = '/api/admin/weeks'

export class AuthError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'AuthError'
  }
}

export async function adminLogin(email: string, password: string): Promise<void> {
  const res = await fetch('/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email, password }),
    credentials: 'include',
  })

  if (res.ok) return

  const body = await res.json().catch(() => ({} as Record<string, unknown>))
  const message =
    (typeof body.message === 'string' && body.message) ||
    (typeof body.error === 'string' && body.error) ||
    (res.status === 401
      ? 'Invalid admin credentials.'
      : res.status === 404
        ? 'No admin account exists with that email.'
        : res.status >= 500
          ? 'The server is having trouble. Please try again shortly.'
          : `Login failed (${res.status})`)

  throw new AuthError(res.status, message)
}

export async function verifyAdminSession(): Promise<boolean> {
  try {
    const res = await fetch(SESSION_PROBE, { credentials: 'include' })
    if (res.status === 401 || res.status === 403) return false
    return res.ok
  } catch {
    return false
  }
}

export async function adminLogout(): Promise<void> {
  try {
    await fetch('/admin/logout', { method: 'POST', credentials: 'include' })
  } catch {
    // no admin logout endpoint yet, fall through to the client side redirect
  }
}
