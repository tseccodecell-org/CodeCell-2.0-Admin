'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TOKEN_KEY } from '@/lib/config'

// client-only auth check (token lives in sessionStorage) — same behavior as
// the old react-router Guard: render children once verified, else redirect
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [ok, setOk] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem(TOKEN_KEY)) {
      setOk(true)
    } else {
      router.replace('/login')
    }
  }, [router])

  if (!ok) return null
  return <>{children}</>
}
