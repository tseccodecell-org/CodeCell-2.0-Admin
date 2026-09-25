'use client'

import { useEffect, useState } from 'react'
import { getUser } from './moderation'

export interface UserLabel {
  name: string
  username: string
}

const cache = new Map<number, UserLabel>()

export function useUserNames(ids: number[]): Record<number, UserLabel> {
  const [labels, setLabels] = useState<Record<number, UserLabel>>(() => {
    const known: Record<number, UserLabel> = {}
    for (const id of ids) {
      const hit = cache.get(id)
      if (hit) known[id] = hit
    }
    return known
  })

  const key = [...new Set(ids)].sort((a, b) => a - b).join(',')

  useEffect(() => {
    if (!key) return
    let cancelled = false
    const wanted = key.split(',').map(Number)
    const missing = wanted.filter(id => !cache.has(id))

    Promise.all(
      missing.map(id =>
        getUser(id)
          .then(user => cache.set(id, { name: user.name || user.username, username: user.username }))
          .catch(() => {})
      )
    ).then(() => {
      if (cancelled) return
      const next: Record<number, UserLabel> = {}
      for (const id of wanted) {
        const hit = cache.get(id)
        if (hit) next[id] = hit
      }
      setLabels(next)
    })

    return () => {
      cancelled = true
    }
  }, [key])

  return labels
}
