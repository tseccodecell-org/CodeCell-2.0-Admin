'use client'

import { useState, useMemo, useEffect, type Dispatch, type SetStateAction } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useData } from '@/context/DataContext'
import type { Week, Problem } from '@/lib/types'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend,
} from 'recharts'

interface Participant {
  id: number
  name: string
  country: string
  scores: Record<string, number>
  attempts: Record<string, number>
  total: number
  lastSubmit: number | null
  rank?: number
}

interface Submission {
  id: number
  participantId: number
  participantName: string
  problemId: string | number
  problemName: string
  problemLabel: string
  verdict: string
  score: number
  lang: string
  timeMs: number
  timeStr: string
}

interface ProblemStat extends Problem {
  label: string
  attempted: number
  solved: number
  avgScore: number
  firstSolveBy: string
  firstSolveTime: string
  totalParticipants: number
}

interface Stats {
  participants: Participant[]
  problemStats: ProblemStat[]
  submissions: Submission[]
  totalParticipants: number
  problems: Problem[]
}

interface TestResult {
  id: number
  input: string
  expected: string
  actual: string
  verdict: string
  timeMs: string
  memory: string
}

interface EnrichedProblemStat extends ProblemStat {
  pSubs: Submission[]
  vCounts: Record<string, number>
  frictionScore: string
  abandonRate: number
  medianSolveMin: number | null
  tleRate: number
  attemptDist: number[]
  solveRate: number
}

/* ═══════════════════════════════════════════════════════════
   MOCK DATA GENERATION
═══════════════════════════════════════════════════════════ */
const MOCK_NAMES = [
  'alice_dev', 'bob_coder', 'charlie_x', 'diana_pro', 'evan_null',
  'fiona_bit', 'george_py', 'hannah_db', 'ivan_cpp', 'julia_go',
  'kevin_rs', 'lisa_ts', 'mike_io', 'nina_ops', 'oscar_th',
]
const COUNTRIES = ['IN', 'US', 'UK', 'DE', 'BR', 'CN', 'JP', 'KR', 'CA', 'AU']
const LANGS     = ['C++', 'Java', 'Python 3', 'JavaScript', 'Go', 'C#']
const VERDICTS  = ['AC', 'WA', 'TLE', 'CE', 'RE']

function seededRng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b)
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b)
    s = s ^ (s >>> 16)
    return (s >>> 0) / 0xffffffff
  }
}

function seedFromId(id: string | number) {
  if (typeof id === 'number') return id
  let h = 0
  for (let i = 0; i < id.length; i++) h = (Math.imul(h, 31) + id.charCodeAt(i)) | 0
  return h
}

/* Code templates per language */
const CODE_TPLS: Record<string, (n: string) => string> = {
  'C++': n => `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    int n;
    cin >> n;
    vector<long long> a(n);
    for (int i = 0; i < n; i++) cin >> a[i];

    // ${n}
    long long ans = 0;
    map<long long, int> freq;
    for (int i = 0; i < n; i++) {
        if (freq.count(a[i])) ans++;
        freq[a[i]]++;
    }
    cout << ans << "\\n";
    return 0;
}`,
  'Java': n => `import java.util.*;
import java.io.*;

public class Solution {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        int n = Integer.parseInt(br.readLine().trim());
        StringTokenizer st = new StringTokenizer(br.readLine());

        long[] a = new long[n];
        for (int i = 0; i < n; i++)
            a[i] = Long.parseLong(st.nextToken());

        // ${n}
        long ans = 0;
        HashMap<Long, Integer> freq = new HashMap<>();
        for (long x : a) freq.put(x, freq.getOrDefault(x, 0) + 1);
        for (long x : a) if (freq.get(x) > 1) ans++;

        System.out.println(ans / 2);
    }
}`,
  'Python 3': n => `import sys
from collections import Counter

def solve():
    data = sys.stdin.read().split()
    idx = 0
    n = int(data[idx]); idx += 1
    a = list(map(int, data[idx:idx+n]))

    # ${n}
    freq = Counter(a)
    ans = sum(v * (v - 1) // 2 for v in freq.values())
    print(ans)

solve()`,
  'JavaScript': n => `'use strict';
process.stdin.resume();
process.stdin.setEncoding('utf-8');
let inp = '';
process.stdin.on('data', d => inp += d);
process.stdin.on('end', () => {
    const lines = inp.trim().split('\\n');
    const n = parseInt(lines[0]);
    const a = lines[1].split(' ').map(Number);

    // ${n}
    const freq = new Map();
    for (const x of a) freq.set(x, (freq.get(x) || 0) + 1);
    let ans = 0;
    for (const [, v] of freq) ans += v * (v - 1) / 2;
    console.log(ans);
});`,
  'Go': n => `package main

import (
    "bufio"
    "fmt"
    "os"
)

func main() {
    reader := bufio.NewReader(os.Stdin)
    var n int
    fmt.Fscan(reader, &n)
    a := make([]int64, n)
    for i := 0; i < n; i++ { fmt.Fscan(reader, &a[i]) }

    // ${n}
    freq := make(map[int64]int64)
    for _, x := range a { freq[x]++ }
    var ans int64
    for _, v := range freq { ans += v * (v - 1) / 2 }
    fmt.Println(ans)
}`,
  'C#': n => `using System;
using System.Collections.Generic;
using System.Linq;

class Solution {
    static void Main() {
        int n = int.Parse(Console.ReadLine().Trim());
        long[] a = Console.ReadLine().Trim()
            .Split(' ').Select(long.Parse).ToArray();

        // ${n}
        var freq = new Dictionary<long, long>();
        foreach (long x in a)
            freq[x] = freq.GetValueOrDefault(x, 0) + 1;
        long ans = freq.Values.Sum(v => v * (v - 1) / 2);
        Console.WriteLine(ans);
    }
}`,
}

function getCode(sub: Submission) {
  const tpl = CODE_TPLS[sub.lang] || CODE_TPLS['C++']
  return tpl(sub.problemName)
}

function getTestResults(sub: Submission): TestResult[] {
  const rng = seededRng(sub.id * 1337)
  const n = 8
  const results: TestResult[] = []
  for (let i = 0; i < n; i++) {
    let v
    if (sub.verdict === 'AC') {
      v = 'AC'
    } else if (sub.verdict === 'WA') {
      v = i < Math.ceil(n * 0.55) ? 'AC' : 'WA'
    } else if (sub.verdict === 'TLE') {
      v = i < Math.ceil(n * 0.37) ? 'AC' : 'TLE'
    } else if (sub.verdict === 'CE') {
      v = 'CE'
    } else {
      v = i < Math.ceil(n * 0.45) ? 'AC' : 'RE'
    }
    const expected = String(Math.floor(rng() * 100))
    const actual   = v === 'AC' ? expected : v === 'WA' ? String(Math.floor(rng() * 100)) : '—'
    results.push({
      id: i + 1,
      input: `${Math.floor(rng() * 6) + 2}\n${Array.from({ length: 4 }, () => Math.floor(rng() * 50)).join(' ')}`,
      expected,
      actual,
      verdict: v,
      timeMs: v === 'TLE' ? '>2000ms' : `${Math.floor(30 + rng() * 420)}ms`,
      memory: `${Math.floor(4096 + rng() * 8192)} KB`,
    })
  }
  return results
}

function generateStats(week: Week): Stats {
  const rng = seededRng(seedFromId(week.id) * 997 + week.problems.length * 31)
  const problems = week.problems
  if (!problems.length) return { participants: [], problemStats: [], submissions: [], totalParticipants: 0, problems: [] }

  const count = Math.floor(rng() * 9) + 6
  const participants: Participant[] = MOCK_NAMES.slice(0, count).map((name, i) => ({
    id: i + 1, name,
    country: COUNTRIES[Math.floor(rng() * COUNTRIES.length)],
    scores: {}, attempts: {}, total: 0, lastSubmit: null,
  }))

  const allSubs: Submission[] = []
  let subId = 1
  const baseMs = new Date('2025-01-06T10:00:00').getTime()

  participants.forEach((p, pi) => {
    problems.forEach((prob, prIdx) => {
      if (rng() > Math.max(0.25, 0.95 - prIdx * 0.18)) return
      const lang     = LANGS[Math.floor(rng() * LANGS.length)]
      const numTries = Math.floor(rng() * 4) + 1
      let bestScore  = 0, solved = false
      p.attempts[prob.id] = 0

      for (let a = 0; a < numTries && !solved; a++) {
        const offsetMs = (pi * 420 + prIdx * 780 + a * 180 + Math.floor(rng() * 360)) * 1000
        const submitMs = baseMs + offsetMs
        p.attempts[prob.id]++

        let verdict, score
        if (rng() < 0.55 - prIdx * 0.08 + a * 0.05) {
          verdict = 'AC'; score = prob.maxScore || 100; solved = true
        } else {
          verdict = VERDICTS[Math.floor(rng() * (VERDICTS.length - 1)) + 1]
          score = verdict === 'WA' ? Math.floor(rng() * (prob.maxScore || 100) * 0.5) : 0
        }
        bestScore = Math.max(bestScore, score)

        const t = new Date(submitMs)
        allSubs.push({
          id: subId++,
          participantId: p.id, participantName: p.name,
          problemId: prob.id, problemName: prob.name,
          problemLabel: String.fromCharCode(65 + prIdx),
          verdict, score, lang,
          timeMs: submitMs,
          timeStr: t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        })
        if (!p.lastSubmit || submitMs > p.lastSubmit) p.lastSubmit = submitMs
      }
      p.scores[prob.id] = bestScore
      p.total += bestScore
    })
  })

  participants.sort((a, b) => b.total - a.total)
  participants.forEach((p, i) => { p.rank = i + 1 })

  const problemStats: ProblemStat[] = problems.map((prob, idx) => {
    const pSubs     = allSubs.filter(s => s.problemId === prob.id)
    const attempted = new Set(pSubs.map(s => s.participantId)).size
    const solved    = pSubs.filter(s => s.verdict === 'AC').length
    const avgScore  = attempted > 0 ? Math.round(participants.reduce((sum, p) => sum + (p.scores[prob.id] || 0), 0) / attempted) : 0
    const firstAC   = pSubs.filter(s => s.verdict === 'AC').sort((a, b) => a.timeMs - b.timeMs)[0]
    return { ...prob, label: String.fromCharCode(65 + idx), attempted, solved, avgScore, firstSolveBy: firstAC?.participantName || '—', firstSolveTime: firstAC?.timeStr || '—', totalParticipants: participants.length }
  })

  return { participants, problemStats, submissions: allSubs.sort((a, b) => b.timeMs - a.timeMs), totalParticipants: participants.length, problems }
}

/* ═══════════════════════════════════════════════════════════
   CONSTANTS & SHARED UI
═══════════════════════════════════════════════════════════ */
const TABS = ['Overview', 'Leaderboard', 'Problems', 'Submissions']

const VERDICT_STYLE: Record<string, string> = {
  AC:  'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60',
  WA:  'bg-rose-50 text-rose-700 ring-1 ring-rose-200/60',
  TLE: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/60',
  CE:  'bg-slate-100 text-slate-600',
  RE:  'bg-purple-50 text-purple-700 ring-1 ring-purple-200/60',
}
const VERDICT_DOT: Record<string, string> = { AC: 'bg-emerald-500', WA: 'bg-rose-500', TLE: 'bg-amber-500', CE: 'bg-slate-400', RE: 'bg-purple-500' }

const DIFF_COLORS: Record<string, string> = {
  Easy:   'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60',
  Medium: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/60',
  Hard:   'bg-rose-50 text-rose-700 ring-1 ring-rose-200/60',
}
const DIFF_BAR: Record<string, string> = { Easy: '#10b981', Medium: '#f59e0b', Hard: '#f43f5e' }

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const s = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm'
  const colors = ['bg-slate-200 text-slate-700', 'bg-teal-100 text-teal-700', 'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700', 'bg-sky-100 text-sky-700', 'bg-violet-100 text-violet-700']
  return (
    <div className={`${s} ${colors[name.charCodeAt(0) % colors.length]} rounded-full flex items-center justify-center font-bold shrink-0`}>
      {name[0].toUpperCase()}
    </div>
  )
}

function SearchBar({ value, onChange, placeholder = 'Search participant...' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative w-full sm:w-auto">
      <svg className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-8 pr-4 py-2 text-sm border border-slate-200 rounded-lg w-full sm:w-56 focus:outline-none focus:border-slate-400 bg-white"
      />
      {value && (
        <button onClick={() => onChange('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   SUBMISSION DETAIL MODAL
═══════════════════════════════════════════════════════════ */
function SubmissionModal({ submission, onClose }: { submission: Submission | null; onClose: () => void }) {
  if (!submission) return null
  const code    = getCode(submission)
  const results = getTestResults(submission)
  const lines   = code.split('\n')

  const passCount = results.filter(r => r.verdict === 'AC').length

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-4 z-60 bg-white rounded-lg shadow-lg flex flex-col overflow-hidden border border-slate-200">
        {/* Modal header */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-slate-100 shrink-0 bg-slate-50">
          <div className="flex items-center gap-4 min-w-0">
            <Avatar name={submission.participantName} size="sm" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-slate-900">{submission.participantName}</span>
                <span className="text-slate-300">·</span>
                <span className="text-sm font-semibold text-slate-600">
                  {submission.problemLabel}. {submission.problemName}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${VERDICT_STYLE[submission.verdict]}`}>{submission.verdict}</span>
                <span className="text-xs text-slate-400">{submission.lang}</span>
                <span className="text-xs text-slate-400 tabular-nums">{submission.timeStr}</span>
                <span className="text-xs font-semibold text-slate-600 tabular-nums">{submission.score} pts</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal body: code (left) + test cases (right) */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
          {/* Code view */}
          <div className="flex-1 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-200 min-w-0 min-h-0">
            <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-900 shrink-0">
              <span className="text-xs font-semibold text-slate-400">{submission.lang}</span>
              <span className="text-xs text-slate-500">{lines.length} lines</span>
            </div>
            <div className="flex-1 overflow-auto bg-slate-900">
              <table className="w-full text-left">
                <tbody>
                  {lines.map((line, i) => (
                    <tr key={i} className="hover:bg-white/5">
                      <td className="pl-4 pr-3 py-0.5 text-right text-xs text-slate-600 select-none w-10 font-mono">{i + 1}</td>
                      <td className="pr-4 py-0.5">
                        <pre className="text-sm font-mono text-slate-300 whitespace-pre">{line || ' '}</pre>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Test case results */}
          <div className="w-full lg:w-96 flex-1 lg:flex-none lg:shrink-0 flex flex-col overflow-hidden min-h-0">
            <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <span className="text-xs font-semibold text-slate-700">Test Cases</span>
              <span className={`text-xs font-bold tabular-nums ${passCount === results.length ? 'text-emerald-600' : 'text-rose-600'}`}>
                {passCount} / {results.length} passed
              </span>
            </div>
            {submission.verdict === 'CE' ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 p-6 text-center">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-slate-700">Compilation Error</p>
                <pre className="text-xs text-slate-400 font-mono bg-slate-50 border border-slate-200 rounded-lg p-3 text-left w-full whitespace-pre-wrap">
                  {`error: expected ';' before '}' token\n  }\n  ^\ncompilation terminated.`}
                </pre>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                {results.map(tc => (
                  <div key={tc.id} className={`px-4 py-3 ${tc.verdict !== 'AC' ? 'bg-rose-50/40' : ''}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-600">Case #{tc.id}</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${VERDICT_DOT[tc.verdict] || 'bg-slate-400'}`} />
                        <span className={`text-xs font-bold ${VERDICT_STYLE[tc.verdict]} px-1.5 py-0.5 rounded`}>{tc.verdict}</span>
                        <span className="text-[10px] text-slate-400 tabular-nums">{tc.timeMs}</span>
                      </div>
                    </div>
                    {tc.verdict !== 'TLE' && tc.verdict !== 'RE' && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Expected</p>
                          <pre className="text-xs font-mono bg-slate-100 rounded p-1.5 text-slate-700">{tc.expected}</pre>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Got</p>
                          <pre className={`text-xs font-mono rounded p-1.5 ${tc.verdict !== 'AC' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'}`}>{tc.actual}</pre>
                        </div>
                      </div>
                    )}
                    {(tc.verdict === 'TLE' || tc.verdict === 'RE') && (
                      <p className="text-xs text-slate-400 italic">
                        {tc.verdict === 'TLE' ? 'Time limit exceeded — program did not terminate in time' : 'Runtime error — program crashed unexpectedly'}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

/* ═══════════════════════════════════════════════════════════
   PARTICIPANT SLIDE-OVER PANEL
═══════════════════════════════════════════════════════════ */
function ParticipantPanel({ participant, problems, submissions, onClose, onSubClick, weeks, currentWeekId }: {
  participant: Participant | null
  problems: Problem[]
  submissions: Submission[]
  onClose: () => void
  onSubClick: (sub: Submission) => void
  weeks: Week[]
  currentWeekId: string
}) {
  const [selectedWeekId, setSelectedWeekId] = useState(currentWeekId)
  const [verdictFilter,  setVerdictFilter]  = useState('all')
  const [problemFilter,  setProblemFilter]  = useState('all')

  // Reset when a different participant is opened
  useEffect(() => {
    setSelectedWeekId(currentWeekId)
    setVerdictFilter('all')
    setProblemFilter('all')
  }, [participant?.id, currentWeekId])

  const weekData = useMemo(() => {
    if (!participant) return null
    if (selectedWeekId === currentWeekId) return { participant, problems, submissions }
    const w = weeks.find(w => w.id === selectedWeekId)
    if (!w) return null
    const s = generateStats(w)
    const p = s.participants.find(p => p.name === participant.name)
    return p ? { participant: p, problems: s.problems, submissions: s.submissions } : null
  }, [selectedWeekId, participant?.name, participant, problems, submissions])

  // Guard after all hooks
  if (!participant) return null

  const activeP    = weekData?.participant ?? participant
  const activeProb = weekData?.problems    ?? problems
  const mySubs     = (weekData?.submissions ?? submissions).filter(s => s.participantId === activeP.id)

  const counts: Record<string, number> = { all: mySubs.length }
  mySubs.forEach(s => { counts[s.verdict] = (counts[s.verdict] || 0) + 1 })

  const visibleSubs = mySubs.filter(s =>
    (verdictFilter === 'all' || s.verdict === verdictFilter) &&
    (problemFilter === 'all' || s.problemLabel === problemFilter)
  )

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <Avatar name={participant.name} />
            <div>
              <p className="font-bold text-slate-900">{participant.name}</p>
              <p className="text-xs text-slate-500">{participant.country} · Rank #{participant.rank}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Week selector */}
        <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/60 shrink-0">
          <div className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <select
              value={selectedWeekId}
              onChange={e => { setSelectedWeekId(e.target.value); setVerdictFilter('all') }}
              className="flex-1 text-sm font-semibold text-slate-700 bg-transparent border-none outline-none cursor-pointer"
            >
              {weeks.map(w => (
                <option key={w.id} value={w.id}>{w.title}{w.id === currentWeekId ? ' (this week)' : ''}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Score summary — or empty state if participant didn't take part */}
        {weekData === null ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-400">
            <svg className="w-10 h-10 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-semibold text-slate-600">{participant.name} didn&apos;t participate</p>
            <p className="text-xs">{weeks.find(w => w.id === selectedWeekId)?.title}</p>
          </div>
        ) : (
          <>
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-900 tabular-nums">{activeP.total}</p>
                  <p className="text-[11px] text-slate-500">Total Score</p>
                </div>
                <div className="flex-1 grid grid-cols-3 gap-2">
                  {activeProb.map((prob, i) => (
                    <div key={prob.id} className="bg-white rounded-lg border border-slate-200 p-2 text-center">
                      <p className="text-xs font-bold text-slate-400">{String.fromCharCode(65 + i)}</p>
                      <p className="text-sm font-bold text-slate-800 tabular-nums">{activeP.scores[prob.id] ?? '—'}</p>
                      <p className="text-[10px] text-slate-400">/ {prob.maxScore}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
              {/* Filters */}
              <div className="px-6 pt-4 pb-3 flex flex-col gap-2.5 shrink-0 border-b border-slate-100">
                {/* Problem filter */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider w-14 shrink-0">Problem</span>
                  <button onClick={() => setProblemFilter('all')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${problemFilter === 'all' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    All
                  </button>
                  {activeProb.map((prob, i) => {
                    const lbl = String.fromCharCode(65 + i)
                    return (
                      <button key={prob.id} onClick={() => setProblemFilter(lbl)}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${problemFilter === lbl ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                        {lbl} · {prob.name.length > 14 ? prob.name.slice(0, 14) + '…' : prob.name}
                      </button>
                    )
                  })}
                </div>
                {/* Verdict filter */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider w-14 shrink-0">Verdict</span>
                  {['all', 'AC', 'WA', 'TLE', 'CE', 'RE'].map(v => {
                    const n = counts[v] || 0
                    if (v !== 'all' && n === 0) return null
                    return (
                      <button key={v} onClick={() => setVerdictFilter(v)}
                        className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${verdictFilter === v ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                        {v === 'all' ? 'All' : v}
                        <span className={`text-[10px] tabular-nums ${verdictFilter === v ? 'opacity-70' : 'text-slate-400'}`}>{n}</span>
                      </button>
                    )
                  })}
                  <span className="ml-auto text-xs text-slate-400">click → view code</span>
                </div>
              </div>

              {/* Submission list */}
              {visibleSubs.length === 0 ? (
                <p className="px-6 py-6 text-sm text-slate-400">No {verdictFilter} submissions.</p>
              ) : (
                <div className="divide-y divide-slate-100 overflow-y-auto">
                  {visibleSubs.map(sub => (
                    <button key={sub.id} onClick={() => onSubClick(sub)}
                      className="w-full px-6 py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors text-left">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0">{sub.problemLabel}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-700 truncate">{sub.problemName}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{sub.lang} · {sub.timeStr}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${VERDICT_STYLE[sub.verdict] || 'bg-slate-100 text-slate-600'}`}>{sub.verdict}</span>
                        <span className="text-sm font-bold text-slate-700 tabular-nums w-10 text-right">{sub.score}</span>
                        <svg className="w-3.5 h-3.5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}

/* ═══════════════════════════════════════════════════════════
   PAGINATION
═══════════════════════════════════════════════════════════ */
const PAGE_SIZE = 20

function Pagination({ total, page, setPage }: { total: number; page: number; setPage: Dispatch<SetStateAction<number>> }) {
  const pages = Math.ceil(total / PAGE_SIZE)
  if (pages <= 1) return null
  const start = (page - 1) * PAGE_SIZE + 1
  const end   = Math.min(page * PAGE_SIZE, total)
  return (
    <div className="px-4 sm:px-6 py-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60">
      <span className="text-xs text-slate-500 tabular-nums">Showing {start}–{end} of {total}</span>
      <div className="flex flex-wrap items-center gap-1">
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
          className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          ← Prev
        </button>
        {Array.from({ length: Math.min(5, pages) }, (_, i) => {
          let p
          if (pages <= 5) p = i + 1
          else if (page <= 3) p = i + 1
          else if (page >= pages - 2) p = pages - 4 + i
          else p = page - 2 + i
          return (
            <button key={p} onClick={() => setPage(p)}
              className={`w-8 h-8 text-xs font-semibold rounded-lg transition-colors ${p === page ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100 border border-slate-200'}`}>
              {p}
            </button>
          )
        })}
        <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
          className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          Next →
        </button>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
export default function StatsDetail() {
  const { weekId }  = useParams<{ weekId: string }>()
  const { weeks }   = useData()
  const week        = weeks.find(w => w.id === weekId)

  const [activeTab,           setActiveTab]           = useState('Overview')
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null)
  const [selectedSubmission,  setSelectedSubmission]  = useState<Submission | null>(null)
  const [participantSearch,   setParticipantSearch]   = useState('')
  const [subFilter,           setSubFilter]           = useState('all')
  const [subPage,             setSubPage]             = useState(1)

  const stats = useMemo(() => week ? generateStats(week) : null, [week?.id, week?.problems?.length])

  if (!week || !stats) return <div className="flex items-center justify-center h-full text-slate-400 text-sm">Contest not found.</div>

  const { participants, problemStats, submissions, totalParticipants, problems } = stats

  const totalSubmissions = submissions.length
  const totalPossible    = problems.reduce((s, p) => s + (p.maxScore || 100), 0)
  const avgScore         = totalParticipants > 0 ? Math.round(participants.reduce((s, p) => s + p.total, 0) / totalParticipants) : 0
  const completionRate   = totalParticipants > 0
    ? Math.round((participants.filter(p => Object.keys(p.scores).length === problems.length).length / totalParticipants) * 100)
    : 0

  const filteredParticipants = participantSearch.trim()
    ? participants.filter(p => p.name.toLowerCase().includes(participantSearch.toLowerCase()))
    : participants

  const filteredSubs  = subFilter === 'all' ? submissions : submissions.filter(s => s.verdict === subFilter)
  const pagedSubs     = filteredSubs.slice((subPage - 1) * PAGE_SIZE, subPage * PAGE_SIZE)

  function handleSubFilter(v: string) { setSubFilter(v); setSubPage(1) }
  function openSubmission(sub: Submission) { setSelectedParticipant(null); setSelectedSubmission(sub) }

  return (
    <div className="flex flex-col min-h-full">
      {/* Breadcrumb */}
      <div className="h-auto sm:h-16 bg-white border-b border-slate-200/80 flex flex-wrap items-center px-4 sm:px-8 py-3 sm:py-0 gap-2 shrink-0">
        <Link href="/statistics" className="text-sm text-slate-400 hover:text-slate-700 transition-colors font-medium">Analytics</Link>
        <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-sm font-semibold text-slate-900">{week.title}</span>
      </div>

      {/* Contest header + tabs */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-8 pt-5 pb-0 shrink-0">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{week.title}</h1>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap text-xs text-slate-500">
              {week.startDate && <span className="tabular-nums">{week.startDate} · {week.startTime || '10:00'}</span>}
              <span className={`inline-flex items-center gap-1.5 font-semibold px-2 py-0.5 rounded-full ${
                week.active ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60' : 'bg-slate-100 text-slate-500'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${week.active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                {week.active ? 'Live' : 'Ended'}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {[{ v: totalParticipants, l: 'Participants' }, { v: totalSubmissions, l: 'Submissions' }, { v: `${completionRate}%`, l: 'Completion' }].map(k => (
              <div key={k.l} className="text-center px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-xl font-bold text-slate-900 tabular-nums">{k.v}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{k.l}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-end overflow-x-auto">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-sm border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab
                  ? 'border-slate-900 text-slate-900 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 font-medium'
              }`}>
              {tab}
              {tab === 'Submissions' && totalSubmissions > 0 && <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">{totalSubmissions}</span>}
              {tab === 'Leaderboard' && totalParticipants > 0 && <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">{totalParticipants}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 p-4 sm:p-8 overflow-auto">
        {problems.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
            <svg className="w-10 h-10 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-sm font-semibold text-slate-600">No analytics yet</p>
            <p className="text-xs">Add problems to this contest to start collecting data</p>
          </div>
        )}

        {problems.length > 0 && (<>

          {/* ── OVERVIEW ── */}
          {activeTab === 'Overview' && (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Participants',  value: totalParticipants, color: 'text-slate-900' },
                  { label: 'Submissions',   value: totalSubmissions,  color: 'text-slate-900' },
                  { label: 'Average Score', value: avgScore,          color: 'text-amber-600' },
                  { label: 'Full Solvers',  value: participants.filter(p => p.total === totalPossible).length, color: 'text-emerald-600' },
                ].map(k => (
                  <div key={k.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                    <p className={`text-3xl font-bold tabular-nums ${k.color}`}>{k.value}</p>
                    <p className="text-xs text-slate-500 mt-1.5">{k.label}</p>
                  </div>
                ))}
              </div>

              {/* Dropout funnel + Score distribution */}
              {(() => {
                const dropoutData = problemStats.map(ps => ({
                  label: ps.label,
                  fullName: ps.name,
                  attempted: ps.totalParticipants > 0 ? Math.round((ps.attempted / ps.totalParticipants) * 100) : 0,
                  solved:    ps.totalParticipants > 0 ? Math.round((ps.solved / ps.totalParticipants) * 100) : 0,
                  difficulty: ps.difficulty,
                }))
                return (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6">
                      <h3 className="font-bold text-slate-900">Participant Dropout by Problem</h3>
                      <p className="text-xs text-slate-500 mt-0.5 mb-4">Where participants stopped engaging — a steep fall shows the wall problem</p>
                      <ResponsiveContainer width="100%" height={220}>
                        <AreaChart data={dropoutData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="gAttempted" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.15} />
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="gSolved" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%"  stopColor="#10b981" stopOpacity={0.18} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                          <XAxis dataKey="label" tick={{ fontSize: 13, fill: '#475569', fontWeight: 700 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={32} unit="%" domain={[0, 100]} />
                          <Tooltip content={({ active, payload, label }: any) => {
                            if (!active || !payload?.length) return null
                            const d = dropoutData.find(x => x.label === label)
                            return (
                              <div className="bg-white border border-slate-200 shadow-lg rounded-xl px-4 py-3 text-sm">
                                <p className="font-bold text-slate-700 mb-2">{d?.fullName || label}</p>
                                {payload.map((p: any) => (
                                  <div key={p.name} className="flex items-center gap-2 text-xs">
                                    <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                                    <span className="text-slate-500">{p.name}:</span>
                                    <span className="font-semibold text-slate-800">{p.value}%</span>
                                  </div>
                                ))}
                              </div>
                            )
                          }} />
                          <Legend wrapperStyle={{ paddingTop: 16, fontSize: 12 }} formatter={(v: any) => <span style={{ color: '#64748b' }}>{v}</span>} />
                          <Area type="monotone" dataKey="attempted" name="Attempted %"
                            stroke="#6366f1" strokeWidth={2.5} fill="url(#gAttempted)"
                            dot={{ r: 5, fill: '#6366f1', strokeWidth: 0 }}
                            activeDot={{ r: 7, strokeWidth: 0 }} />
                          <Area type="monotone" dataKey="solved" name="Solved %"
                            stroke="#10b981" strokeWidth={2.5} fill="url(#gSolved)"
                            dot={{ r: 5, fill: '#10b981', strokeWidth: 0 }}
                            activeDot={{ r: 7, strokeWidth: 0 }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6">
                      <h3 className="font-bold text-slate-900">Score Distribution</h3>
                      <p className="text-xs text-slate-500 mt-0.5 mb-4">How participants spread across score ranges (% of max possible)</p>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart
                          data={['0–20%','20–40%','40–60%','60–80%','80–100%'].map((range, i) => {
                            const buckets = [0,0,0,0,0]
                            participants.forEach(p => { const pct = totalPossible > 0 ? p.total/totalPossible : 0; buckets[Math.min(4,Math.floor(pct*5))]++ })
                            return { range, count: buckets[i] }
                          })}
                          margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                          <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
                          <Tooltip content={({ active, payload, label }: any) => active && payload?.length ? (
                            <div className="bg-white border border-slate-200 shadow-lg rounded-xl px-4 py-3 text-sm">
                              <p className="font-bold text-slate-700">{label}</p>
                              <p className="text-xs text-slate-500 mt-1">{payload[0].value} participant{payload[0].value !== 1 ? 's' : ''}</p>
                            </div>
                          ) : null} />
                          <Bar dataKey="count" name="Participants" radius={[6, 6, 0, 0]} maxBarSize={52}>
                            {['#c7d2fe','#a5b4fc','#818cf8','#6366f1','#4f46e5'].map((color, i) => <Cell key={i} fill={color} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )
              })()}

              {/* Top 5 preview */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-bold text-slate-900">Top Participants</h3>
                  <button onClick={() => setActiveTab('Leaderboard')} className="text-xs font-semibold text-slate-600 hover:text-slate-900">Full leaderboard →</button>
                </div>
                <div className="divide-y divide-slate-100">
                  {participants.slice(0, 5).map(p => (
                    <div key={p.id} className="px-4 sm:px-6 py-3.5 flex items-center gap-4 hover:bg-slate-50/60 cursor-pointer transition-colors" onClick={() => setSelectedParticipant(p)}>
                      <span className={`w-6 text-sm font-bold tabular-nums text-center ${p.rank! <= 3 ? 'text-amber-500' : 'text-slate-400'}`}>
                        {p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : p.rank === 3 ? '🥉' : p.rank}
                      </span>
                      <Avatar name={p.name} size="sm" />
                      <span className="text-sm font-semibold text-slate-800 flex-1">{p.name}</span>
                      <span className="text-sm font-bold text-slate-700 tabular-nums">{p.total} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── LEADERBOARD (merged with participants) ── */}
          {activeTab === 'Leaderboard' && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-bold text-slate-900">Leaderboard</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Click any row to view full submission history and code</p>
                </div>
                <SearchBar value={participantSearch} onChange={setParticipantSearch} />
              </div>
              {filteredParticipants.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-center py-16 text-slate-400 text-sm">
                  No participants match &quot;{participantSearch}&quot;
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-200">
                          <th className="px-4 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest w-12 whitespace-nowrap">Rank</th>
                          <th className="px-4 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Participant</th>
                          {problems.map((p, i) => (
                            <th key={p.id} className="px-4 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                              {String.fromCharCode(65+i)}
                              <span className="block text-[10px] text-slate-300 normal-case font-normal">{p.maxScore}pts</span>
                            </th>
                          ))}
                          <th className="px-4 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">Subs</th>
                          <th className="px-4 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">Total</th>
                          <th className="px-4 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Last Submit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredParticipants.map(p => {
                          const subCount = submissions.filter(s => s.participantId === p.id).length
                          return (
                            <tr key={p.id} onClick={() => setSelectedParticipant(p)} className="hover:bg-slate-50 cursor-pointer transition-colors group">
                              <td className="px-4 py-3.5 text-center">
                                <span className={`text-sm font-bold ${p.rank! <= 3 ? 'text-amber-500' : 'text-slate-400'}`}>
                                  {p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : p.rank === 3 ? '🥉' : `#${p.rank}`}
                                </span>
                              </td>
                              <td className="px-4 py-3.5">
                                <div className="flex items-center gap-2.5">
                                  <Avatar name={p.name} size="sm" />
                                  <div>
                                    <p className="text-sm font-semibold text-slate-800 group-hover:text-slate-900 transition-colors">{p.name}</p>
                                    <p className="text-xs text-slate-400">{p.country}</p>
                                  </div>
                                </div>
                              </td>
                              {problems.map(prob => {
                                const score = p.scores[prob.id]
                                const isAC  = score === (prob.maxScore || 100)
                                return (
                                  <td key={prob.id} className="px-4 py-3.5 text-center">
                                    {score !== undefined
                                      ? <span className={`text-sm font-bold tabular-nums ${isAC ? 'text-emerald-600' : 'text-amber-600'}`}>{score}</span>
                                      : <span className="text-slate-200">—</span>}
                                  </td>
                                )
                              })}
                              <td className="px-4 py-3.5 text-center text-sm text-slate-500 tabular-nums">{subCount}</td>
                              <td className="px-4 py-3.5 text-right"><span className="text-sm font-bold text-slate-700 tabular-nums">{p.total}</span></td>
                              <td className="px-4 py-3.5 text-xs text-slate-400 tabular-nums">
                                {p.lastSubmit ? new Date(p.lastSubmit).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : '—'}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── PROBLEMS ── */}
          {activeTab === 'Problems' && (() => {
            const CONTEST_BASE_MS = new Date('2025-01-06T10:00:00').getTime()

            const enriched: EnrichedProblemStat[] = problemStats.map(ps => {
              const pSubs   = submissions.filter(s => s.problemId === ps.id)
              const acSubs  = pSubs.filter(s => s.verdict === 'AC')
              const vCounts: Record<string, number> = { AC: 0, WA: 0, TLE: 0, CE: 0, RE: 0 }
              pSubs.forEach(s => { vCounts[s.verdict] = (vCounts[s.verdict] || 0) + 1 })

              const frictionScore  = ps.solved > 0 ? (pSubs.length / ps.solved).toFixed(1) : '—'
              const abandonCount   = ps.attempted - ps.solved
              const abandonRate    = ps.attempted > 0 ? Math.round((abandonCount / ps.attempted) * 100) : 0
              const solveTimes     = acSubs.map(s => Math.round((s.timeMs - CONTEST_BASE_MS) / 60000)).sort((a,b)=>a-b)
              const medianSolveMin = solveTimes.length > 0 ? solveTimes[Math.floor(solveTimes.length / 2)] : null
              const tleRate        = pSubs.length > 0 ? Math.round((vCounts.TLE / pSubs.length) * 100) : 0
              const solveRate      = ps.totalParticipants > 0 ? Math.round((ps.solved / ps.totalParticipants) * 100) : 0

              const attemptDist = [0, 0, 0, 0]
              participants.forEach(p => {
                const att = p.attempts[ps.id]
                if (att) attemptDist[Math.min(att - 1, 3)]++
              })

              return { ...ps, pSubs, vCounts, frictionScore, abandonRate, medianSolveMin, tleRate, attemptDist, solveRate }
            })

            const allLangMap: Record<string, { total: number; ac: number }> = {}
            submissions.forEach(s => {
              if (!allLangMap[s.lang]) allLangMap[s.lang] = { total: 0, ac: 0 }
              allLangMap[s.lang].total++
              if (s.verdict === 'AC') allLangMap[s.lang].ac++
            })
            const langData = Object.entries(allLangMap)
              .map(([lang, { total, ac }]) => ({ lang, total, ac, rate: Math.round((ac / total) * 100) }))
              .sort((a, b) => b.total - a.total)

            return (
              <div className="flex flex-col gap-6">

                {/* Per-problem deep-dive cards */}
                {enriched.map(ps => {
                  const verdictRows = [
                    { v: 'AC',  count: ps.vCounts.AC,  color: '#10b981' },
                    { v: 'WA',  count: ps.vCounts.WA,  color: '#f43f5e' },
                    { v: 'TLE', count: ps.vCounts.TLE, color: '#f59e0b' },
                    { v: 'CE',  count: ps.vCounts.CE,  color: '#94a3b8' },
                    { v: 'RE',  count: ps.vCounts.RE,  color: '#a855f7' },
                  ].filter(r => r.count > 0)
                  const totalPSubs = ps.pSubs.length

                  return (
                    <div key={ps.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                      {/* Header */}
                      <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex flex-wrap items-center gap-3">
                        <span className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-base font-bold text-slate-700 shrink-0">{ps.label}</span>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-slate-900 truncate">{ps.name}</h3>
                        </div>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${DIFF_COLORS[ps.difficulty] || 'bg-slate-100 text-slate-600'}`}>{ps.difficulty}</span>
                        <span className="text-sm font-bold text-slate-400">{ps.maxScore} pts</span>
                      </div>

                      {/* Core stats row */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 sm:divide-x divide-slate-100 border-b border-slate-100">
                        {[
                          { label: 'Attempted',   value: `${ps.attempted} / ${ps.totalParticipants}` },
                          { label: 'Solved (AC)', value: `${ps.solved} (${ps.solveRate}%)` },
                          { label: 'Avg Score',   value: `${ps.avgScore} pts` },
                          { label: 'First Solve', value: ps.firstSolveBy, sub: ps.firstSolveTime },
                        ].map(s => (
                          <div key={s.label} className="px-4 sm:px-6 py-4">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{s.label}</p>
                            <p className="text-lg font-bold text-slate-800 mt-1 tabular-nums">{s.value}</p>
                            {s.sub && <p className="text-xs text-slate-400 tabular-nums">{s.sub}</p>}
                          </div>
                        ))}
                      </div>

                      {/* Diagnostic metrics row */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 sm:divide-x divide-slate-100 border-b border-slate-100 bg-slate-50/40">
                        {[
                          { icon: '⚡', label: 'Friction Score',  value: ps.frictionScore,                                          desc: 'submissions per AC',         alert: Number(ps.frictionScore) > 4 },
                          { icon: '🚪', label: 'Abandonment',     value: `${ps.abandonRate}%`,                                      desc: 'tried but never solved',     alert: ps.abandonRate > 60 },
                          { icon: '⏱', label: 'Median Solve',    value: ps.medianSolveMin !== null ? `${ps.medianSolveMin} min` : '—', desc: 'minutes into contest',    alert: false },
                          { icon: '🐢', label: 'TLE Rate',        value: `${ps.tleRate}%`,                                          desc: 'of all submissions',         alert: ps.tleRate > 30 },
                        ].map(s => (
                          <div key={s.label} className="px-4 sm:px-6 py-3.5">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                              <span>{s.icon}</span>{s.label}
                            </p>
                            <p className={`text-xl font-bold mt-1 tabular-nums ${s.alert ? 'text-rose-600' : 'text-slate-800'}`}>{s.value}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{s.desc}</p>
                          </div>
                        ))}
                      </div>

                      {/* Charts: verdict breakdown + attempts histogram */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
                        <div className="p-4 sm:p-6">
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Verdict Breakdown</p>
                          {verdictRows.length === 0 ? (
                            <p className="text-sm text-slate-400">No submissions</p>
                          ) : (
                            <div className="space-y-2.5">
                              {verdictRows.map(({ v, count, color }) => (
                                <div key={v} className="flex items-center gap-3">
                                  <span className="w-8 text-xs font-bold text-slate-600">{v}</span>
                                  <div className="flex-1 bg-slate-100 rounded-full h-2.5">
                                    <div className="h-2.5 rounded-full transition-all" style={{ width: `${(count / totalPSubs) * 100}%`, background: color }} />
                                  </div>
                                  <span className="text-xs text-slate-500 tabular-nums w-20 text-right">
                                    {count} ({Math.round((count / totalPSubs) * 100)}%)
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="p-4 sm:p-6">
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Submission Attempts per Participant</p>
                          <p className="text-[10px] text-slate-400 mb-3">How many tries participants needed (includes failed attempts)</p>
                          <ResponsiveContainer width="100%" height={110}>
                            <BarChart
                              data={[
                                { label: '1st try', count: ps.attemptDist[0] },
                                { label: '2 tries', count: ps.attemptDist[1] },
                                { label: '3 tries', count: ps.attemptDist[2] },
                                { label: '4+ tries', count: ps.attemptDist[3] },
                              ]}
                              margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                              <Tooltip content={({ active, payload, label }: any) => active && payload?.length ? (
                                <div className="bg-white border border-slate-200 shadow-lg rounded-lg px-3 py-2 text-xs">
                                  <p className="font-semibold text-slate-700">{label}: <span className="text-slate-900">{payload[0].value}</span> participants</p>
                                </div>
                              ) : null} />
                              <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={44} fill="#6366f1" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* 3. Language Performance */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6">
                  <h3 className="font-bold text-slate-900 mb-0.5">Language Performance</h3>
                  <p className="text-xs text-slate-500 mb-5">AC rate by language across all problems — a low Python/JS rate often means the time limit is too strict for interpreted languages</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={langData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="lang" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
                      <Tooltip content={({ active, payload, label }: any) => {
                        if (!active || !payload?.length) return null
                        const d = langData.find(x => x.lang === label)
                        return (
                          <div className="bg-white border border-slate-200 shadow-lg rounded-xl px-4 py-3 text-sm">
                            <p className="font-bold text-slate-700">{label}</p>
                            <p className="text-xs text-slate-500 mt-1">{d?.ac} AC / {d?.total} submissions</p>
                            <p className="text-xs font-semibold text-slate-700 mt-0.5">{d?.rate}% success rate</p>
                          </div>
                        )
                      }} />
                      <Legend wrapperStyle={{ paddingTop: 12, fontSize: 12 }} formatter={(v: any) => <span style={{ color: '#64748b' }}>{v}</span>} />
                      <Bar dataKey="total" name="Total Submissions" radius={[4, 4, 0, 0]} maxBarSize={40} fill="#e2e8f0" />
                      <Bar dataKey="ac"    name="Accepted (AC)"    radius={[4, 4, 0, 0]} maxBarSize={40} fill="#6366f1" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

              </div>
            )
          })()}


          {/* ── SUBMISSIONS ── */}
          {activeTab === 'Submissions' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="font-bold text-slate-900">All Submissions</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{filteredSubs.length} of {totalSubmissions} · click a row to view code + test results</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {['all','AC','WA','TLE','CE','RE'].map(v => (
                    <button key={v} onClick={() => handleSubFilter(v)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${subFilter===v?'bg-slate-900 text-white':'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                      {v==='all'?'All':v}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200">
                        {['Time','Participant','Problem','Language','Verdict','Score'].map(h => (
                          <th key={h} className={`px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap ${h==='Score'?'text-right':''}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pagedSubs.map(sub => (
                        <tr key={sub.id} onClick={() => openSubmission(sub)} className="hover:bg-slate-50/60 cursor-pointer transition-colors group">
                          <td className="px-6 py-3.5 text-xs text-slate-400 font-mono tabular-nums">{sub.timeStr}</td>
                          <td className="px-6 py-3.5">
                            <div className="flex items-center gap-2">
                              <Avatar name={sub.participantName} size="sm" />
                              <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">{sub.participantName}</span>
                            </div>
                          </td>
                          <td className="px-6 py-3.5">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-md bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600">{sub.problemLabel}</span>
                              <span className="text-sm text-slate-600 truncate max-w-40">{sub.problemName}</span>
                            </div>
                          </td>
                          <td className="px-6 py-3.5 text-sm text-slate-500">{sub.lang}</td>
                          <td className="px-6 py-3.5">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${VERDICT_STYLE[sub.verdict]||'bg-slate-100 text-slate-600'}`}>{sub.verdict}</span>
                          </td>
                          <td className="px-6 py-3.5 text-right">
                            <span className={`text-sm font-bold tabular-nums ${sub.verdict==='AC'?'text-emerald-600':'text-slate-500'}`}>{sub.score}</span>
                          </td>
                        </tr>
                      ))}
                      {pagedSubs.length === 0 && (
                        <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">No submissions match the selected filter</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <Pagination total={filteredSubs.length} page={subPage} setPage={setSubPage} />
              </div>
            </div>
          )}
        </>)}
      </div>

      {/* Overlays */}
      <ParticipantPanel
        participant={selectedParticipant}
        problems={problems}
        submissions={submissions}
        onClose={() => setSelectedParticipant(null)}
        onSubClick={sub => { setSelectedParticipant(null); setTimeout(() => setSelectedSubmission(sub), 50) }}
        weeks={weeks}
        currentWeekId={week.id}
      />
      <SubmissionModal
        submission={selectedSubmission}
        onClose={() => setSelectedSubmission(null)}
      />
    </div>
  )
}
