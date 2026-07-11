import type { EventItem } from './types'

export const initialEvents: EventItem[] = [
  {
    id: 1,
    title: 'Spring Contest 2025',
    startDate: '2025-03-15',
    startTime: '14:00',
    durationHours: 3,
    status: 'live',
    problems: [],
  },
  {
    id: 2,
    title: 'DSA Championship',
    startDate: '2025-04-20',
    startTime: '10:00',
    durationHours: 5,
    status: 'upcoming',
    problems: [],
  },
]

export const SCORING_SYSTEMS = {
  full: { label: 'Full Score', desc: 'Pass all test cases for full points, else 0' },
  partial: { label: 'Partial Scoring', desc: 'Score proportional to test cases passed' },
  time: { label: 'Time Decay', desc: 'Score decreases the longer a participant takes' },
}
