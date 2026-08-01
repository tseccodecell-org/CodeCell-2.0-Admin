'use client'

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { initialEvents } from '@/lib/mockData'
import { stubToStarterCode } from '@/lib/starterCode'
import type {
  CheckerInfo, DataContextValue, EventItem, LanguageConfig,
  Problem, ProblemFormData, TestCase, Week, WeekFormInput,
} from '@/lib/types'

const DataContext = createContext<DataContextValue | undefined>(undefined)

// requests go through the next.config.ts rewrites to the go backend (:8000)
const GO_API = ''

const LOGIN_PATH = '/login'

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
  const pathname = usePathname()
  const loadedRef = useRef(false)

  // small fetch helper for the {success, data} / {success, error} envelope.
  // the admin token is an HttpOnly cookie, so every call must carry credentials
  async function api(method: string, url: string, body?: unknown) {
    const res = await fetch(`${GO_API}${url}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',
    })

    // never bounce while already on the login screen, that turns a rejected
    // request into a reload loop
    if (res.status === 401 || res.status === 403) {
      if (window.location.pathname !== LOGIN_PATH) {
        window.location.replace(LOGIN_PATH)
      }
      throw new Error('admin session expired')
    }

    const data = await res.json().catch(() => ({}))
    if (!res.ok || data.success === false) {
      // the auth middlewares answer with a bare {"error": "..."} string,
      // everything else uses the {success, error: {message}} envelope
      const message =
        data.error?.message ||
        (typeof data.error === 'string' ? data.error : null) ||
        res.status
      alert(`${method} ${url} failed: ${message}`)
      throw new Error(`${method} ${url} failed`)
    }
    return data
  }

  async function refreshWeeks() {
    try {
      const body = await api('GET', '/api/admin/weeks')

      // the list api gives {id,title,weekNumber,active,problemCount};
      // the problems for each week come from the admin route below
      const withProblems: Week[] = await Promise.all((body.data || []).map(async (w: any) => {
        let problems: Problem[] = []
        try {
          // the public /weeks/:id/problems needs a user jwt, which an admin does
          // not have. use the admin route so unpublished problems show up too
          const res = await fetch(`${GO_API}/api/admin/weeks/${w.id}/problems`, {
            credentials: 'include',
          })
          const payload = await res.json().catch(() => ({}))
          if (!res.ok || payload.success === false) {
            console.error(
              `could not load problems for week ${w.id}:`,
              res.status,
              payload.error?.message || payload.error || ''
            )
          }
          const list = payload.data
          problems = (Array.isArray(list) ? list : []).map((p: any) => ({
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
            editorial: p.editorial || '',
          }))
        } catch (e) {
          console.error(`problems request failed for week ${w.id}`, e)
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

  // this provider sits in the root layout, so it is mounted on the login screen
  // too. loading admin data there would 401 and fight the redirect, so hold off
  // until we are on a real page, and load once per signed in session.
  useEffect(() => {
    if (pathname === LOGIN_PATH) {
      loadedRef.current = false
      return
    }
    if (loadedRef.current) return
    loadedRef.current = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshWeeks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  // ── Weeks ──────────────────────────────────────────────

  const addWeek = async (data: WeekFormInput) => {
    const nextNumber = weeks.reduce((m, w) => Math.max(m, w.weekNumber || 0), 0) + 1
    const start = data.startDate
      ? new Date(`${data.startDate}T${data.startTime || '10:00'}:00`)
      : new Date()
    const end = data.endDate
      ? new Date(`${data.endDate}T${data.endTime || '10:00'}:00`)
      : new Date(start.getTime() + 7 * 24 * 3600 * 1000)

    await api('POST', '/api/admin/weeks', {
      title: data.title,
      weekNumber: nextNumber,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
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
      editorial: problem.editorial || '',
    })
    const problemId = created.data.problemId

    for (const tc of problem.testCases) {
      await api('POST', `/api/admin/problems/${problemId}/testcases`, {
        input: tc.input,
        expectedOutput: tc.output,
        explanation: tc.explanation || '',
        isSample: !!tc.isSample,
      })
    }

    for (const langId of problem.languages) {
      const backendLang = LANG_MAP[langId]
      if (!backendLang) continue // backend only judges CPP/JAVA/PYTHON for now
      const settings = problem.languageSettings[langId] || {}
      const defaults = LANG_DEFAULTS[langId]
      await api('POST', `/api/admin/problems/${problemId}/languages`, {
        language: backendLang,
        timeLimitMs: (settings.timeLimit ?? defaults.t) * 1000,
        memoryLimitMb: settings.memLimit ?? defaults.m,
        starterCode: stubToStarterCode(langId, problem.codeStubs[langId]),
      })
    }

    await syncChecker(problemId, problem)

    refreshWeeks()
    return problemId
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
      editorial: problem.editorial || '',
    })

    for (const tc of problem.testCases.filter(t => !t.existing)) {
      await api('POST', `/api/admin/problems/${problemId}/testcases`, {
        input: tc.input,
        expectedOutput: tc.output,
        explanation: tc.explanation || '',
        isSample: !!tc.isSample,
      })
    }

    for (const langId of problem.languages) {
      const backendLang = LANG_MAP[langId]
      if (!backendLang) continue
      const settings = problem.languageSettings[langId] || {}
      const defaults = LANG_DEFAULTS[langId]
      await api('POST', `/api/admin/problems/${problemId}/languages`, {
        language: backendLang,
        timeLimitMs: (settings.timeLimit ?? defaults.t) * 1000,
        memoryLimitMb: settings.memLimit ?? defaults.m,
        starterCode: stubToStarterCode(langId, problem.codeStubs[langId]),
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
      explanation: tc.explanation || '',
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
