import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthError } from '@/lib/auth'
import { syncInvalidatedSubmissions, type InvalidatedSyncResult } from '@/lib/moderation'
import MaintenancePage from './page'

vi.mock('@/lib/moderation', () => ({
  syncInvalidatedSubmissions: vi.fn(),
}))

describe('MaintenancePage', () => {
  beforeEach(() => {
    vi.mocked(syncInvalidatedSubmissions).mockReset()
  })

  afterEach(cleanup)

  it('explains the global consequences before starting the sync', async () => {
    const user = userEvent.setup()
    render(createElement(MaintenancePage))

    await user.click(screen.getByRole('button', { name: 'Sync invalidated scores' }))

    expect(screen.getByRole('heading', { name: 'Sync invalidated scores' })).toBeInTheDocument()
    expect(screen.getByText(/accepted attempts for the same user and problem/i)).toBeInTheDocument()
    expect(syncInvalidatedSubmissions).not.toHaveBeenCalled()
  })

  it('renders all five repair metrics returned by the backend', async () => {
    vi.mocked(syncInvalidatedSubmissions).mockResolvedValue({
      pendingBefore: 4,
      processed: 4,
      failed: 0,
      pendingAfter: 0,
      affectedUsers: 3,
    })
    const user = userEvent.setup()
    render(createElement(MaintenancePage))

    await user.click(screen.getByRole('button', { name: 'Sync invalidated scores' }))
    await user.click(screen.getByRole('button', { name: 'Run sync' }))

    expect(await screen.findByText('4 pending before')).toBeInTheDocument()
    expect(screen.getByText('4 processed')).toBeInTheDocument()
    expect(screen.getByText('0 failed')).toBeInTheDocument()
    expect(screen.getByText('0 still pending')).toBeInTheDocument()
    expect(screen.getByText('3 affected users')).toBeInTheDocument()
  })

  it('keeps a partial repair summary visible when the sync reports an error', async () => {
    vi.mocked(syncInvalidatedSubmissions).mockRejectedValue(new AuthError(500, 'Some repairs could not be completed.', {
      pendingBefore: 4,
      processed: 3,
      failed: 1,
      pendingAfter: 1,
      affectedUsers: 3,
    }))
    const user = userEvent.setup()
    render(createElement(MaintenancePage))

    await user.click(screen.getByRole('button', { name: 'Sync invalidated scores' }))
    await user.click(screen.getByRole('button', { name: 'Run sync' }))

    expect(await screen.findByText('3 processed')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Some repairs could not be completed.')
    expect(screen.getAllByText('Some repairs could not be completed.')).toHaveLength(2)
  })

  it('clears an earlier repair summary when a retry has no result data', async () => {
    vi.mocked(syncInvalidatedSubmissions)
      .mockResolvedValueOnce({
        pendingBefore: 4,
        processed: 4,
        failed: 0,
        pendingAfter: 0,
        affectedUsers: 3,
      })
      .mockRejectedValueOnce(new Error('Network unavailable.'))
    const user = userEvent.setup()
    render(createElement(MaintenancePage))

    await user.click(screen.getByRole('button', { name: 'Sync invalidated scores' }))
    await user.click(screen.getByRole('button', { name: 'Run sync' }))
    expect(await screen.findByText('4 processed')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Sync invalidated scores' }))
    await user.click(screen.getByRole('button', { name: 'Run sync' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Network unavailable.')
    expect(screen.queryByText('4 processed')).not.toBeInTheDocument()
  })

  it.each([
    { pendingBefore: null, processed: 0, failed: 0, pendingAfter: null, affectedUsers: null },
    { pendingBefore: 4, processed: 3, failed: 1, pendingAfter: null, affectedUsers: 2 },
  ])('renders unknown counts as Unavailable while preserving known counts: %j', async (partial) => {
    vi.mocked(syncInvalidatedSubmissions).mockRejectedValue(new AuthError(500, 'Query failed.', partial))
    const user = userEvent.setup()
    render(createElement(MaintenancePage))
    await user.click(screen.getByRole('button', { name: 'Sync invalidated scores' }))
    await user.click(screen.getByRole('button', { name: 'Run sync' }))

    expect(await screen.findByText(`${partial.processed} processed`)).toBeInTheDocument()
    expect(screen.getAllByText('Unavailable')).toHaveLength(partial.pendingBefore === null ? 3 : 1)
    expect(screen.queryByText('0 still pending')).not.toBeInTheDocument()
    expect(screen.queryByText('0 pending before')).not.toBeInTheDocument()
    expect(screen.queryByText('0 affected users')).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Query failed.')
  })

  it('disables the sync trigger while a confirmed run is in progress', async () => {
    let resolveSync!: (result: InvalidatedSyncResult) => void
    vi.mocked(syncInvalidatedSubmissions).mockReturnValue(new Promise(resolve => {
      resolveSync = resolve
    }))
    const user = userEvent.setup()
    render(createElement(MaintenancePage))

    await user.click(screen.getByRole('button', { name: 'Sync invalidated scores' }))
    await user.click(screen.getByRole('button', { name: 'Run sync' }))

    expect(screen.getByRole('button', { name: 'Synchronizing...' })).toBeDisabled()

    resolveSync({ pendingBefore: 1, processed: 1, failed: 0, pendingAfter: 0, affectedUsers: 1 })
    expect(await screen.findByText('1 processed')).toBeInTheDocument()
  })
})
