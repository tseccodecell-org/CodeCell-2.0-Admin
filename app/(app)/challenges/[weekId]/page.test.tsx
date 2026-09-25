import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useData } from '@/context/DataContext'
import WeekDetail from './page'

vi.mock('next/navigation', () => ({
  useParams: () => ({ weekId: 'finale-week' }),
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/context/DataContext', () => ({
  useData: vi.fn(),
}))

const mockedUseData = useData as unknown as ReturnType<typeof vi.fn>

function withData(weeksStatus: 'loading' | 'ready' | 'error', refreshWeeks = vi.fn().mockResolvedValue(undefined)) {
  mockedUseData.mockReturnValue({
    weeks: [],
    weeksStatus,
    refreshWeeks,
    deleteProblem: vi.fn(),
    updateWeek: vi.fn(),
    deleteWeek: vi.fn(),
    reorderProblems: vi.fn(),
    moveProblemToWeek: vi.fn(),
  })
  return refreshWeeks
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('week detail page', () => {
  it('says it is loading while the week list is still on its way', () => {
    withData('loading')

    render(<WeekDetail />)

    expect(screen.getByText('Loading the week.')).toBeInTheDocument()
    expect(screen.queryByText('Week not found.')).not.toBeInTheDocument()
  })

  it('asks the server again once before deciding a week does not exist', () => {
    const refreshWeeks = withData('ready')

    const { rerender } = render(<WeekDetail />)
    expect(refreshWeeks).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Loading the week.')).toBeInTheDocument()

    rerender(<WeekDetail />)
    expect(refreshWeeks).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Week not found.')).toBeInTheDocument()
  })

  it('offers a retry when the week list failed to load', async () => {
    const refreshWeeks = withData('error')

    render(<WeekDetail />)
    expect(screen.getByText(/Couldn.t load the weeks/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(refreshWeeks).toHaveBeenCalledTimes(1)
  })
})
