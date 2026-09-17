'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  listInternshipApplications,
  downloadApplicationsCsv,
  type InternshipApplicationRow,
} from '@/lib/internship'

function ExternalLink({ href, label }: { href?: string; label: string }) {
  if (!href) return <span className="text-slate-300">not given</span>
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-slate-700 underline underline-offset-2 hover:text-slate-900"
    >
      {label}
    </a>
  )
}

function Detail({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
        {label}
      </dt>
      <dd className="text-xs text-slate-700 mt-0.5">{value?.trim() ? value : 'not given'}</dd>
    </div>
  )
}

export default function RecruitmentPage() {
  const [rows, setRows] = useState<InternshipApplicationRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let cancelled = false

    listInternshipApplications()
      .then(list => {
        if (!cancelled) setRows(list)
      })
      .catch(e => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Could not load applications.')
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    if (!rows) return []
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(r =>
      [r.fullName, r.email, r.college, r.branch, r.rolePreference]
        .filter(Boolean)
        .some(field => String(field).toLowerCase().includes(q))
    )
  }, [rows, query])

  return (
    <div className="p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Recruitment</h1>
          <p className="text-sm text-slate-500 mt-1">
            Internship applications from seated finalists. One entry per participant; a resubmission
            replaces the earlier one.
          </p>
        </div>

        <button
          onClick={() => downloadApplicationsCsv(filtered)}
          disabled={!rows || filtered.length === 0}
          className="px-3.5 py-2 text-xs font-bold rounded-lg bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Download spreadsheet
        </button>
      </div>

      {error && (
        <p role="alert" className="text-xs text-rose-600 mb-4">
          {error}
        </p>
      )}

      {rows === null && !error && <p className="text-sm text-slate-500">Loading applications</p>}

      {rows && rows.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
          <p className="text-sm font-bold text-slate-700">Nobody has applied yet</p>
          <p className="text-xs text-slate-500 mt-1.5">
            Applications appear here as seated finalists submit the form.
          </p>
        </div>
      )}

      {rows && rows.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <input
              aria-label="Search applications"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name, email, college, branch or role"
              className="flex-1 min-w-64 px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-700 placeholder:text-slate-400"
            />
            <span className="text-xs text-slate-500">
              {filtered.length} of {rows.length}
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {filtered.map(row => (
              <details
                key={row.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm"
              >
                <summary className="cursor-pointer px-5 py-4 flex flex-wrap items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="text-sm font-bold text-slate-900">{row.fullName}</span>
                    <span className="text-xs text-slate-500 ml-2">{row.email}</span>
                  </span>
                  <span className="text-xs text-slate-500">
                    {row.branch} · {row.college} · {row.graduationYear}
                  </span>
                </summary>

                <div className="border-t border-slate-100 px-5 py-4">
                  <dl className="grid gap-4 sm:grid-cols-3">
                    <Detail label="Phone" value={row.phone} />
                    <Detail label="CGPA" value={row.cgpa} />
                    <Detail label="Role wanted" value={row.rolePreference} />
                    <Detail label="Availability" value={row.availability} />
                    <Detail label="Location" value={row.locationPref} />
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                        Links
                      </dt>
                      <dd className="text-xs mt-0.5 flex flex-wrap gap-3">
                        <ExternalLink href={row.resumeUrl} label="Resume" />
                        <ExternalLink href={row.githubUrl} label="GitHub" />
                        <ExternalLink href={row.linkedinUrl} label="LinkedIn" />
                        <ExternalLink href={row.portfolioUrl} label="Portfolio" />
                      </dd>
                    </div>
                  </dl>

                  {row.note?.trim() && (
                    <div className="mt-4">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                        Note
                      </p>
                      <p className="text-xs text-slate-700 mt-1 whitespace-pre-wrap">{row.note}</p>
                    </div>
                  )}

                  <p className="text-[11px] text-slate-400 mt-4">
                    Submitted {new Date(row.submittedAt).toLocaleString()} · user #{row.userId}
                  </p>
                </div>
              </details>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
