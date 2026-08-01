'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { adminLogin, exchangeAdminCode, ADMIN_GOOGLE_LOGIN_URL } from '@/lib/auth'

const OAUTH_ERRORS: Record<string, string> = {
  not_an_admin: 'That Google account is not on the admin list. Ask an existing admin to add it.',
  missing_code: 'Google did not complete the sign in. Please try again.',
  exchange_failed: 'Could not verify that Google account. Please try again.',
  profile_failed: 'Could not read your Google profile. Please try again.',
  token_failed: 'Signed in with Google, but the session could not be created. Please try again.',
}

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const router = useRouter()
  const params = useSearchParams()

  useEffect(() => {
    const failure = params.get('error')
    if (failure) {
      setError(OAUTH_ERRORS[failure] || 'Google sign in failed. Please try again.')
      return
    }

    const code = params.get('code')
    if (!code) return

    setBusy(true)
    exchangeAdminCode(code)
      .then(() => router.replace('/challenges'))
      .catch(err => {
        setError(err instanceof Error ? err.message : 'Could not complete the Google sign in.')
        setBusy(false)
      })
  }, [params, router])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await adminLogin(email, password)
      router.replace('/challenges')
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : 'Could not reach the server. Is the backend up?'
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Cell Admin</h1>
            <p className="text-sm text-slate-500 mt-1">Contest Site Control Panel</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
          <button
            type="button"
            onClick={() => { window.location.href = ADMIN_GOOGLE_LOGIN_URL }}
            className="w-full flex items-center justify-center gap-2.5 border border-slate-200 rounded-lg py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.73 1.22 9.24 3.61l6.9-6.9C35.94 2.52 30.42 0 24 0 14.62 0 6.51 5.38 2.56 13.22l8.03 6.24C12.48 13.54 17.76 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.5 24.55c0-1.63-.15-3.2-.42-4.72H24v8.94h12.67c-.55 2.95-2.2 5.45-4.69 7.13l7.2 5.58c4.2-3.87 6.62-9.57 6.62-16.93z" />
              <path fill="#FBBC05" d="M10.59 28.54a14.48 14.48 0 010-9.08l-8.03-6.24A24.03 24.03 0 000 24c0 3.84.92 7.48 2.56 10.78l8.03-6.24z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.92-2.14 15.9-5.82l-7.2-5.58c-2 1.34-4.56 2.14-8.7 2.14-6.24 0-11.52-4.04-13.4-9.96l-8.03 6.24C6.5 42.62 14.62 48 24 48z" />
            </svg>
            Sign in with Google
          </button>

          <div className="flex items-center gap-3 my-5">
            <span className="flex-1 h-px bg-slate-200" />
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">or</span>
            <span className="flex-1 h-px bg-slate-200" />
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                placeholder="admin@tseccodecell.com"
                required
                autoComplete="username"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:border-slate-400"
              />
            </div>

            {error && (
              <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2.5">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!email || !password || busy}
              className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg text-sm"
            >
              {busy ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Cell Admin, restricted access
        </p>
      </div>
    </div>
  )
}

export default function Login() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
