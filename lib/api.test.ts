import { afterEach, describe, expect, it, vi } from 'vitest'
import { call } from './api'

describe('call', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('keeps response data on an API error', async () => {
    const partial = {
      pendingBefore: 3,
      processed: 2,
      failed: 1,
      pendingAfter: 1,
      affectedUsers: 2,
    }
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({
          success: false,
          data: partial,
          error: {
            code: 'INVALIDATED_SYNC_INCOMPLETE',
            message: 'Some invalidated scores could not be synchronized',
          },
        }),
      })
    )

    await expect(call('POST', '/api/admin/moderation/sync-invalidated')).rejects.toMatchObject({
      status: 500,
      data: partial,
    })
  })
})
