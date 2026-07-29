'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { verifyAdminSession } from '@/lib/auth'

// the admin token is an HttpOnly cookie, so the only honest way to know whether
// we are signed in is to ask the backend
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [state, setState] = useState<'checking' | 'ok'>('checking')

  useEffect(() => {
    let cancelled = false

    verifyAdminSession().then(valid => {
      if (cancelled) return
      if (valid) setState('ok')
      else router.replace('/login')
    })

    return () => { cancelled = true }
  }, [router])

  if (state === 'checking') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-400">Checking your session…</p>
      </div>
    )
  }

  return <>{children}</>
}
