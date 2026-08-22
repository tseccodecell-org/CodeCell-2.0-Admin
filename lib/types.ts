// shared shapes used across the admin panel. the go backend fields are loosely
// typed on purpose — this mirrors what the api actually sends, not a strict schema

export interface TestCase {
  id: string | number
  input: string
  output: string
  explanation?: string // shown beside a sample so participants see the reasoning
  isSample: boolean
  existing?: boolean // true once it's saved in the db (edit flow)
}

export interface LanguageSetting {
  timeLimit: number
  memLimit: number
}

export interface CodeStub {
  head: string
  body: string
  tail: string
}

// a problem as it lives inside week.problems / event.problems (list + display)
export interface Problem {
  id: string | number
  name: string
  difficulty: string
  basePoints: number
  maxScore: number // alias of basePoints, kept for the mock stats pages
  problemStatement: string
  inputFormat: string
  outputFormat: string
  constraints: string
  multipleSolution: boolean
  editorial?: string
  description?: string
  timeLimit?: number
  testCases?: TestCase[]
  languages?: string[]
  validatorCode?: string
}

// the ProblemEditor form's local state shape — same idea as Problem but
// always carries the editable collections (used for both create + edit)
export interface ProblemFormData {
  name: string
  difficulty: string
  description: string
  problemStatement: string
  inputFormat: string
  outputFormat: string
  constraints: string
  testCases: TestCase[]
  languages: string[]
  languageSettings: Record<string, LanguageSetting>
  codeStubs: Record<string, CodeStub>
  basePoints: number
  multipleSolution: boolean
  editorial: string
  validatorCode: string
}

export interface Week {
  id: string
  title: string
  description: string
  weekNumber: number
  active: boolean
  problems: Problem[]
  startsAt: string | null
  endsAt: string | null
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  displaySection: string
}

export interface EventItem {
  id: number
  title: string
  startDate: string
  startTime: string
  durationHours: number
  status: 'upcoming' | 'live' | 'ended'
  problems: Problem[]
}

export interface LanguageConfig {
  id: string
  problem_id: string
  language: string
  enabled: boolean
  timeLimitMs: number
  memoryLimitMb: number
  starterCode: string
}

export interface CheckerInfo {
  registered: boolean
  source?: string
}

// what addWeek/updateWeek/addProblem/updateProblem take in — a loose bag of
// form fields, kept intentionally untyped-ish since forms send partial data
export type WeekFormInput = Partial<Week> & {
  title?: string
  startDate?: string
  startTime?: string
  active?: boolean
  displaySection?: string
  endDate?: string
  endTime?: string
}

export interface DataContextValue {
  weeks: Week[]
  events: EventItem[]
  refreshWeeks: () => Promise<void>

  addWeek: (data: WeekFormInput) => Promise<void>
  updateWeek: (id: string, data: WeekFormInput) => Promise<void>
  deleteWeek: (id: string) => Promise<void>

  addProblem: (weekId: string, problem: ProblemFormData) => Promise<string>
  deleteProblem: (weekId: string, problemId: string | number) => Promise<void>
  updateProblem: (problemId: string, problem: ProblemFormData) => Promise<void>
  reorderProblems: (weekId: string, problemIds: (string | number)[]) => Promise<void>
  moveProblemToWeek: (problemId: string | number, targetWeekId: string) => Promise<void>

  getTestCases: (problemId: string) => Promise<TestCase[]>
  updateTestCase: (problemId: string, testcaseId: string | number, tc: Partial<TestCase>) => Promise<void>
  deleteTestCase: (problemId: string, testcaseId: string | number) => Promise<void>
  getLanguageConfigs: (problemId: string) => Promise<LanguageConfig[]>
  getChecker: (problemId: string) => Promise<CheckerInfo>

  addEvent: (data: Partial<EventItem>) => void
  updateEvent: (id: number, data: Partial<EventItem>) => void
  deleteEvent: (id: number) => void

  addEventProblem: (eventId: number, problem: ProblemFormData) => void
  deleteEventProblem: (eventId: number, problemId: string | number) => void
}
