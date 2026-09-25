import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getAdminStandings, type Standings } from '@/lib/finales'
import FinaleStandingsModal from './FinaleStandingsModal'

vi.mock('@/lib/finales', () => ({
  getAdminStandings: vi.fn(),
}))

const standings: Standings = {
  problems: [
    { id: 'p1', label: 'A', title: 'Ladders', points: 100 },
    { id: 'p2', label: 'B', title: 'Bridges', points: 200 },
  ],
  rows: [
    {
      rank: 1,
      userId: 7,
      name: 'Ada Lovelace',
      username: 'ada',
      score: 300,
      solved: 2,
      penaltySeconds: 1500,
      cells: [
        { problemId: 'p1', solved: true, points: 100, solvedAtSeconds: 600, wrongAttempts: 0, pending: false },
        { problemId: 'p2', solved: true, points: 200, solvedAtSeconds: 1500, wrongAttempts: 2, pending: false },
      ],
    },
    {
      rank: 2,
      userId: 8,
      name: 'Alan Turing',
      username: 'alan',
      score: 0,
      solved: 0,
      penaltySeconds: 0,
      cells: [{ problemId: 'p1', solved: false, points: 0, wrongAttempts: 3, pending: true }],
    },
  ],
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('finale standings popup', () => {
  it('ranks participants with a column per problem', async () => {
    vi.mocked(getAdminStandings).mockResolvedValue(standings)

    render(<FinaleStandingsModal weekId="wk" title="Grand Finale" onClose={() => {}} />)

    await screen.findByText('Ada Lovelace')
    expect(getAdminStandings).toHaveBeenCalledWith('wk')
    const rows = screen.getAllByRole('row').slice(1)
    expect(rows[0]).toHaveTextContent('Ada Lovelace')
    expect(rows[0]).toHaveTextContent('300')
    expect(rows[1]).toHaveTextContent('Alan Turing')
    expect(screen.getByLabelText('Problem B solved at 25:00 after 2 wrong attempts')).toBeInTheDocument()
    expect(screen.getByLabelText('Problem A being judged, 3 wrong attempts so far')).toBeInTheDocument()
  })

  it('closes on Escape', async () => {
    vi.mocked(getAdminStandings).mockResolvedValue(standings)
    const onClose = vi.fn()
    const user = userEvent.setup()

    render(<FinaleStandingsModal weekId="wk" title="Grand Finale" onClose={onClose} />)
    await screen.findByText('Ada Lovelace')
    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalled()
  })
})
