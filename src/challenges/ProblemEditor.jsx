import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useData } from '../context/DataContext'

const TABS = ['Details', 'Moderators', 'Test Cases', 'Code Stubs', 'Languages', 'Settings', 'Editorial', 'Custom Checker']

const ALL_LANGUAGES = [
  { id: 'CPP',     label: 'C++',        defaultTime: 2,  defaultMem: 256 },
  { id: 'JAVA',    label: 'Java',       defaultTime: 4,  defaultMem: 512 },
  { id: 'PYTHON3', label: 'Python 3',   defaultTime: 5,  defaultMem: 256 },
  { id: 'PYTHON2', label: 'Python 2',   defaultTime: 5,  defaultMem: 256 },
  { id: 'JS',      label: 'JavaScript', defaultTime: 10, defaultMem: 512 },
  { id: 'GO',      label: 'Go',         defaultTime: 3,  defaultMem: 256 },
  { id: 'CSHARP',  label: 'C#',         defaultTime: 4,  defaultMem: 256 },
  { id: 'RUBY',    label: 'Ruby',       defaultTime: 10, defaultMem: 256 },
]

const DEFAULT_STUBS = {
  CPP: {
    head: '',
    body: `#include <cmath>\n#include <cstdio>\n#include <vector>\n#include <iostream>\n#include <algorithm>\nusing namespace std;\n\nint main() {\n    /* Enter your code here. Read input from STDIN. Print output to STDOUT */\n    return 0;\n}`,
    tail: '',
  },
  JAVA: {
    head: 'import java.io.*;',
    body: `public class Solution {\n    public static void main(String[] args) throws IOException {\n        /* Enter your code here. Read input from STDIN. Print output to STDOUT */\n    }\n}`,
    tail: '',
  },
  PYTHON3: {
    head: '',
    body: `# Enter your code here. Read input from STDIN. Print output to STDOUT`,
    tail: '',
  },
  PYTHON2: {
    head: '',
    body: `# Enter your code here. Read input from STDIN. Print output to STDOUT`,
    tail: '',
  },
  JS: {
    head: `'use strict';\nprocess.stdin.resume();\nprocess.stdin.setEncoding('utf-8');\nlet inputString = ''; let currentLine = 0;\nprocess.stdin.on('data', s => { inputString += s; });\nprocess.stdin.on('end', _ => { inputString = inputString.trim().split('\\n'); main(); });`,
    body: `function readLine() { return inputString[currentLine++]; }\n\nfunction main() {\n    // Write your code here\n}`,
    tail: '',
  },
  GO: {
    head: 'package main\nimport "fmt"',
    body: `func main() {\n    // Enter your code here. Read input from STDIN. Print output to STDOUT\n}`,
    tail: '',
  },
  CSHARP: {
    head: 'using System;',
    body: `class Solution {\n    static void Main(String[] args) {\n        // Enter your code here. Read input from STDIN. Print output to STDOUT\n    }\n}`,
    tail: '',
  },
  RUBY: {
    head: '',
    body: `# Enter your code here. Read input from STDIN. Print output to STDOUT`,
    tail: '',
  },
}

const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-800 placeholder:text-slate-400'
const selectCls = 'px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-800 bg-white'

const emptyProblem = {
  name: '', difficulty: 'Medium',
  description: '', problemStatement: '', inputFormat: '', outputFormat: '', constraints: '',
  tags: [],
  testCases: [],
  languages: ['CPP', 'JAVA', 'PYTHON3'],
  languageSettings: {},
  codeStubs: {},
  dsl: '',
  maxScore: 100, scoringType: 'partial',
  multipleSolution: false, validatorCode: '',
  requiredKnowledge: '', timeComplexity: '',
  editorialist: '', partialEditorial: false, approach: '',
  problemSetter: '', setterCode: '',
  problemTester: '', testerCode: '',
  enablePrecisionCheck: false, precisionCheck: '1e100',
  disableCompileTest: false, disableCustomTestcase: false,
  disableSubmissions: false, publicTestcase: true,
  publicSolutions: false, restrictedForum: false,
}

const emptyTcForm = {
  tag: '', strength: 10, isSample: false, isAdditional: false,
  input: '', output: '', explanation: '',
  inputMode: 'editor', outputMode: 'editor',
}

/* ── Small components ─────────────────────────────────── */
function TipIcon() {
  return <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-slate-300 text-slate-600 text-[9px] font-black cursor-help ml-1 leading-none select-none">?</span>
}

function Toolbar() {
  return (
    <div className="flex items-center gap-0.5 px-3 py-2 border-b border-slate-200 bg-slate-50/80">
      {[
        <strong>B</strong>, <em>i</em>,
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>,
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>,
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>,
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>,
      ].map((icon, i) => (
        <button key={i} type="button" className="p-1.5 rounded text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors text-sm leading-none">{icon}</button>
      ))}
      <button type="button" className="ml-auto text-xs font-medium text-slate-500 border border-slate-300 px-2.5 py-1 rounded hover:bg-slate-100 transition-colors">Preview</button>
    </div>
  )
}

function RichTextArea({ value, onChange, rows = 5, placeholder }) {
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden focus-within:border-slate-400">
      <Toolbar />
      <textarea value={value} onChange={onChange} rows={rows} placeholder={placeholder}
        className="w-full p-3 text-sm text-slate-800 font-mono resize-y focus:outline-none placeholder:text-slate-400 placeholder:font-sans" />
    </div>
  )
}

function FormRow({ label, hint, children }) {
  return (
    <div className="flex gap-10 py-5 border-b border-slate-100 last:border-0">
      <div className="w-44 shrink-0 pt-1">
        <p className="text-sm font-semibold text-slate-700">{label}</p>
        {hint && <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{hint}</p>}
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

function SettingRow({ label, desc, children }) {
  return (
    <div className="py-4 border-b border-slate-100 last:border-0 flex items-start justify-between gap-8">
      <div className="flex-1">
        <p className="text-sm font-bold text-slate-800">{label}</p>
        {desc && <p className="text-sm text-slate-500 mt-0.5">{desc}</p>}
      </div>
      <div className="shrink-0 pt-0.5">{children}</div>
    </div>
  )
}

function TagInput({ tags, onChange }) {
  const [input, setInput] = useState('')
  function addTag(e) {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault()
      if (!tags.includes(input.trim())) onChange([...tags, input.trim()])
      setInput('')
    }
  }
  return (
    <div className="flex flex-wrap gap-1.5 items-center border border-slate-200 rounded-lg px-3 py-2 min-h-10.5 focus-within:border-slate-400">
      {tags.map(t => (
        <span key={t} className="flex items-center gap-1 bg-slate-200 text-slate-700 text-xs font-medium px-2 py-0.5 rounded">
          {t}<button type="button" onClick={() => onChange(tags.filter(x => x !== t))} className="text-slate-500 hover:text-slate-800">×</button>
        </span>
      ))}
      <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={addTag}
        placeholder={tags.length === 0 ? 'Add a tag, press Enter' : ''}
        className="flex-1 min-w-24 text-sm outline-none placeholder:text-slate-400" />
    </div>
  )
}

function CodeTextarea({ value, onChange }) {
  return (
    <div className="border border-slate-200 rounded bg-white overflow-hidden focus-within:border-slate-400 transition-all">
      <textarea value={value} onChange={onChange} rows={4}
        className="w-full py-2 px-3 text-sm font-mono text-slate-800 resize-y focus:outline-none" spellCheck={false} />
    </div>
  )
}

function ModAvatar({ username }) {
  return (
    <div className="w-10 h-10 rounded bg-slate-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
      {username.slice(0, 2).toUpperCase()}
    </div>
  )
}

/* ── Slider with labeled tick marks ───────────────────── */
function RangeSlider({ value, onChange, min, max, step, marks }) {
  return (
    <div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-emerald-500" />
      <div className="flex justify-between mt-0.5">
        {marks.map((m, i) => (
          <span key={i} className="text-[10px] text-slate-400 tabular-nums">{m}</span>
        ))}
      </div>
    </div>
  )
}

/* ── Code stub section (Head / Body / Tail) ───────────── */
function StubSection({ label, value, onChange, startLine }) {
  const lines = (value || '').split('\n')
  const count = Math.max(lines.length, 1)
  return (
    <div>
      <div className="px-4 py-1 bg-slate-100 border-t border-slate-200 first:border-t-0">
        <span className="text-xs font-semibold text-slate-600">{label}</span>
      </div>
      <div className="flex min-h-8">
        <div className="w-9 border-r border-slate-200 bg-white py-1.5 px-1 text-right select-none shrink-0">
          {Array.from({ length: count }, (_, i) => (
            <div key={i} className="text-[10px] text-slate-400 leading-5 tabular-nums">{startLine + i}</div>
          ))}
        </div>
        <textarea value={value} onChange={e => onChange(e.target.value)}
          rows={Math.max(count, 1)}
          className="flex-1 py-1.5 px-3 text-sm font-mono text-slate-800 resize-none focus:outline-none bg-sky-50/20 leading-5"
          spellCheck={false} />
      </div>
    </div>
  )
}

/* ── Main component ───────────────────────────────────── */
export default function ProblemEditor({ type }) {
  const { weekId, eventId } = useParams()
  const parentId = Number(type === 'week' ? weekId : eventId)
  const navigate = useNavigate()
  const { weeks, events, addProblem, addEventProblem } = useData()

  const parent = type === 'week' ? weeks.find(w => w.id === parentId) : events.find(e => e.id === parentId)
  const backTo = type === 'week' ? `/challenges/${parentId}` : `/events/${parentId}`

  const [tab, setTab] = useState('Details')
  const [problem, setProblem] = useState(emptyProblem)
  const [moderators, setModerators] = useState([{ id: 0, username: 'admin', role: 'owner' }])
  const [modInput, setModInput] = useState('')
  const [showTcModal, setShowTcModal] = useState(false)
  const [tcForm, setTcForm] = useState(emptyTcForm)
  const [selectedTcs, setSelectedTcs] = useState(new Set())
  const [stubLang, setStubLang] = useState('CPP')
  const [expandedLang, setExpandedLang] = useState(null)
  const [langEdit, setLangEdit] = useState({ timeLimit: 2, memLimit: 256 })
  const [langEditStub, setLangEditStub] = useState({ head: '', body: '', tail: '' })

  const set = (key, val) => setProblem(p => ({ ...p, [key]: val }))
  const setTc = (key, val) => setTcForm(f => ({ ...f, [key]: val }))

  const slug = problem.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

  const totalStrength = problem.testCases.reduce((s, t) => s + (t.strength || 0), 0)
  const selectedStrength = problem.testCases.filter(t => selectedTcs.has(t.id)).reduce((s, t) => s + (t.strength || 0), 0)
  const scorePct = totalStrength > 0 ? (selectedStrength / totalStrength * 100).toFixed(2) : '0.00'

  const previewStub = problem.codeStubs[stubLang] || DEFAULT_STUBS[stubLang] || { head: '', body: '', tail: '' }
  const previewHeadLines = (previewStub.head || '').split('\n').length
  const previewBodyLines = (previewStub.body || '').split('\n').length

  function addModerator() {
    if (!modInput.trim()) return
    setModerators(m => [...m, { id: Date.now(), username: modInput.trim(), role: 'moderator' }])
    setModInput('')
  }

  function saveTestCase() {
    if (!tcForm.input.trim()) { alert('Input is required'); return }
    setProblem(p => ({ ...p, testCases: [...p.testCases, { ...tcForm, id: Date.now() }] }))
    setTcForm(emptyTcForm)
    setShowTcModal(false)
  }

  function removeTestCase(id) {
    setProblem(p => ({ ...p, testCases: p.testCases.filter(t => t.id !== id) }))
    setSelectedTcs(s => { const n = new Set(s); n.delete(id); return n })
  }

  function toggleSelectTc(id) {
    setSelectedTcs(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  function toggleLang(id) {
    set('languages', problem.languages.includes(id) ? problem.languages.filter(l => l !== id) : [...problem.languages, id])
  }

  function generateStubs() {
    const stubs = {}
    problem.languages.forEach(id => { stubs[id] = DEFAULT_STUBS[id] || { head: '', body: '', tail: '' } })
    set('codeStubs', stubs)
    if (problem.languages.includes(stubLang) === false && problem.languages[0]) setStubLang(problem.languages[0])
  }

  function openLangEdit(lang) {
    const saved = problem.languageSettings[lang.id] || {}
    const stub = problem.codeStubs[lang.id] || DEFAULT_STUBS[lang.id] || {}
    setExpandedLang(lang.id)
    setLangEdit({ timeLimit: saved.timeLimit ?? lang.defaultTime, memLimit: saved.memLimit ?? lang.defaultMem })
    setLangEditStub({ head: stub.head ?? '', body: stub.body ?? '', tail: stub.tail ?? '' })
  }

  function saveLangEdit() {
    set('languageSettings', { ...problem.languageSettings, [expandedLang]: langEdit })
    set('codeStubs', { ...problem.codeStubs, [expandedLang]: langEditStub })
    setExpandedLang(null)
  }

  function getLangDisplay(lang) {
    const s = problem.languageSettings[lang.id]
    return { time: s?.timeLimit ?? lang.defaultTime, mem: s?.memLimit ?? lang.defaultMem }
  }

  function handleSave() {
    if (!problem.name.trim()) { alert('Problem name is required'); setTab('Details'); return }
    if (type === 'week') addProblem(parentId, problem)
    else addEventProblem(parentId, problem)
    navigate(backTo)
  }

  function closeTcModal() { setShowTcModal(false); setTcForm(emptyTcForm) }

  if (!parent) return <div className="flex items-center justify-center h-full text-slate-400 text-sm">Parent not found.</div>

  return (
    <div className="flex flex-col min-h-full bg-white">
      <div className="h-14 border-b border-slate-200 flex items-center px-8 gap-2 shrink-0">
        <Link to={backTo} className="text-sm text-slate-400 hover:text-slate-700 transition-colors">{parent.title}</Link>
        <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        <span className="text-sm font-semibold text-slate-900">{problem.name || 'New Problem'}</span>
      </div>

      <div className="flex items-center border-b border-slate-200 px-8 bg-white shrink-0 overflow-x-auto">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-3.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
              tab === t ? 'border-slate-900 text-slate-900 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
            }`}
          >{t}</button>
        ))}
      </div>

      <div className="flex-1 overflow-auto">

        {/* ── DETAILS ── */}
        {tab === 'Details' && (
          <div className="max-w-4xl px-8 py-2">
            <p className="text-sm text-slate-400 italic py-4 border-b border-slate-100">This is the basic information that describes your challenge.</p>
            <FormRow label="Challenge Difficulty">
              <select className={`${selectCls} w-48`} value={problem.difficulty} onChange={e => set('difficulty', e.target.value)}>
                <option>Easy</option><option>Medium</option><option>Hard</option>
              </select>
            </FormRow>
            <FormRow label="Challenge Name">
              <input className={inputCls} value={problem.name} onChange={e => set('name', e.target.value)} placeholder="Enter challenge name" />
            </FormRow>
            <FormRow label="Challenge Slug" hint="Auto-generated from name">
              {slug ? <p className="text-sm text-slate-600 font-mono py-1">/challenges/{slug}</p>
                    : <p className="text-sm text-slate-400 italic py-1">Will appear once you enter a name</p>}
            </FormRow>
            <FormRow label="Description">
              <div>
                <textarea className={`${inputCls} resize-none h-20`} value={problem.description}
                  onChange={e => set('description', e.target.value)} maxLength={150}
                  placeholder="Brief description (max 150 characters)..." />
                <p className="text-xs text-slate-400 text-right mt-1">Characters left: {150 - problem.description.length}</p>
              </div>
            </FormRow>
            <FormRow label="Problem Statement">
              <div>
                <RichTextArea value={problem.problemStatement} onChange={e => set('problemStatement', e.target.value)} rows={6} placeholder="Write the full problem statement..." />
                <p className="text-xs text-slate-400 text-right mt-1">{problem.problemStatement.length} / 999</p>
              </div>
            </FormRow>
            <FormRow label="Input Format">
              <RichTextArea value={problem.inputFormat} onChange={e => set('inputFormat', e.target.value)} rows={4} placeholder="Describe the input format..." />
            </FormRow>
            <FormRow label="Constraints">
              <RichTextArea value={problem.constraints} onChange={e => set('constraints', e.target.value)} rows={4} placeholder="e.g. 1 ≤ n ≤ 10^5" />
            </FormRow>
            <FormRow label="Output Format">
              <RichTextArea value={problem.outputFormat} onChange={e => set('outputFormat', e.target.value)} rows={4} placeholder="Describe the output format..." />
            </FormRow>
            <FormRow label="Tags">
              <TagInput tags={problem.tags} onChange={tags => set('tags', tags)} />
            </FormRow>
          </div>
        )}

        {/* ── MODERATORS ── */}
        {tab === 'Moderators' && (
          <div className="max-w-4xl px-8 py-2">
            <FormRow label="Moderators">
              <div>
                <div className="flex gap-2">
                  <input className={inputCls} value={modInput} onChange={e => setModInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addModerator() } }}
                    placeholder="Enter username..." />
                  <button type="button" onClick={addModerator}
                    className="px-4 py-2 text-sm font-semibold border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap">
                    Add
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-1.5">Enter username. Moderators can edit this challenge.</p>
                <div className="mt-5 flex flex-col gap-1">
                  {moderators.map(m => (
                    <div key={m.id} className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
                      <ModAvatar username={m.username} />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-800">{m.username}</p>
                        <p className="text-xs text-slate-400">{m.role}</p>
                      </div>
                      {m.role !== 'owner' && (
                        <button onClick={() => setModerators(ms => ms.filter(x => x.id !== m.id))}
                          className="text-xs font-medium text-slate-400 hover:text-rose-500 transition-colors">Remove</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </FormRow>
          </div>
        )}

        {/* ── TEST CASES ── */}
        {tab === 'Test Cases' && (
          <div className="px-8 py-5 flex flex-col gap-4">
            <p className="text-sm text-slate-500 italic">Add test cases to judge the correctness of a user's code.</p>
            {problem.testCases.length === 0 && (
              <div className="flex items-center gap-2 px-4 py-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700">
                <svg className="w-5 h-5 shrink-0 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                You do not have any test cases for this challenge. Add at least one test case.
              </div>
            )}
            <div className="flex items-center justify-end gap-3">
              <button type="button" className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 underline underline-offset-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                Upload Zip
              </button>
              <button type="button" onClick={() => setShowTcModal(true)}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                + Add Test Case
              </button>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
              Autofill <em className="mx-0.5">Sample Input</em>, <em className="mx-0.5">Sample Output</em>, and <em className="mx-0.5">Explanation</em> fields for all test cases marked as <em className="ml-0.5">Sample</em>.
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    {['Order', 'Input', 'Output', 'Tag', 'Sample', 'Additional', 'Strength', 'Select'].map(col => (
                      <th key={col} className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">{col}<TipIcon /></th>
                    ))}
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {problem.testCases.length === 0 ? (
                    <tr><td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-400">No test cases have been added yet</td></tr>
                  ) : problem.testCases.map((tc, i) => (
                    <tr key={tc.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-slate-600 tabular-nums">{i + 1}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500 max-w-28 truncate">{tc.input.split('\n')[0] || '—'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500 max-w-28 truncate">{tc.output.split('\n')[0] || '—'}</td>
                      <td className="px-4 py-3 text-slate-500">{tc.tag || '—'}</td>
                      <td className="px-4 py-3"><input type="checkbox" checked={tc.isSample} readOnly className="accent-blue-600 cursor-default" /></td>
                      <td className="px-4 py-3"><input type="checkbox" checked={tc.isAdditional} readOnly className="accent-blue-600 cursor-default" /></td>
                      <td className="px-4 py-3 text-slate-600 tabular-nums">{tc.strength}</td>
                      <td className="px-4 py-3"><input type="checkbox" checked={selectedTcs.has(tc.id)} onChange={() => toggleSelectTc(tc.id)} className="accent-blue-600 cursor-pointer" /></td>
                      <td className="px-4 py-3">
                        <button onClick={() => removeTestCase(tc.id)} className="text-slate-300 hover:text-rose-500 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-slate-600">
              You will get <mark className="bg-yellow-200 font-semibold px-1 rounded-sm">{scorePct}%</mark> of the maximum score if you pass the selected test cases.
            </p>
          </div>
        )}

        {/* ── CODE STUBS ── */}
        {tab === 'Code Stubs' && (
          <div className="max-w-4xl px-8 py-6 flex flex-col gap-5">
            <p className="text-sm text-slate-500 italic">
              You must use our <strong className="font-bold not-italic text-slate-700">Domain Specific Language</strong> (DSL) to generate code stubs that read test case data from standard input.{' '}
              <span className="text-slate-600 cursor-pointer hover:underline">Click here</span> to learn how to write DSL.
            </p>

            <div className="flex gap-10">
              <div className="w-44 shrink-0 pt-1">
                <p className="text-sm font-semibold text-slate-700">DSL for code stubs:</p>
              </div>
              <div className="flex-1 flex flex-col gap-3">
                <textarea
                  value={problem.dsl}
                  onChange={e => set('dsl', e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 font-mono resize-y"
                  placeholder="Write your DSL here..."
                  spellCheck={false}
                />
                <div className="flex justify-end">
                  <button type="button" onClick={generateStubs}
                    className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-lg transition-colors font-mono tracking-wide">
                    Generate Code Stubs
                  </button>
                </div>
              </div>
            </div>

            <p className="text-sm text-slate-500 italic">
              Preview your auto-generated code stubs below and click <strong className="font-bold not-italic text-slate-700">Save Changes</strong> to save them.
              To edit the saved code stubs, go to the <strong className="font-bold not-italic text-slate-700">Languages</strong> tab.
            </p>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="flex items-center justify-end px-3 py-2 bg-slate-50 border-b border-slate-200">
                <select
                  value={stubLang}
                  onChange={e => setStubLang(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-slate-200 rounded bg-white focus:outline-none focus:border-slate-400 w-44"
                >
                  {ALL_LANGUAGES.map(l => (
                    <option key={l.id} value={l.id}>{l.label}</option>
                  ))}
                </select>
              </div>
              <StubSection label="Head" value={previewStub.head}
                onChange={v => set('codeStubs', { ...problem.codeStubs, [stubLang]: { ...previewStub, head: v } })}
                startLine={1} />
              <StubSection label="Body" value={previewStub.body}
                onChange={v => set('codeStubs', { ...problem.codeStubs, [stubLang]: { ...previewStub, body: v } })}
                startLine={1 + previewHeadLines} />
              <StubSection label="Tail" value={previewStub.tail}
                onChange={v => set('codeStubs', { ...problem.codeStubs, [stubLang]: { ...previewStub, tail: v } })}
                startLine={1 + previewHeadLines + previewBodyLines} />
              <div className="px-4 py-1.5 bg-slate-100 border-t border-slate-200 text-right text-xs text-slate-400">
                Line: 1 &nbsp; Col: 1
              </div>
            </div>
          </div>
        )}

        {/* ── LANGUAGES ── */}
        {tab === 'Languages' && (
          <div className="px-8 py-6 flex flex-col gap-4">
            <p className="text-sm text-slate-500 italic">
              Refer to <span className="text-slate-600 cursor-pointer hover:underline">environment page</span> for available languages and libraries.
            </p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => set('languages', [])}
                className="px-4 py-1.5 text-sm font-mono font-semibold border border-slate-300 text-slate-700 rounded hover:bg-slate-50 transition-colors">
                Unselect All Languages
              </button>
              <button type="button" onClick={() => set('languages', ALL_LANGUAGES.map(l => l.id))}
                className="px-4 py-1.5 text-sm font-mono font-semibold bg-emerald-500 hover:bg-emerald-600 text-white rounded transition-colors">
                Select All Languages
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-4 py-3 font-semibold text-slate-700 w-12">Language</th>
                    <th className="px-4 py-3 font-semibold text-slate-700 w-64"></th>
                    <th className="px-4 py-3 font-semibold text-slate-700">Time Limit (seconds)</th>
                    <th className="px-4 py-3 font-semibold text-slate-700">Memory Limit (MB)</th>
                    <th className="px-4 py-3 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {ALL_LANGUAGES.map(lang => {
                    const { time, mem } = getLangDisplay(lang)
                    const isSelected = problem.languages.includes(lang.id)
                    const isExpanded = expandedLang === lang.id
                    return (
                      <>
                        <tr key={lang.id} className={`border-b border-slate-100 ${isExpanded ? 'bg-slate-50' : 'hover:bg-slate-50'} transition-colors`}>
                          <td className="px-4 py-3">
                            <input type="checkbox" checked={isSelected} onChange={() => toggleLang(lang.id)}
                              className="w-4 h-4 accent-emerald-600 cursor-pointer" />
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-800">{lang.label}</td>
                          <td className={`px-4 py-3 tabular-nums ${time > lang.defaultTime ? 'text-amber-600 font-semibold' : 'text-slate-600'}`}>
                            {time} s
                          </td>
                          <td className="px-4 py-3 text-slate-600 tabular-nums">{mem} MB</td>
                          <td className="px-4 py-3">
                            {isExpanded ? (
                              <div className="flex items-center gap-1">
                                <button type="button" onClick={saveLangEdit}
                                  className="p-1 rounded text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors" title="Save">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                                </button>
                                <button type="button" onClick={() => setExpandedLang(null)}
                                  className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors" title="Cancel">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                              </div>
                            ) : (
                              <button type="button" onClick={() => openLangEdit(lang)}
                                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                              </button>
                            )}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={lang.id + '_edit'} className="border-b border-slate-200">
                            <td colSpan={5} className="px-6 py-5 bg-slate-50/70">
                              <div className="flex flex-col gap-5 max-w-2xl">
                                <div className="grid grid-cols-2 gap-8">
                                  <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                                      Time Limit — <span className="text-emerald-600 font-bold">{langEdit.timeLimit}s</span>
                                    </p>
                                    <RangeSlider value={langEdit.timeLimit} onChange={v => setLangEdit(e => ({ ...e, timeLimit: v }))}
                                      min={1} max={20} step={1} marks={[1, 5, 10, 15, 20]} />
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                                      Memory Limit — <span className="text-emerald-600 font-bold">{langEdit.memLimit} MB</span>
                                    </p>
                                    <RangeSlider value={langEdit.memLimit} onChange={v => setLangEdit(e => ({ ...e, memLimit: v }))}
                                      min={128} max={1024} step={50} marks={[128, 256, 512, 768, 1024]} />
                                  </div>
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-slate-600 mb-2">Code Editor Templates</p>
                                  <div className="border border-slate-200 rounded overflow-hidden">
                                    <StubSection label="Head" value={langEditStub.head}
                                      onChange={v => setLangEditStub(s => ({ ...s, head: v }))} startLine={1} />
                                    <StubSection label="Body" value={langEditStub.body}
                                      onChange={v => setLangEditStub(s => ({ ...s, body: v }))}
                                      startLine={1 + (langEditStub.head || '').split('\n').length} />
                                    <StubSection label="Tail" value={langEditStub.tail}
                                      onChange={v => setLangEditStub(s => ({ ...s, tail: v }))}
                                      startLine={1 + (langEditStub.head || '').split('\n').length + (langEditStub.body || '').split('\n').length} />
                                    <div className="px-4 py-1.5 bg-slate-100 border-t border-slate-200 text-right text-xs text-slate-400">
                                      Line: 1 &nbsp; Col: 1
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── SETTINGS ── */}
        {tab === 'Settings' && (
          <div className="max-w-3xl px-8 py-6">
            <p className="text-sm text-slate-400 italic mb-4">Set various challenge flags and parameters.</p>

            <SettingRow label="Enable Precision Check">
              <input type="checkbox" checked={problem.enablePrecisionCheck}
                onChange={e => set('enablePrecisionCheck', e.target.checked)}
                className="w-4 h-4 accent-emerald-600 cursor-pointer" />
            </SettingRow>

            <SettingRow label="Precision Check"
              desc="There should be at max one number per line in output file and this can be a floating point value.">
              <input className="px-3 py-1.5 text-sm border border-slate-200 rounded w-36 focus:outline-none focus:border-slate-400 disabled:opacity-50"
                value={problem.precisionCheck}
                onChange={e => set('precisionCheck', e.target.value)}
                disabled={!problem.enablePrecisionCheck}
                placeholder="1e100" />
            </SettingRow>

            <SettingRow label="Disable Compile & Test" desc="Compile and test button will not be shown">
              <input type="checkbox" checked={problem.disableCompileTest}
                onChange={e => set('disableCompileTest', e.target.checked)}
                className="w-4 h-4 accent-emerald-600 cursor-pointer" />
            </SettingRow>

            <SettingRow label="Disable Custom Testcase" desc="Disable support for user added testcase">
              <input type="checkbox" checked={problem.disableCustomTestcase}
                onChange={e => set('disableCustomTestcase', e.target.checked)}
                className="w-4 h-4 accent-emerald-600 cursor-pointer" />
            </SettingRow>

            <SettingRow label="Disable Submissions" desc="Don't accept any user submissions for this challenge">
              <input type="checkbox" checked={problem.disableSubmissions}
                onChange={e => set('disableSubmissions', e.target.checked)}
                className="w-4 h-4 accent-emerald-600 cursor-pointer" />
            </SettingRow>

            <SettingRow label="Public Testcase" desc="Make testcases public after the contest ends">
              <input type="checkbox" checked={problem.publicTestcase}
                onChange={e => set('publicTestcase', e.target.checked)}
                className="w-4 h-4 accent-emerald-600 cursor-pointer" />
            </SettingRow>

            <SettingRow label="Public Solutions" desc="Make solutions public after the contest ends">
              <input type="checkbox" checked={problem.publicSolutions}
                onChange={e => set('publicSolutions', e.target.checked)}
                className="w-4 h-4 accent-emerald-600 cursor-pointer" />
            </SettingRow>

            <SettingRow label="Restricted Forum"
              desc="Participants can post questions but can't post answers. Only contest moderators will have permission to post answers.">
              <input type="checkbox" checked={problem.restrictedForum}
                onChange={e => set('restrictedForum', e.target.checked)}
                className="w-4 h-4 accent-emerald-600 cursor-pointer" />
            </SettingRow>
          </div>
        )}

        {/* ── EDITORIAL ── */}
        {tab === 'Editorial' && (
          <div className="max-w-4xl px-8 py-2">
            <FormRow label="Required Knowledge">
              <input className={inputCls} value={problem.requiredKnowledge}
                onChange={e => set('requiredKnowledge', e.target.value)} />
            </FormRow>

            <FormRow label="Time Complexity">
              <input className={inputCls} value={problem.timeComplexity}
                onChange={e => set('timeComplexity', e.target.value)} />
            </FormRow>

            <FormRow label="Editorialist">
              <input className={`${inputCls} font-mono placeholder:font-sans`} value={problem.editorialist}
                onChange={e => set('editorialist', e.target.value)}
                placeholder="Enter a username" />
            </FormRow>

            <FormRow label="Partial Editorial (Only Hints)" hint="Doesn't contain the complete code.">
              <input type="checkbox" checked={problem.partialEditorial}
                onChange={e => set('partialEditorial', e.target.checked)}
                className="w-4 h-4 accent-emerald-600 cursor-pointer mt-1" />
            </FormRow>

            <FormRow label="Approach">
              <RichTextArea value={problem.approach} onChange={e => set('approach', e.target.value)}
                rows={6} placeholder="" />
            </FormRow>

            <FormRow label="Problem Setter">
              <input className={`${inputCls} font-mono placeholder:font-sans`} value={problem.problemSetter}
                onChange={e => set('problemSetter', e.target.value)}
                placeholder="Enter a username" />
            </FormRow>

            <FormRow label="Setter's Code">
              <RichTextArea value={problem.setterCode} onChange={e => set('setterCode', e.target.value)}
                rows={6} placeholder="" />
            </FormRow>

            <FormRow label="Problem Tester">
              <input className={`${inputCls} font-mono placeholder:font-sans`} value={problem.problemTester}
                onChange={e => set('problemTester', e.target.value)}
                placeholder="Enter a username" />
            </FormRow>

            <FormRow label="Tester's Code">
              <RichTextArea value={problem.testerCode} onChange={e => set('testerCode', e.target.value)}
                rows={6} placeholder="" />
            </FormRow>
          </div>
        )}

        {/* ── CUSTOM CHECKER ── */}
        {tab === 'Custom Checker' && (
          <div className="max-w-4xl px-8 py-2">
            <p className="text-sm text-slate-400 italic py-4 border-b border-slate-100">Use a custom checker when the problem has multiple valid outputs.</p>
            <FormRow label="Multiple Solutions" hint="Enable if more than one valid output exists">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => set('multipleSolution', !problem.multipleSolution)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${problem.multipleSolution ? 'bg-slate-900' : 'bg-slate-200'}`}>
                  <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${problem.multipleSolution ? 'translate-x-5' : ''}`} />
                </button>
                <span className="text-sm text-slate-600">{problem.multipleSolution ? 'Enabled' : 'Disabled'}</span>
              </div>
            </FormRow>
            <FormRow label="Checker Code" hint="C++ program — exits 0 if correct, non-zero if wrong">
              <div className={!problem.multipleSolution ? 'opacity-40 pointer-events-none' : ''}>
                <div className="border border-slate-200 rounded-xl overflow-hidden focus-within:border-slate-400">
                  <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 border-b border-slate-700">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="ml-2 text-xs font-mono text-slate-400">checker.cpp</span>
                  </div>
                  <textarea value={problem.validatorCode} onChange={e => set('validatorCode', e.target.value)}
                    rows={14} className="w-full p-4 text-sm font-mono text-slate-100 bg-slate-900 resize-y focus:outline-none"
                    placeholder={`#include <iostream>\nusing namespace std;\n\nint main() {\n    // Read input, then user output\n    // Return 0 if correct, non-zero if wrong\n    int a, b, out;\n    cin >> a >> b >> out;\n    return (abs(a - b) == out) ? 0 : 1;\n}`}
                    spellCheck={false} />
                </div>
              </div>
            </FormRow>
          </div>
        )}

      </div>

      {/* Sticky bottom bar */}
      <div className="sticky bottom-0 z-10 bg-white border-t border-slate-200 flex items-center justify-end gap-3 px-8 py-3 shrink-0">
        <button type="button" onClick={() => navigate(backTo)}
          className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
          Cancel
        </button>
        <button type="button" onClick={() => {}}
          className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
          Preview Challenge
        </button>
        <button type="button" onClick={handleSave}
          className="px-5 py-2 text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg">
          Save Problem
        </button>
      </div>

      {/* ── ADD TEST CASE MODAL ── */}
      {showTcModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 pb-6 px-4 bg-black/40 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">Add Test Case</h2>
              <button onClick={closeTcModal} className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-6 py-5 flex flex-col gap-5">
              <div className="flex items-end gap-6 flex-wrap">
                <div>
                  <label className="flex items-center text-sm font-medium text-slate-700 mb-1.5">Tag<TipIcon /></label>
                  <input className="px-3 py-2 text-sm border border-slate-200 rounded w-36 focus:outline-none focus:border-slate-400"
                    value={tcForm.tag} onChange={e => setTc('tag', e.target.value)} />
                </div>
                <div>
                  <label className="flex items-center text-sm font-medium text-slate-700 mb-1.5">Strength<TipIcon /></label>
                  <input type="number" min={0}
                    className="px-3 py-2 text-sm border border-slate-200 rounded w-20 focus:outline-none focus:border-slate-400 text-center"
                    value={tcForm.strength} onChange={e => setTc('strength', Number(e.target.value))} />
                </div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer pb-2">
                  Sample<TipIcon />
                  <input type="checkbox" checked={tcForm.isSample}
                    onChange={e => setTcForm(f => ({ ...f, isSample: e.target.checked, strength: e.target.checked ? 0 : 10 }))}
                    className="w-4 h-4 accent-blue-600 cursor-pointer" />
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer pb-2">
                  Additional<TipIcon />
                  <input type="checkbox" checked={tcForm.isAdditional} onChange={e => setTc('isAdditional', e.target.checked)}
                    className="w-4 h-4 accent-blue-600 cursor-pointer" />
                </label>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center text-sm font-medium text-slate-700">Input<TipIcon /></label>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <label className="flex items-center gap-1.5 cursor-pointer">editor: <input type="radio" name="tcInputMode" checked={tcForm.inputMode === 'editor'} onChange={() => setTc('inputMode', 'editor')} className="accent-blue-600" /></label>
                    <label className="flex items-center gap-1.5 cursor-pointer">upload: <input type="radio" name="tcInputMode" checked={tcForm.inputMode === 'upload'} onChange={() => setTc('inputMode', 'upload')} className="accent-blue-600" /></label>
                  </div>
                </div>
                <CodeTextarea value={tcForm.input} onChange={e => setTc('input', e.target.value)} />
                <p className="text-xs text-slate-400 mt-1">Size: {new Blob([tcForm.input]).size} B</p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center text-sm font-medium text-slate-700">Output<TipIcon /></label>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <label className="flex items-center gap-1.5 cursor-pointer">editor: <input type="radio" name="tcOutputMode" checked={tcForm.outputMode === 'editor'} onChange={() => setTc('outputMode', 'editor')} className="accent-blue-600" /></label>
                    <label className="flex items-center gap-1.5 cursor-pointer">upload: <input type="radio" name="tcOutputMode" checked={tcForm.outputMode === 'upload'} onChange={() => setTc('outputMode', 'upload')} className="accent-blue-600" /></label>
                  </div>
                </div>
                <CodeTextarea value={tcForm.output} onChange={e => setTc('output', e.target.value)} />
                <p className="text-xs text-slate-400 mt-1">Size: {new Blob([tcForm.output]).size} B</p>
              </div>
              {tcForm.isSample && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Explanation</label>
                  <RichTextArea value={tcForm.explanation} onChange={e => setTc('explanation', e.target.value)} rows={4} placeholder="Explain the sample input/output..." />
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-center">
              <button onClick={saveTestCase}
                className="px-10 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm rounded-lg transition-colors">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
