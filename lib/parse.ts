import { call } from './api'

export interface ParsedSample {
  input: string
  output: string
  explanation: string
}

export interface ParsedProblem {
  title: string
  description: string
  inputFormat: string
  outputFormat: string
  constraints: string
  difficulty: string
  timeLimitMs: number
  memoryLimitMb: number
  samples: ParsedSample[]
}

export interface ParseRequest {
  rawText: string
  weekId?: string
  useExistingStyle: boolean
  styleContext?: string
}

export function parseStatus() {
  return call<{ available: boolean }>('GET', '/api/admin/problems/parse/status')
}

export function parseProblem(req: ParseRequest) {
  return call<ParsedProblem>('POST', '/api/admin/problems/parse', req)
}
