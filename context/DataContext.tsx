'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { initialEvents } from '@/lib/mockData'
import type {
  CheckerInfo, DataContextValue, EventItem, LanguageConfig,
  Problem, ProblemFormData, TestCase, Week, WeekFormInput,
} from '@/lib/types'

const DataContext = createContext<DataContextValue | undefined>(undefined)

// requests go through the next.config.ts rewrites to the go backend (:8000)
const GO_API = ''

const DIFF_PRETTY: Record<string, string> = { EASY: 'Easy', MEDIUM: 'Medium', HARD: 'Hard' }

// editor language ids -> backend language ids (backend only judges these 3 for now)
const LANG_MAP: Record<string, string> = { CPP: 'CPP', JAVA: 'JAVA', PYTHON3: 'PYTHON' }
const LANG_DEFAULTS: Record<string, { t: number; m: number }> = {
  CPP: { t: 2, m: 256 }, JAVA: { t: 4, m: 512 }, PYTHON3: { t: 5, m: 256 },
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [weeks, setWeeks] = useState<Week[]>([])
  // events api isn't built yet (Sanket's), so events stay mock for now
  const [events, setEvents] = useState<EventItem[]>(initialEvents)

  // small fetch helper for the {success, data} / {success, error} envelope
  async function api(method: string, url: string, body?: unknown) {
    const res = await fetch(`${GO_API}${url}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || data.success === false) {
      alert(`${method} ${url} failed: ${data.error?.message || res.status}`)
      throw new Error(`${method} ${url} failed`)
    }
    return data
  }

  async function refreshWeeks() {
    try {
      const body = await api('GET', '/api/admin/weeks')

      // the list api gives {id,title,weekNumber,active,problemCount};
      // problems come from the public weeks api per week
      const withProblems: Week[] = await Promise.all((body.data || []).map(async (w: any) => {
        let problems: Problem[] = []
        try {
          const res = await fetch(`${GO_API}/weeks/${w.id}/problems`)
          const list = await res.json()
          problems = (list || []).map((p: any) => ({
            id: p.id,
            name: p.title,
            difficulty: DIFF_PRETTY[p.difficulty] || p.difficulty,
            basePoints: p.base_points,
            maxScore: p.base_points, // alias: the mock stats pages still read maxScore
            // full fields so the edit page can prefill
            problemStatement: p.statement || '',
            inputFormat: p.input_format || '',
            outputFormat: p.output_format || '',
            constraints: p.constraints || '',
            multipleSolution: p.checker_type === 'dynamic',
          }))
        } catch {
          // week just shows 0 problems
        }
        const startsAt = w.startTime ? new Date(w.startTime) : null
        const endsAt = w.endTime ? new Date(w.endTime) : null
        return {
          id: w.id,
          title: w.title,
          weekNumber: w.weekNumber,
          active: w.active,
          problems,
          // iso strings for countdowns
          startsAt: w.startTime,
          endsAt: w.endTime,
          // local date/time strings pre-filled for the details form
          startDate: startsAt ? startsAt.toLocaleDateString('en-CA') : '',
          startTime: startsAt ? startsAt.toTimeString().slice(0, 5) : '10:00',
          endDate: endsAt ? endsAt.toLocaleDateString('en-CA') : '',
          endTime: endsAt ? endsAt.toTimeString().slice(0, 5) : '10:00',
          displaySection: 'upcoming',
        }
      }))

      setWeeks(withProblems)
    } catch (e) {
      console.error('could not load weeks — is the go backend running on :8000?', e)
    }
  }

  useEffect(() => {
    // initial load from the backend (async, so state updates land after fetch)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshWeeks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Weeks ──────────────────────────────────────────────

  const addWeek = async (data: WeekFormInput) => {
    const nextNumber = weeks.reduce((m, w) => Math.max(m, w.weekNumber || 0), 0) + 1
    const start = data.startDate
      ? new Date(`${data.startDate}T${data.startTime || '10:00'}:00`)
      : new Date()
    const hours = data.contestType === 'fixed' ? Number(data.durationHours || 3) : 24 * 7
    const end = new Date(start.getTime() + hours * 3600 * 1000)

    await api('POST', '/api/admin/weeks', {
      title: data.title,
      weekNumber: nextNumber,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      // 'time decay' isn't in the api enum, treat it as partial
      scoringSystem: data.scoringSystem === 'full' ? 'FULL' : 'PARTIAL',
      contestType: (data.contestType || 'open').toUpperCase(),
    })
    refreshWeeks()
  }

  const updateWeek = async (id: string, data: WeekFormInput) => {
    // ui-only field, there's no api for it
    if ('displaySection' in data) {
      setWeeks(p => p.map(w => w.id === id ? { ...w, ...data } as Week : w))
      return
    }

    // active toggle has its own endpoints
    if ('active' in data) {
      await api('POST', `/api/admin/weeks/${id}/${data.active ? 'activate' : 'deactivate'}`)
      refreshWeeks()
      return
    }

    const body: Record<string, unknown> = {}
    if (data.title !== undefined) body.title = data.title
    if (data.startDate) {
      body.startTime = new Date(`${data.startDate}T${data.startTime || '10:00'}:00`).toISOString()
    }
    if (data.endDate) {
      body.endTime = new Date(`${data.endDate}T${data.endTime || '10:00'}:00`).toISOString()
    }
    await api('PATCH', `/api/admin/weeks/${id}`, body)
    refreshWeeks()
  }

  const deleteWeek = async (id: string) => {
    await api('DELETE', `/api/admin/weeks/${id}`)
    refreshWeeks()
  }

  // ── Problems in a week ─────────────────────────────────

  const addProblem = async (weekId: string, problem: ProblemFormData) => {
    const created = await api('POST', `/api/admin/weeks/${weekId}/problems`, {
      title: problem.name,
      difficulty: (problem.difficulty || 'Medium').toUpperCase(),
      description: problem.problemStatement || problem.description || problem.name,
      inputFormat: problem.inputFormat,
      outputFormat: problem.outputFormat,
      constraints: problem.constraints,
      basePoints: Number(problem.basePoints) || 100,
      multipleSolution: !!problem.multipleSolution,
    })
    const problemId = created.data.problemId

    for (const tc of problem.testCases) {
      await api('POST', `/api/admin/problems/${problemId}/testcases`, {
        input: tc.input,
        expectedOutput: tc.output,
        isSample: !!tc.isSample,
      })
    }

    for (const langId of problem.languages) {
      const backendLang = LANG_MAP[langId]
      if (!backendLang) continue // backend only judges CPP/JAVA/PYTHON for now
      const settings = problem.languageSettings[langId] || {}
      const defaults = LANG_DEFAULTS[langId]
      const stub = problem.codeStubs[langId]
      await api('POST', `/api/admin/problems/${problemId}/languages`, {
        language: backendLang,
        timeLimitMs: (settings.timeLimit ?? defaults.t) * 1000,
        memoryLimitMb: settings.memLimit ?? defaults.m,
        starterCode: stub ? [stub.head, stub.body, stub.tail].filter(Boolean).join('\n') : '',
      })
    }

    await syncChecker(problemId, problem)

    refreshWeeks()
  }

  // checker registry goes through the go admin api, which proxies to the judge
  const syncChecker = async (problemId: string, problem: ProblemFormData) => {
    try {
      if (problem.multipleSolution && problem.validatorCode?.trim()) {
        await api('POST', `/api/admin/problems/${problemId}/checker`, { code: problem.validatorCode })
      } else if (!problem.multipleSolution) {
        // multiple solutions turned off -> remove any registered checker (no-op if none)
        await api('DELETE', `/api/admin/problems/${problemId}/checker`)
      }
    } catch {
      // api() already alerted (e.g. the compiler error) — the problem save itself still counts
    }
  }

  const getChecker = async (problemId: string): Promise<CheckerInfo> => {
    const body = await api('GET', `/api/admin/problems/${problemId}/checker`)
    return body.data || {}
  }

  const deleteProblem = async (weekId: string, problemId: string | number) => {
    await api('DELETE', `/api/admin/problems/${problemId}`)
    refreshWeeks()
  }

  // edit flow: PATCH the details, upsert language configs, add only the NEW
  // testcases (existing ones are managed live via deleteTestCase/addTestCase),
  // and sync the checker registration at the end
  const updateProblem = async (problemId: string, problem: ProblemFormData) => {
    await api('PATCH', `/api/admin/problems/${problemId}`, {
      title: problem.name,
      difficulty: (problem.difficulty || 'Medium').toUpperCase(),
      description: problem.problemStatement || problem.description || problem.name,
      inputFormat: problem.inputFormat,
      outputFormat: problem.outputFormat,
      constraints: problem.constraints,
      basePoints: Number(problem.basePoints) || 100,
      multipleSolution: !!problem.multipleSolution,
    })

    for (const tc of problem.testCases.filter(t => !t.existing)) {
      await api('POST', `/api/admin/problems/${problemId}/testcases`, {
        input: tc.input,
        expectedOutput: tc.output,
        isSample: !!tc.isSample,
      })
    }

    for (const langId of problem.languages) {
      const backendLang = LANG_MAP[langId]
      if (!backendLang) continue
      const settings = problem.languageSettings[langId] || {}
      const defaults = LANG_DEFAULTS[langId]
      const stub = problem.codeStubs[langId]
      await api('POST', `/api/admin/problems/${problemId}/languages`, {
        language: backendLang,
        timeLimitMs: (settings.timeLimit ?? defaults.t) * 1000,
        memoryLimitMb: settings.memLimit ?? defaults.m,
        starterCode: stub ? [stub.head, stub.body, stub.tail].filter(Boolean).join('\n') : '',
      })
    }

    await syncChecker(problemId, problem)

    refreshWeeks()
  }

  const getTestCases = async (problemId: string): Promise<TestCase[]> => {
    const body = await api('GET', `/api/admin/problems/${problemId}/testcases`)
    return body.data || []
  }

  const updateTestCase = async (problemId: string, testcaseId: string | number, tc: Partial<TestCase>) => {
    await api('PATCH', `/api/admin/problems/${problemId}/testcases/${testcaseId}`, {
      input: tc.input,
      expectedOutput: tc.output,
      isSample: !!tc.isSample,
    })
  }

  const deleteTestCase = async (problemId: string, testcaseId: string | number) => {
    await api('DELETE', `/api/admin/problems/${problemId}/testcases/${testcaseId}`)
  }

  const getLanguageConfigs = async (problemId: string): Promise<LanguageConfig[]> => {
    const body = await api('GET', `/api/admin/problems/${problemId}/languages`)
    return body.data || []
  }

  // ── Events (still mock) ────────────────────────────────

  const addEvent = (data: Partial<EventItem>) =>
    setEvents(p => [...p, { ...data, id: Date.now(), problems: [] } as EventItem])
  const updateEvent = (id: number, data: Partial<EventItem>) =>
    setEvents(p => p.map(e => e.id === id ? { ...e, ...data } : e))
  const deleteEvent = (id: number) => setEvents(p => p.filter(e => e.id !== id))

  const addEventProblem = (eventId: number, problem: ProblemFormData) =>
    setEvents(p => p.map(e => e.id === eventId
      ? { ...e, problems: [...e.problems, { ...problem, id: Date.now() } as unknown as Problem] }
      : e))
  const deleteEventProblem = (eventId: number, problemId: string | number) =>
    setEvents(p => p.map(e => e.id === eventId
      ? { ...e, problems: e.problems.filter(pr => pr.id !== problemId) }
      : e))

  return (
    <DataContext.Provider value={{
      weeks, events, refreshWeeks,
      addWeek, updateWeek, deleteWeek,
      addProblem, deleteProblem, updateProblem,
      getTestCases, updateTestCase, deleteTestCase, getLanguageConfigs, getChecker,
      addEvent, updateEvent, deleteEvent,
      addEventProblem, deleteEventProblem,
    }}>
      {children}
    </DataContext.Provider>
  )
}

export const useData = (): DataContextValue => {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within a DataProvider')
  return ctx
}
