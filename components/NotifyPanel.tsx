'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  AUDIENCE_PROBLEM,
  AUDIENCE_WEEK,
  listNotifications,
  sendNotification,
  type AdminNotification,
} from '@/lib/notifications'
import Toast, { type ToastState } from '@/components/Toast'
import type { Problem } from '@/lib/types'

const inputCls = 'w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-800 placeholder:text-slate-400'

export default function NotifyPanel({
  weekId,
  problems,
}: {
  weekId: string
  problems: Problem[]
}) {
  const [audience, setAudience] = useState(AUDIENCE_WEEK)
  const [problemId, setProblemId] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)

  const [history, setHistory] = useState<AdminNotification[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setHistory(await listNotifications(weekId))
    } catch {
      setHistory([])
    } finally {
      setLoading(false)
    }
  }, [weekId])

  useEffect(() => { load() }, [load])

  const needsProblem = audience === AUDIENCE_PROBLEM
  const ready = subject.trim() !== '' && message.trim() !== '' && (!needsProblem || problemId !== '')

  async function handleSend() {
    if (!ready || sending) return
    setSending(true)
    try {
      const sent = await sendNotification(weekId, {
        audience,
        problemId: needsProblem ? problemId : undefined,
        subject,
        message,
      })
      setToast({
        message: `Sent to ${sent.recipient_count} ${sent.recipient_count === 1 ? 'participant' : 'participants'}`,
        kind: 'success',
      })
      setSubject('')
      setMessage('')
      await load()
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : 'Could not send that.', kind: 'error' })
    } finally {
      setSending(false)
    }
  }

  function audienceLabel(n: AdminNotification) {
    if (n.audience !== AUDIENCE_PROBLEM) return 'Everyone who submitted'
    const problem = problems.find(p => String(p.id) === n.problem_id)
    return `Submitted ${problem?.name || 'a problem'}`
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Notify Your Participants</h2>
        <p className="text-sm text-slate-500 mt-1 mb-5">
          The message pops up on their screen the next time they have the site open.
        </p>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Recipients
            </label>
            <select
              value={audience}
              onChange={e => setAudience(e.target.value)}
              className={inputCls}
            >
              <option value={AUDIENCE_WEEK}>Everyone who submitted this week</option>
              <option value={AUDIENCE_PROBLEM}>Everyone who attempted one problem</option>
            </select>
          </div>

          {needsProblem && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Problem
              </label>
              <select
                value={problemId}
                onChange={e => setProblemId(e.target.value)}
                className={inputCls}
              >
                <option value="">Pick a problem</option>
                {problems.map(p => (
                  <option key={p.id} value={String(p.id)}>{p.name}</option>
                ))}
              </select>
              {problems.length === 0 && (
                <p className="text-xs text-slate-400 mt-1">This week has no problems yet.</p>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Subject
            </label>
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Test case 3 has been fixed"
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Message
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={6}
              placeholder="The expected output was wrong and has been corrected. Please resubmit and your solution will be judged again."
              className={`${inputCls} resize-y`}
            />
          </div>

          <button
            onClick={handleSend}
            disabled={!ready || sending}
            className="self-start px-5 py-2.5 text-sm font-semibold bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg"
          >
            {sending ? 'Sending...' : 'Send notification'}
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-slate-900">Notification History</h2>
        <p className="text-sm text-slate-500 mt-1 mb-5">Everything already sent for this week.</p>

        {loading ? (
          <p className="text-sm text-slate-400">Loading history...</p>
        ) : history.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
            <p className="text-sm font-semibold text-slate-600">Nothing sent yet</p>
            <p className="text-xs">Announcements you send will be listed here</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {history.map(n => (
              <div key={n.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4">
                  <p className="font-bold text-slate-900">{n.subject}</p>
                  <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{n.message}</p>
                </div>
                <div className="px-5 py-3 bg-slate-50/70 border-t border-slate-100 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="text-xs text-slate-500">
                    {new Date(n.created_at).toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-500">{audienceLabel(n)}</span>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200/60 px-2 py-0.5 rounded-full">
                    {n.recipient_count} sent
                  </span>
                  {n.created_by_email && (
                    <span className="text-xs text-slate-400 ml-auto">{n.created_by_email}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </div>
  )
}
