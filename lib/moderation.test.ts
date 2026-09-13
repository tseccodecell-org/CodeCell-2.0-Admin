import { describe, expect, it, vi } from 'vitest'

vi.mock('./api', () => ({ call: vi.fn() }))

import { call } from './api'
import { syncInvalidatedSubmissions } from './moderation'

describe('syncInvalidatedSubmissions', () => {
  it('posts to the global invalidated score sync endpoint', async () => {
    const result = {
      pendingBefore: 2,
      processed: 2,
      failed: 0,
      pendingAfter: 0,
      affectedUsers: 1,
    }
    vi.mocked(call).mockResolvedValue(result)

    await expect(syncInvalidatedSubmissions()).resolves.toEqual(result)
    expect(call).toHaveBeenCalledWith('POST', '/api/admin/moderation/sync-invalidated')
  })
})
