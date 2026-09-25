import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthError } from '@/lib/auth'
import { getProctorView, lockParticipant, setStrikeLimit, unlockParticipant, type ProctorView } from '@/lib/finales'
import FinaleProctoringPanel from './FinaleProctoringPanel'

vi.mock('@/lib/finales', () => ({
  getProctorView: vi.fn(),
  lockParticipant: vi.fn(),
  unlockParticipant: vi.fn(),
  setStrikeLimit: vi.fn(),
}))

const view: ProctorView = {
  strikeLimit: 3,
  participants: [
    { userId: 1, name: 'Asha Menon', username: 'asha', strikes: 0, locked: false, events: [] },
    {
      userId: 2,
      name: 'Rohit Nair',
      username: 'rohit',
      strikes: 3,
      locked: true,
      lockReason: 'Left the contest screen 3 times',
      lockedBy: 'auto',
      lockedAt: new Date().toISOString(),
      events: [
        { kind: 'TAB_SWITCH', occurredAt: new Date().toISOString() },
        { kind: 'FULLSCREEN_EXIT', occurredAt: new Date().toISOString() },
        { kind: 'TAB_SWITCH', occurredAt: new Date().toISOString() },
      ],
    },
    {
      userId: 3,
      name: 'Kabir Shah',
      username: 'kabir',
      strikes: 1,
      locked: false,
      events: [{ kind: 'TAB_SWITCH', occurredAt: new Date().toISOString() }],
    },
  ],
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('finale proctoring panel', () => {
  it('lists locked participants first, then by strikes', async () => {
    vi.mocked(getProctorView).mockResolvedValue(view)

    render(<FinaleProctoringPanel weekId="wk" />)

    await screen.findByText('Rohit Nair')
    const rows = screen.getAllByRole('row').slice(1)
    expect(rows[0]).toHaveTextContent('Rohit Nair')
    expect(rows[0]).toHaveTextContent('Locked')
    expect(rows[0]).toHaveTextContent('Left the contest screen 3 times')
    expect(rows[1]).toHaveTextContent('Kabir Shah')
    expect(rows[2]).toHaveTextContent('Asha Menon')
    expect(screen.getByText('1 locked')).toBeInTheDocument()
    expect(screen.getByText('2 with strikes')).toBeInTheDocument()
  })

  it('unlocks a participant and reloads', async () => {
    vi.mocked(getProctorView).mockResolvedValue(view)
    vi.mocked(unlockParticipant).mockResolvedValue({ strikes: 0, strikeLimit: 3, locked: false })
    const user = userEvent.setup()

    render(<FinaleProctoringPanel weekId="wk" />)
    await user.click(await screen.findByRole('button', { name: 'Unlock' }))

    expect(unlockParticipant).toHaveBeenCalledWith('wk', 2)
    await waitFor(() => expect(getProctorView).toHaveBeenCalledTimes(2))
  })

  it('locks a participant with the reason the organiser gives', async () => {
    vi.mocked(getProctorView).mockResolvedValue(view)
    vi.mocked(lockParticipant).mockResolvedValue({ strikes: 1, strikeLimit: 3, locked: true })
    const user = userEvent.setup()

    render(<FinaleProctoringPanel weekId="wk" />)
    const kabir = (await screen.findByText('Kabir Shah')).closest('tr')!
    await user.click(within(kabir).getByRole('button', { name: 'Lock' }))
    await user.type(screen.getByRole('textbox'), 'Phone on the desk')
    const dialogButtons = screen.getAllByRole('button', { name: 'Lock' })
    await user.click(dialogButtons[dialogButtons.length - 1])

    expect(lockParticipant).toHaveBeenCalledWith('wk', 3, 'Phone on the desk')
  })

  it('saves a new strike limit', async () => {
    vi.mocked(getProctorView).mockResolvedValue(view)
    vi.mocked(setStrikeLimit).mockResolvedValue({ ...view, strikeLimit: 5 })
    const user = userEvent.setup()

    render(<FinaleProctoringPanel weekId="wk" />)
    const input = await screen.findByLabelText('Lock at')
    await user.clear(input)
    await user.type(input, '5')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(setStrikeLimit).toHaveBeenCalledWith('wk', 5)
  })

  it('explains that proctoring waits for the backend restart', async () => {
    vi.mocked(getProctorView).mockRejectedValue(new AuthError(404, 'Not found'))

    render(<FinaleProctoringPanel weekId="wk" />)

    expect(await screen.findByText(/does not have proctoring yet/)).toBeInTheDocument()
  })
})
