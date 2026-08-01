'use client'

import { Fragment, useEffect, useRef, useState } from 'react'
import type { ChangeEvent, ReactNode } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { useData } from '@/context/DataContext'
import Toast, { type ToastState } from '@/components/Toast'
import type { CodeStub, LanguageSetting, ProblemFormData, TestCase } from '@/lib/types'

// backend language ids -> editor ids (see DataContext LANG_MAP for the reverse)
const LANG_FROM_BACKEND: Record<string, string> = { CPP: 'CPP', JAVA: 'JAVA', PYTHON: 'PYTHON3' }

type Tab = 'Details' | 'Test Cases' | 'Languages' | 'Custom Checker' | 'Editorial'

const TABS: Tab[] = ['Details', 'Test Cases', 'Languages', 'Custom Checker', 'Editorial']

interface LanguageOption {
  id: string
  label: string
  defaultTime: number
  defaultMem: number
}

// only the languages the judge supports right now — more get added when the judge supports them
const ALL_LANGUAGES: LanguageOption[] = [
  { id: 'CPP',     label: 'C++',      defaultTime: 2, defaultMem: 256 },
  { id: 'JAVA',    label: 'Java',     defaultTime: 4, defaultMem: 512 },
  { id: 'PYTHON3', label: 'Python 3', defaultTime: 5, defaultMem: 256 },
]

const DEFAULT_STUBS: Record<string, CodeStub> = {
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
}

const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-800 placeholder:text-slate-400'
const selectCls = 'px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-800 bg-white'

const emptyProblem: ProblemFormData = {
  name: '', difficulty: 'Medium',
  description: '', problemStatement: '', inputFormat: '', outputFormat: '', constraints: '',
  testCases: [],
  languages: ['CPP', 'JAVA', 'PYTHON3'],
  languageSettings: {},
  codeStubs: {},
  basePoints: 100,
  multipleSolution: false, editorial: '', validatorCode: '',
}

interface TcFormData {
  input: string
  output: string
  explanation: string
  isSample: boolean
}

const emptyTcForm: TcFormData = { input: '', output: '', explanation: '', isSample: false }

/* ── Small components ─────────────────────────────────── */
function TipIcon() {
  return <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-slate-300 text-slate-600 text-[9px] font-black cursor-help ml-1 leading-none select-none">?</span>
}

function LockIcon() {
  return (
    <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  )
}

interface ToolbarActions {
  bold: () => void
  italic: () => void
  numberedList: () => void
  bulletList: () => void
  link: () => void
  code: () => void
  image: () => void
}

interface ToolbarProps {
  actions: ToolbarActions
  preview: boolean
  onTogglePreview: () => void
  uploading: boolean
}

function Toolbar({ actions, preview, onTogglePreview, uploading }: ToolbarProps) {
  const buttons = [
    { icon: <strong>B</strong>, title: 'Bold', action: actions.bold },
    { icon: <em>i</em>, title: 'Italic', action: actions.italic },
    { icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>, title: 'Numbered list', action: actions.numberedList },
    { icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>, title: 'Bullet list', action: actions.bulletList },
    { icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>, title: 'Insert image', action: actions.image },
    { icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>, title: 'Link', action: actions.link },
    { icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>, title: 'Code', action: actions.code },
  ]
  return (
    <div className="flex items-center gap-0.5 px-3 py-2 border-b border-slate-200 bg-slate-50/80">
      {buttons.map((b, i) => (
        <button key={i} type="button" title={b.title} onMouseDown={e => e.preventDefault()} onClick={b.action}
          disabled={preview || (b.title === 'Insert image' && uploading)}
          className="p-1.5 rounded text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors text-sm leading-none disabled:opacity-40 disabled:pointer-events-none">
          {b.icon}
        </button>
      ))}
      {uploading && <span className="text-xs text-slate-400 ml-1">uploading…</span>}
      <button type="button" onClick={onTogglePreview}
        className={`ml-auto text-xs font-medium border px-2.5 py-1 rounded transition-colors ${preview ? 'bg-slate-900 text-white border-slate-900' : 'text-slate-500 border-slate-300 hover:bg-slate-100'}`}>
        {preview ? 'Edit' : 'Preview'}
      </button>
    </div>
  )
}

interface RichTextAreaProps {
  value: string
  onChange: (e: { target: { value: string } }) => void
  rows?: number
  placeholder?: string
}

function RichTextArea({ value, onChange, rows = 5, placeholder }: RichTextAreaProps) {
  const taRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState(false)
  const [uploading, setUploading] = useState(false)

  const apply = (next: string, selStart: number, selEnd: number) => {
    onChange({ target: { value: next } })
    requestAnimationFrame(() => {
      const ta = taRef.current
      if (ta) { ta.focus(); ta.setSelectionRange(selStart, selEnd) }
    })
  }

  const selection = (): [number, number] => {
    const ta = taRef.current
    return ta ? [ta.selectionStart, ta.selectionEnd] : [value.length, value.length]
  }

  const wrap = (before: string, after: string = before) => {
    const [start, end] = selection()
    const selected = value.slice(start, end)
    apply(value.slice(0, start) + before + selected + after + value.slice(end),
      start + before.length, end + before.length)
  }

  const prefixLines = (numbered: boolean) => {
    const [start, end] = selection()
    const lineStart = value.lastIndexOf('\n', start - 1) + 1
    const block = value.slice(lineStart, end) || ''
    const prefixed = block.split('\n')
      .map((line, i) => (numbered ? `${i + 1}. ` : '- ') + line)
      .join('\n')
    apply(value.slice(0, lineStart) + prefixed + value.slice(end),
      lineStart, lineStart + prefixed.length)
  }

  const insertLink = () => {
    const [start, end] = selection()
    const text = value.slice(start, end) || 'link text'
    const next = value.slice(0, start) + `[${text}](url)` + value.slice(end)
    const urlStart = start + text.length + 3
    apply(next, urlStart, urlStart + 3)
  }

  const insertCode = () => {
    const [start, end] = selection()
    if (value.slice(start, end).includes('\n')) wrap('```\n', '\n```')
    else wrap('`')
  }

  const uploadImage = async (file: File | null | undefined) => {
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('image', file)
      const res = await fetch('/api/admin/uploads', { method: 'POST', body: fd, credentials: 'include' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || body.success === false) throw new Error(body.error?.message || res.status)
      const [start] = selection()
      const alt = file.name.replace(/\.[^.]+$/, '')
      const snippet = `![${alt}](${body.data.url})`
      const next = value.slice(0, start) + snippet + value.slice(start)
      apply(next, start + snippet.length, start + snippet.length)
    } catch (e) {
      alert(`Image upload failed: ${(e as Error).message}`)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const actions: ToolbarActions = {
    bold: () => wrap('**'),
    italic: () => wrap('*'),
    numberedList: () => prefixLines(true),
    bulletList: () => prefixLines(false),
    link: insertLink,
    code: insertCode,
    image: () => fileRef.current?.click(),
  }

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden focus-within:border-slate-400">
      <Toolbar actions={actions} preview={preview} onTogglePreview={() => setPreview(p => !p)} uploading={uploading} />
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={e => uploadImage(e.target.files?.[0])} />
      {preview ? (
        <div className="md-preview p-3 text-sm text-slate-800" style={{ minHeight: `${rows * 1.6}rem` }}>
          {value.trim()
            ? <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{value}</ReactMarkdown>
            : <p className="text-slate-400">Nothing to preview yet.</p>}
        </div>
      ) : (
        <textarea ref={taRef} value={value} onChange={onChange} rows={rows} placeholder={placeholder}
          className="w-full p-3 text-sm text-slate-800 font-mono resize-y focus:outline-none placeholder:text-slate-400 placeholder:font-sans" />
      )}
    </div>
  )
}

interface FormRowProps {
  label: string
  hint?: string
  children: ReactNode
}

function FormRow({ label, hint, children }: FormRowProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:gap-10 py-5 border-b border-slate-100 last:border-0">
      <div className="w-full sm:w-44 shrink-0 sm:pt-1">
        <p className="text-sm font-semibold text-slate-700">{label}</p>
        {hint && <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{hint}</p>}
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

interface CodeTextareaProps {
  value: string
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void
}

function CodeTextarea({ value, onChange }: CodeTextareaProps) {
  return (
    <div className="border border-slate-200 rounded bg-white overflow-hidden focus-within:border-slate-400 transition-all">
      <textarea value={value} onChange={onChange} rows={4}
        className="w-full py-2 px-3 text-sm font-mono text-slate-800 resize-y focus:outline-none" spellCheck={false} />
    </div>
  )
}

interface RangeSliderProps {
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step: number
  marks: number[]
}

/* ── Slider with labeled tick marks ───────────────────── */
function RangeSlider({ value, onChange, min, max, step, marks }: RangeSliderProps) {
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

interface StubSectionProps {
  label: string
  value: string
  onChange: (v: string) => void
  startLine: number
}

/* ── Code stub section (Head / Body / Tail) ───────────── */
function StubSection({ label, value, onChange, startLine }: StubSectionProps) {
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

interface ProblemEditorProps {
  type: 'week' | 'event'
  mode?: 'edit'
}

/* ── Main component ───────────────────────────────────── */
export default function ProblemEditor({ type, mode }: ProblemEditorProps) {
  const { weekId, eventId, problemId } = useParams<{ weekId: string; eventId: string; problemId: string }>()
  // week ids are uuid strings from the api; event ids are still numeric mock ids
  const parentId: string | number = type === 'week' ? weekId : Number(eventId)
  const isEdit = mode === 'edit'
  const router = useRouter()
  const {
    weeks, events, addProblem, addEventProblem,
    updateProblem, getTestCases, updateTestCase, deleteTestCase, getLanguageConfigs, getChecker,
  } = useData()

  const parent = type === 'week' ? weeks.find(w => w.id === parentId) : events.find(e => e.id === parentId)
  const backTo = type === 'week' ? `/challenges/${parentId}` : `/events/${parentId}`
  const existing = isEdit ? parent?.problems.find(p => p.id === problemId) : null

  const [tab, setTab] = useState<Tab>('Details')
  const [problem, setProblem] = useState<ProblemFormData>(emptyProblem)
  const [prefilled, setPrefilled] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [showTcModal, setShowTcModal] = useState(false)
  const [tcForm, setTcForm] = useState<TcFormData>(emptyTcForm)
  const [editingTcId, setEditingTcId] = useState<string | number | null>(null) // null = adding a new one
  const [expandedLang, setExpandedLang] = useState<string | null>(null)
  const [langEdit, setLangEdit] = useState<LanguageSetting>({ timeLimit: 2, memLimit: 256 })
  const [langEditStub, setLangEditStub] = useState<CodeStub>({ head: '', body: '', tail: '' })

  // test cases, languages and the checker all need a real problem id on the server,
  // so those tabs stay locked until the details have been saved once
  const effectiveId = isEdit ? problemId : savedId
  const isCreated = Boolean(effectiveId)

  // don't let a half-filled form disappear on an accidental reload / tab close
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  // edit mode: once the weeks list has loaded, prefill the form from the
  // problem's stored fields + its testcases and language configs from the api
  useEffect(() => {
    if (!isEdit || prefilled || !existing) return
    const current = existing
    async function prefill() {
      let testCases: TestCase[] = []
      let languages: string[] = ['CPP', 'JAVA', 'PYTHON3']
      const languageSettings: Record<string, LanguageSetting> = {}
      const codeStubs: Record<string, CodeStub> = {}
      try {
        const tcs = await getTestCases(problemId) as any[]
        testCases = tcs.map(tc => ({
          id: tc.id, input: tc.input, output: tc.expectedOutput, explanation: tc.explanation || '', isSample: tc.isSample,
          existing: true, // already in the db — deleting it calls the api directly
        }))
        const configs = await getLanguageConfigs(problemId)
        if (configs.length > 0) {
          languages = configs.filter(c => c.enabled).map(c => LANG_FROM_BACKEND[c.language]).filter((id): id is string => Boolean(id))
          for (const c of configs) {
            const id = LANG_FROM_BACKEND[c.language]
            if (!id) continue
            languageSettings[id] = { timeLimit: c.timeLimitMs / 1000, memLimit: c.memoryLimitMb }
            if (c.starterCode) codeStubs[id] = { head: '', body: c.starterCode, tail: '' }
          }
        }
      } catch {
        // form still opens with the details, just without testcases/configs
      }
      let validatorCode = ''
      try {
        const checker = await getChecker(problemId)
        if (checker.registered && checker.source) validatorCode = checker.source
      } catch {
        // judge not reachable, checker code just starts empty
      }
      setProblem({
        ...emptyProblem,
        name: current.name,
        difficulty: current.difficulty,
        problemStatement: current.problemStatement,
        inputFormat: current.inputFormat,
        outputFormat: current.outputFormat,
        constraints: current.constraints,
        basePoints: current.basePoints,
        editorial: current.editorial || '',
        multipleSolution: current.multipleSolution,
        validatorCode,
        testCases, languages, languageSettings, codeStubs,
      })
      setPrefilled(true)
    }
    prefill()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, prefilled, existing])

  const set = <K extends keyof ProblemFormData>(key: K, val: ProblemFormData[K]) => {
    setDirty(true)
    setProblem(p => ({ ...p, [key]: val }))
  }
  const setTc = <K extends keyof TcFormData>(key: K, val: TcFormData[K]) => setTcForm(f => ({ ...f, [key]: val }))

  // pull the testcases back from the server after a save so local rows pick up their
  // real db ids — without this a second save would post the same ones again as duplicates
  async function refreshTestCases(pid: string) {
    try {
      const tcs = await getTestCases(pid) as any[]
      setProblem(p => ({
        ...p,
        testCases: tcs.map(tc => ({
          id: tc.id, input: tc.input, output: tc.expectedOutput, explanation: tc.explanation || '', isSample: tc.isSample, existing: true,
        })),
      }))
    } catch {
      // keep whatever is on screen, the save itself already went through
    }
  }

  const slug = problem.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

  function openTcEdit(tc: TestCase) {
    setTcForm({ input: tc.input, output: tc.output, explanation: tc.explanation || '', isSample: tc.isSample })
    setEditingTcId(tc.id)
    setShowTcModal(true)
  }

  async function saveTestCase() {
    // note: empty input IS allowed — hello-world style problems read nothing
    if (editingTcId != null) {
      const tc = problem.testCases.find(t => t.id === editingTcId)
      // testcases already in the db get updated through the api right away
      if (tc?.existing && effectiveId) {
        try {
          await updateTestCase(effectiveId, editingTcId, tcForm)
          setToast({ message: 'Test case updated', kind: 'success' })
        } catch {
          return // api alert already shown, keep the modal open
        }
      } else {
        setDirty(true)
      }
      setProblem(p => ({
        ...p,
        testCases: p.testCases.map(t => t.id === editingTcId
          ? { ...t, input: tcForm.input, output: tcForm.output, explanation: tcForm.explanation, isSample: tcForm.isSample }
          : t),
      }))
    } else {
      setDirty(true)
      setProblem(p => ({ ...p, testCases: [...p.testCases, { ...tcForm, id: Date.now() }] }))
    }
    setTcForm(emptyTcForm)
    setEditingTcId(null)
    setShowTcModal(false)
  }

  async function removeTestCase(id: string | number) {
    const tc = problem.testCases.find(t => t.id === id)
    // testcases already in the db get deleted through the api right away
    if (tc?.existing && effectiveId) {
      if (!confirm('Delete this testcase from the problem?')) return
      try {
        await deleteTestCase(effectiveId, id)
        setToast({ message: 'Test case deleted', kind: 'success' })
      } catch {
        return // api alert already shown
      }
    } else {
      setDirty(true)
    }
    setProblem(p => ({ ...p, testCases: p.testCases.filter(t => t.id !== id) }))
  }

  function toggleLang(id: string) {
    set('languages', problem.languages.includes(id) ? problem.languages.filter(l => l !== id) : [...problem.languages, id])
  }

  function openLangEdit(lang: LanguageOption) {
    const saved = problem.languageSettings[lang.id] || ({} as Partial<LanguageSetting>)
    const stub = problem.codeStubs[lang.id] || DEFAULT_STUBS[lang.id] || ({} as Partial<CodeStub>)
    setExpandedLang(lang.id)
    setLangEdit({ timeLimit: saved.timeLimit ?? lang.defaultTime, memLimit: saved.memLimit ?? lang.defaultMem })
    setLangEditStub({ head: stub.head ?? '', body: stub.body ?? '', tail: stub.tail ?? '' })
  }

  function saveLangEdit() {
    if (!expandedLang) return
    set('languageSettings', { ...problem.languageSettings, [expandedLang]: langEdit })
    set('codeStubs', { ...problem.codeStubs, [expandedLang]: langEditStub })
    setExpandedLang(null)
  }

  function getLangDisplay(lang: LanguageOption) {
    const s = problem.languageSettings[lang.id]
    return { time: s?.timeLimit ?? lang.defaultTime, mem: s?.memLimit ?? lang.defaultMem }
  }

  // saving keeps you on the page — creating just unlocks the rest of the tabs.
  // closeAfter is for the explicit "Save & Close" action
  async function handleSave(closeAfter = false) {
    if (!problem.name.trim()) {
      setTab('Details')
      setToast({ message: 'Give the problem a name before saving', kind: 'error' })
      return
    }
    setSaving(true)
    try {
      if (type === 'event') {
        // events are still local mock data, there's no api to keep editing against
        addEventProblem(parentId as number, problem)
        router.push(backTo)
        return
      }

      if (effectiveId) {
        await updateProblem(effectiveId, problem)
        await refreshTestCases(effectiveId)
        setDirty(false)
        setToast({ message: 'Changes saved', kind: 'success' })
      } else {
        const newId = await addProblem(parentId as string, problem)
        setSavedId(newId)
        await refreshTestCases(newId)
        setDirty(false)
        setToast({ message: 'Problem created. Test cases, languages, checker and editorial are unlocked.', kind: 'success' })
        setTab('Test Cases')
      }

      if (closeAfter) router.push(backTo)
    } catch {
      // api alert already shown, stay on the page so nothing typed is lost
    } finally {
      setSaving(false)
    }
  }

  function handleLeave() {
    if (dirty && !confirm('You have unsaved changes. Leave without saving?')) return
    router.push(backTo)
  }

  function closeTcModal() { setShowTcModal(false); setTcForm(emptyTcForm); setEditingTcId(null) }

  if (!parent) return <div className="flex items-center justify-center h-full text-slate-400 text-sm">Parent not found.</div>

  return (
    <div className="flex flex-col min-h-full bg-white">
      <div className="h-auto sm:h-14 border-b border-slate-200 flex flex-wrap items-center px-4 sm:px-8 py-3 sm:py-0 gap-2 shrink-0">
        <Link href={backTo} className="text-sm text-slate-400 hover:text-slate-700 transition-colors">{parent.title}</Link>
        <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        <span className="text-sm font-semibold text-slate-900">{problem.name || 'New Problem'}</span>
        {!isCreated ? (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Draft</span>
        ) : dirty ? (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Unsaved</span>
        ) : (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Saved</span>
        )}
      </div>

      <div className="flex items-center border-b border-slate-200 px-4 sm:px-8 bg-white shrink-0 overflow-x-auto">
        {TABS.map(t => {
          const locked = !isCreated && t !== 'Details'
          return (
            <button key={t} onClick={() => { if (!locked) setTab(t) }} disabled={locked}
              title={locked ? 'Save the problem details first to unlock this' : undefined}
              className={`flex items-center gap-1.5 px-4 py-3.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                locked
                  ? 'border-transparent text-slate-300 cursor-not-allowed'
                  : tab === t
                    ? 'border-slate-900 text-slate-900 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              {t}
              {locked && <LockIcon />}
            </button>
          )
        })}
      </div>

      <div className="flex-1 overflow-auto">

        {/* ── DETAILS ── */}
        {tab === 'Details' && (
          <div className="max-w-4xl px-4 sm:px-8 py-2">
            {isCreated ? (
              <p className="text-sm text-slate-400 italic py-4 border-b border-slate-100">This is the basic information that describes your challenge.</p>
            ) : (
              <div className="flex items-start gap-3 my-4 px-4 py-3 bg-sky-50 border border-sky-200 rounded-lg">
                <svg className="w-5 h-5 shrink-0 text-sky-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-sky-900">Step 1 of 5: problem details</p>
                  <p className="text-xs text-sky-700 mt-0.5 leading-relaxed">
                    Save these details to create the problem. Test cases, languages, the custom checker and the editorial unlock straight after, and you stay on this page.
                  </p>
                </div>
              </div>
            )}
            <FormRow label="Challenge Difficulty">
              <select className={`${selectCls} w-48`} value={problem.difficulty} onChange={e => set('difficulty', e.target.value)}>
                <option>Easy</option><option>Medium</option><option>Hard</option>
              </select>
            </FormRow>
            <FormRow label="Base Points" hint="What the problem is worth before scoring adjusts for solve rate and time elapsed">
              <div className="w-32">
                <input type="number" min={1} className={inputCls} value={problem.basePoints}
                  onChange={e => set('basePoints', Number(e.target.value))} />
              </div>
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
          </div>
        )}

        {/* ── TEST CASES ── */}
        {tab === 'Test Cases' && (
          <div className="px-4 sm:px-8 py-5 flex flex-col gap-4">
            <p className="text-sm text-slate-500 italic">Add test cases to judge the correctness of a user&apos;s code.</p>
            {problem.testCases.length === 0 && (
              <div className="flex items-center gap-2 px-4 py-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700">
                <svg className="w-5 h-5 shrink-0 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                You do not have any test cases for this challenge. Add at least one test case.
              </div>
            )}
            <div className="flex items-center justify-end">
              <button type="button" onClick={() => setShowTcModal(true)}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                + Add Test Case
              </button>
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    {['Order', 'Input', 'Output', 'Sample'].map(col => (
                      <th key={col} className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">{col}<TipIcon /></th>
                    ))}
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {problem.testCases.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">No test cases have been added yet</td></tr>
                  ) : problem.testCases.map((tc, i) => (
                    <tr key={tc.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-slate-600 tabular-nums">{i + 1}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500 max-w-28 truncate">{tc.input.split('\n')[0] || '—'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500 max-w-28 truncate">{tc.output.split('\n')[0] || '—'}</td>
                      <td className="px-4 py-3"><input type="checkbox" checked={tc.isSample} readOnly className="accent-blue-600 cursor-default" /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => openTcEdit(tc)} title="Edit testcase"
                            className="text-slate-300 hover:text-slate-600 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button onClick={() => removeTestCase(tc.id)} title="Delete testcase"
                            className="text-slate-300 hover:text-rose-500 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        )}

        {/* ── LANGUAGES ── */}
        {tab === 'Languages' && (
          <div className="px-4 sm:px-8 py-6 flex flex-col gap-4">
            <p className="text-sm text-slate-500 italic">
              Refer to <span className="text-slate-600 cursor-pointer hover:underline">environment page</span> for available languages and libraries.
            </p>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-4 py-3 font-semibold text-slate-700 w-12 whitespace-nowrap">Language</th>
                    <th className="px-4 py-3 font-semibold text-slate-700 w-64"></th>
                    <th className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">Time Limit (seconds)</th>
                    <th className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">Memory Limit (MB)</th>
                    <th className="px-4 py-3 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {ALL_LANGUAGES.map(lang => {
                    const { time, mem } = getLangDisplay(lang)
                    const isSelected = problem.languages.includes(lang.id)
                    const isExpanded = expandedLang === lang.id
                    return (
                      <Fragment key={lang.id}>
                        <tr className={`border-b border-slate-100 ${isExpanded ? 'bg-slate-50' : 'hover:bg-slate-50'} transition-colors`}>
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
                          <tr className="border-b border-slate-200">
                            <td colSpan={5} className="px-4 sm:px-6 py-5 bg-slate-50/70">
                              <div className="flex flex-col gap-5 max-w-2xl">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
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
                                    {/* containers are capped at 512MB */}
                                    <RangeSlider value={langEdit.memLimit} onChange={v => setLangEdit(e => ({ ...e, memLimit: v }))}
                                      min={128} max={512} step={128} marks={[128, 256, 384, 512]} />
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
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        )}

        {/* ── CUSTOM CHECKER ── */}
        {tab === 'Custom Checker' && (
          <div className="max-w-4xl px-4 sm:px-8 py-2">
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
                <p className="text-xs text-slate-400 mt-2">Compiled and registered on the judge when you hit Save. Turning Multiple Solutions off removes the registered checker.</p>
              </div>
            </FormRow>
          </div>
        )}

        {tab === 'Editorial' && (
          <div className="max-w-4xl px-4 sm:px-8 py-2">
            <div className="flex items-start gap-3 my-4 px-4 py-3 bg-sky-50 border border-sky-200 rounded-lg">
              <svg className="w-5 h-5 shrink-0 text-sky-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-sky-900">Only visible to contestants after the week ends</p>
                <p className="text-xs text-sky-700 mt-0.5 leading-relaxed">
                  The server hides the editorial while the week is live, so you can write it as you build the problem. It appears on the problem page the moment the end time passes.
                </p>
              </div>
            </div>
            {!problem.editorial.trim() && (
              <div className="flex items-center gap-2 mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                <svg className="w-5 h-5 shrink-0 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                No editorial written yet. Contestants will see nothing here once the week ends.
              </div>
            )}
            <FormRow label="Editorial" hint="Markdown, KaTeX and images all work, same as the problem statement">
              <RichTextArea value={problem.editorial} onChange={e => set('editorial', e.target.value)} rows={16} placeholder="Explain the intended approach, the complexity and the traps." />
            </FormRow>
          </div>
        )}

      </div>

      {/* Sticky bottom bar */}
      <div className="sticky bottom-0 z-10 bg-white border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-8 py-3 shrink-0">
        <p className="text-xs text-slate-400">
          {saving ? 'Saving…'
            : !isCreated ? 'Not created yet'
            : dirty ? 'You have unsaved changes'
            : 'All changes saved'}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={handleLeave} disabled={saving}
            className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50">
            Cancel
          </button>
          {isCreated && (
            <button type="button" onClick={() => handleSave(true)} disabled={saving}
              className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50">
              Save &amp; Close
            </button>
          )}
          <button type="button" onClick={() => handleSave()} disabled={saving}
            className="px-5 py-2 text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
            {saving ? 'Saving…' : isCreated ? 'Save Changes' : 'Create Problem'}
          </button>
        </div>
      </div>

      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

      {/* ── ADD TEST CASE MODAL ── */}
      {showTcModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 pb-6 px-4 bg-black/40 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl border border-slate-200">
            <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">{editingTcId != null ? 'Edit Test Case' : 'Add Test Case'}</h2>
              <button onClick={closeTcModal} className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-4 sm:px-6 py-5 flex flex-col gap-5">
              <div>
                <label className="flex items-center text-sm font-medium text-slate-700 mb-2">Input<TipIcon /></label>
                <CodeTextarea value={tcForm.input} onChange={e => setTc('input', e.target.value)} />
                <p className="text-xs text-slate-400 mt-1">Size: {new Blob([tcForm.input]).size} B</p>
              </div>
              <div>
                <label className="flex items-center text-sm font-medium text-slate-700 mb-2">Output<TipIcon /></label>
                <CodeTextarea value={tcForm.output} onChange={e => setTc('output', e.target.value)} />
                <p className="text-xs text-slate-400 mt-1">Size: {new Blob([tcForm.output]).size} B</p>
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer w-fit">
                Sample<TipIcon />
                <input type="checkbox" checked={tcForm.isSample}
                  onChange={e => setTc('isSample', e.target.checked)}
                  className="w-4 h-4 accent-blue-600 cursor-pointer" />
              </label>

              {tcForm.isSample && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Explanation</label>
                  <textarea
                    value={tcForm.explanation}
                    onChange={e => setTc('explanation', e.target.value)}
                    rows={3}
                    placeholder="Why this input produces this output. Shown to participants under the sample."
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:border-slate-400 resize-y"
                  />
                  <p className="text-xs text-slate-400 mt-1">Only samples show an explanation.</p>
                </div>
              )}
            </div>
            <div className="px-4 sm:px-6 py-4 border-t border-slate-100 flex justify-center">
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
