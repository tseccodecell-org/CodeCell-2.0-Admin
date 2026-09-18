import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AdminFinaleResponse, FinaleStatusResponse } from '@/lib/finales'
import {
  createFinale,
  endFinale,
  grantAccess,
  listAccessGrants,
  listFinales,
  pauseFinale,
  resumeFinale,
  revokeAccess,
  startFinale,
  setTemplatesLock,
} from '@/lib/finales'
import { listUsers, type AdminUserRow } from '@/lib/moderation'
import FinalesPage from './page'

vi.mock('@/lib/finales', () => ({
  listFinales: vi.fn(),
  createFinale: vi.fn(),
  startFinale: vi.fn(),
  pauseFinale: vi.fn(),
  resumeFinale: vi.fn(),
  setEntryOpen: vi.fn(),
  setFinaleDuration: vi.fn(),
  resetFinale: vi.fn(),
  listParticipantTemplates: vi.fn(),
  setTemplatesLock: vi.fn(),
  setFinaleSchedule: vi.fn(),
  endFinale: vi.fn(),
  listAccessGrants: vi.fn(),
  grantAccess: vi.fn(),
  revokeAccess: vi.fn(),
}))

vi.mock('@/lib/moderation', () => ({
  listUsers: vi.fn(),
}))

function makeFinale(overrides: Partial<AdminFinaleResponse> = {}): AdminFinaleResponse {
  return {
    weekId: 'week-1',
    title: 'Grand Finale',
    description: 'The last stand.',
    weekNumber: 8,
    accessMode: 'OPEN',
    state: 'DRAFT',
    remainingSeconds: 3600,
    liveSince: null,
    templatesLocked: false,
    entryOpen: false,
    scheduledStartAt: null,
    createdAt: '2026-09-16T12:00:00Z',
    ...overrides,
  }
}

describe('FinalesPage', () => {
  beforeEach(() => {
    vi.mocked(listFinales).mockReset()
    vi.mocked(createFinale).mockReset()
    vi.mocked(startFinale).mockReset()
    vi.mocked(pauseFinale).mockReset()
    vi.mocked(resumeFinale).mockReset()
    vi.mocked(endFinale).mockReset()
    vi.mocked(listAccessGrants).mockReset().mockResolvedValue([])
    vi.mocked(listUsers).mockReset().mockResolvedValue({ users: [], total: 0 })
    vi.mocked(grantAccess).mockReset()
    vi.mocked(revokeAccess).mockReset()
  })

  afterEach(cleanup)

  it('shows Pause while a finale is live and sends a confirmed pause', async () => {
    const liveFinale = makeFinale({ weekId: 'week-live', state: 'LIVE', liveSince: '2026-09-16T12:00:00Z' })
    vi.mocked(listFinales).mockResolvedValue([liveFinale])
    const updatedStatus: FinaleStatusResponse = {
      weekId: liveFinale.weekId,
      state: 'PAUSED',
      accessMode: liveFinale.accessMode,
      remainingSeconds: 3200,
      scoringActive: false,
      templatesLocked: false,
      entryOpen: false,
    }
    vi.mocked(pauseFinale).mockResolvedValue(updatedStatus)

    const user = userEvent.setup()
    render(createElement(FinalesPage))

    await screen.findByText('Grand Finale')

    await user.click(screen.getByRole('button', { name: 'Pause' }))
    await user.click(screen.getByRole('button', { name: 'Pause scoring' }))

    expect(pauseFinale).toHaveBeenCalledWith(liveFinale.weekId)
    expect(await screen.findByRole('button', { name: 'Resume' })).toBeInTheDocument()
  })

  it('surfaces a visible error instead of failing silently when a transition is rejected', async () => {
    const liveFinale = makeFinale({ weekId: 'week-live', state: 'LIVE' })
    vi.mocked(listFinales).mockResolvedValue([liveFinale])
    vi.mocked(pauseFinale).mockRejectedValue(new Error('Another admin already paused this finale.'))

    const user = userEvent.setup()
    render(createElement(FinalesPage))

    await screen.findByText('Grand Finale')

    await user.click(screen.getByRole('button', { name: 'Pause' }))
    await user.click(screen.getByRole('button', { name: 'Pause scoring' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Another admin already paused this finale.')
    // the state did not actually change, so Pause is still the visible action
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument()
  })

  it('surfaces a visible error instead of failing silently when granting access fails', async () => {
    const restrictedFinale = makeFinale({ weekId: 'week-restricted', accessMode: 'RESTRICTED' })
    vi.mocked(listFinales).mockResolvedValue([restrictedFinale])
    const user1: AdminUserRow = {
      id: 7, name: 'Ada Lovelace', username: 'ada', email: 'ada@example.com',
      isTsecUser: false, rating: 0, seasonXp: 0, isBanned: false,
    }
    vi.mocked(listUsers).mockResolvedValue({ users: [user1], total: 1 })
    vi.mocked(grantAccess).mockRejectedValue(new Error('That participant is already banned.'))

    const user = userEvent.setup()
    render(createElement(FinalesPage))

    await screen.findByText('Grand Finale')

    await user.click(screen.getByRole('button', { name: 'Grant access' }))
    await user.type(screen.getByPlaceholderText(/search participants/i), 'ada')
    await user.click(await screen.findByRole('button', { name: 'Grant' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('That participant is already banned.')
  })

  it('renders the grant access control for restricted finales', async () => {
    const restrictedFinale = makeFinale({ weekId: 'week-restricted', accessMode: 'RESTRICTED' })
    vi.mocked(listFinales).mockResolvedValue([restrictedFinale])

    render(createElement(FinalesPage))

    await screen.findByText('Grand Finale')

    expect(screen.getByRole('button', { name: 'Grant access' })).toBeVisible()
    await waitFor(() => expect(listAccessGrants).toHaveBeenCalledWith(restrictedFinale.weekId))
  })

  it('renders a revoke control for each existing grant, using cached names when available', async () => {
    const restrictedFinale = makeFinale({ weekId: 'week-restricted', accessMode: 'RESTRICTED' })
    vi.mocked(listFinales).mockResolvedValue([restrictedFinale])
    vi.mocked(listAccessGrants).mockResolvedValue([
      { userId: 7, grantedAt: '2026-09-16T12:00:00Z' },
      { userId: 8, grantedAt: '2026-09-16T12:05:00Z' },
    ])

    render(createElement(FinalesPage))

    await screen.findByText('Grand Finale')

    expect(await screen.findByText('User #7')).toBeInTheDocument()
    expect(screen.getByText('User #8')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Revoke' })).toHaveLength(2)
  })

  it('calls revokeAccess with the weekId and userId and refetches grants on click', async () => {
    const restrictedFinale = makeFinale({ weekId: 'week-restricted', accessMode: 'RESTRICTED' })
    vi.mocked(listFinales).mockResolvedValue([restrictedFinale])
    vi.mocked(listAccessGrants)
      .mockResolvedValueOnce([{ userId: 7, grantedAt: '2026-09-16T12:00:00Z' }])
      .mockResolvedValueOnce([])
    vi.mocked(revokeAccess).mockResolvedValue({ success: true })

    const user = userEvent.setup()
    render(createElement(FinalesPage))

    await screen.findByText('Grand Finale')
    await screen.findByText('User #7')

    await user.click(screen.getByRole('button', { name: 'Revoke' }))

    expect(revokeAccess).toHaveBeenCalledWith(restrictedFinale.weekId, 7)
    await waitFor(() => expect(listAccessGrants).toHaveBeenCalledTimes(2))
    expect(screen.queryByText('User #7')).not.toBeInTheDocument()
  })

  it('resolves grant names from the grant-search cache instead of showing a bare id', async () => {
    const restrictedFinale = makeFinale({ weekId: 'week-restricted', accessMode: 'RESTRICTED' })
    vi.mocked(listFinales).mockResolvedValue([restrictedFinale])
    vi.mocked(listAccessGrants).mockResolvedValue([{ userId: 7, grantedAt: '2026-09-16T12:00:00Z' }])
    const user1: AdminUserRow = {
      id: 7, name: 'Ada Lovelace', username: 'ada', email: 'ada@example.com',
      isTsecUser: false, rating: 0, seasonXp: 0, isBanned: false,
    }
    vi.mocked(listUsers).mockResolvedValue({ users: [user1], total: 1 })

    const user = userEvent.setup()
    render(createElement(FinalesPage))

    await screen.findByText('Grand Finale')
    await screen.findByText('User #7')

    await user.click(screen.getByRole('button', { name: 'Grant access' }))
    await user.type(screen.getByPlaceholderText(/search participants/i), 'ada')
    await screen.findByText('@ada')

    await waitFor(() => expect(screen.getAllByText('Ada Lovelace').length).toBeGreaterThanOrEqual(2))
    expect(screen.queryByText('User #7')).not.toBeInTheDocument()
  })

  it('surfaces a visible error instead of silently emptying results when participant search fails', async () => {
    const restrictedFinale = makeFinale({ weekId: 'week-restricted', accessMode: 'RESTRICTED' })
    vi.mocked(listFinales).mockResolvedValue([restrictedFinale])
    vi.mocked(listUsers).mockRejectedValue(new Error('Session expired.'))

    const user = userEvent.setup()
    render(createElement(FinalesPage))

    await screen.findByText('Grand Finale')

    await user.click(screen.getByRole('button', { name: 'Grant access' }))
    await user.type(screen.getByPlaceholderText(/search participants/i), 'ada')

    expect(await screen.findByRole('alert')).toHaveTextContent('Session expired.')
  })

  it('does not render grant access controls for an open finale', async () => {
    const openFinale = makeFinale({ weekId: 'week-open', accessMode: 'OPEN' })
    vi.mocked(listFinales).mockResolvedValue([openFinale])

    render(createElement(FinalesPage))

    await screen.findByText('Grand Finale')

    expect(screen.queryByRole('button', { name: 'Grant access' })).not.toBeInTheDocument()
    expect(listAccessGrants).not.toHaveBeenCalled()
  })

  it('renders Start for a draft finale and calls startFinale directly, no confirmation needed', async () => {
    const draftFinale = makeFinale({ weekId: 'week-draft', state: 'DRAFT' })
    vi.mocked(listFinales).mockResolvedValue([draftFinale])
    vi.mocked(startFinale).mockResolvedValue({
      weekId: draftFinale.weekId,
      state: 'LIVE',
      accessMode: draftFinale.accessMode,
      remainingSeconds: draftFinale.remainingSeconds,
      scoringActive: true,
      templatesLocked: false,
      entryOpen: false,
      liveSince: '2026-09-16T13:00:00Z',
    })

    const user = userEvent.setup()
    render(createElement(FinalesPage))

    await screen.findByText('Grand Finale')
    await user.click(screen.getByRole('button', { name: 'Start' }))

    expect(startFinale).toHaveBeenCalledWith(draftFinale.weekId)
    expect(await screen.findByRole('button', { name: 'Pause' })).toBeInTheDocument()
  })

  it('requires typing the title before End permanently is enabled, then calls endFinale', async () => {
    const liveFinale = makeFinale({ weekId: 'week-live', state: 'LIVE' })
    vi.mocked(listFinales).mockResolvedValue([liveFinale])
    vi.mocked(endFinale).mockResolvedValue({
      weekId: liveFinale.weekId,
      state: 'ENDED',
      accessMode: liveFinale.accessMode,
      remainingSeconds: 0,
      scoringActive: false,
      templatesLocked: false,
      entryOpen: false,
    })

    const user = userEvent.setup()
    render(createElement(FinalesPage))

    await screen.findByText('Grand Finale')
    await user.click(screen.getByRole('button', { name: 'End permanently' }))

    const confirmButton = screen.getAllByRole('button', { name: 'End permanently' })[1]
    expect(confirmButton).toBeDisabled()

    await user.type(screen.getByRole('textbox'), liveFinale.title)
    expect(confirmButton).toBeEnabled()

    await user.click(confirmButton)
    expect(endFinale).toHaveBeenCalledWith(liveFinale.weekId)
  })

  it('creates a finale converting minutes to seconds and shows the backend-assigned week number', async () => {
    vi.mocked(listFinales).mockResolvedValue([])
    const created = makeFinale({ weekId: 'week-new', title: 'Season Finale', weekNumber: 12 })
    vi.mocked(createFinale).mockResolvedValue(created)

    const user = userEvent.setup()
    render(createElement(FinalesPage))

    await waitFor(() => expect(listFinales).toHaveBeenCalled())

    await user.click(screen.getByRole('button', { name: 'New finale' }))
    await user.type(screen.getByLabelText('Title'), 'Season Finale')
    const durationInput = screen.getByLabelText(/duration/i)
    await user.clear(durationInput)
    await user.type(durationInput, '45')
    await user.click(screen.getByRole('button', { name: 'Create finale' }))

    await waitFor(() => expect(createFinale).toHaveBeenCalledWith({
      title: 'Season Finale',
      description: '',
      durationSeconds: 2700,
      accessMode: 'RESTRICTED',
    }))

    expect(await screen.findByText('Season Finale')).toBeInTheDocument()
    expect(screen.getByText('Week 12')).toBeInTheDocument()
  })
})

describe('finale template window', () => {
  it('locks the template library and reflects it back on the card', async () => {
    const finale = makeFinale({ weekId: 'week-lock' })
    vi.mocked(listFinales).mockResolvedValue([finale])
    vi.mocked(setTemplatesLock).mockResolvedValue({
      weekId: finale.weekId,
      state: finale.state,
      accessMode: finale.accessMode,
      remainingSeconds: finale.remainingSeconds,
      scoringActive: false,
      templatesLocked: true,
      entryOpen: false,
    })

    render(createElement(FinalesPage))

    const lock = await screen.findByRole('button', { name: 'Lock templates for review' })
    await userEvent.click(lock)

    await waitFor(() => expect(setTemplatesLock).toHaveBeenCalledWith('week-lock', true))
    expect(await screen.findByText('Templates locked')).toBeInTheDocument()
    expect(
      await screen.findByRole('button', { name: 'Unlock templates' })
    ).toBeInTheDocument()
  })

  it('surfaces a failure to lock instead of silently doing nothing', async () => {
    vi.mocked(listFinales).mockResolvedValue([makeFinale({ weekId: 'week-lock' })])
    vi.mocked(setTemplatesLock).mockRejectedValue(new Error('Backend refused the lock'))

    render(createElement(FinalesPage))

    await userEvent.click(
      await screen.findByRole('button', { name: 'Lock templates for review' })
    )

    expect(await screen.findByRole('alert')).toHaveTextContent('Backend refused the lock')
  })
})
