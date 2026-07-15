'use client'

// small shared fetch hook so every analytics page gets loading/error/success
// state without hand-rolling it 3 times. project doesn't use React Query, so
// this just follows the same plain useState/useEffect pattern as DataContext.

import { useCallback, useEffect, useState } from 'react'

export type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: T }

export function useAnalyticsData<T>(fetcher: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' })

  const load = useCallback(() => {
    setState({ status: 'loading' })
    fetcher()
      .then(data => setState({ status: 'success', data }))
      .catch((e: unknown) => setState({
        status: 'error',
        message: e instanceof Error ? e.message : 'Something went wrong',
      }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => { load() }, [load])

  return { state, reload: load }
}
