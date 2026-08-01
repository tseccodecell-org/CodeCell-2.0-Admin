import { AuthError } from './auth'

export async function call<T>(method: string, url: string, body?: unknown): Promise<T> {
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
