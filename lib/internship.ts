import { call } from './api'

export interface InternshipApplicationRow {
  id: string
  userId: number
  fullName: string
  email: string
  phone: string
  college: string
  branch: string
  graduationYear: number
  cgpa?: string
  resumeUrl: string
  githubUrl?: string
  linkedinUrl?: string
  portfolioUrl?: string
  rolePreference?: string
  availability?: string
  locationPref?: string
  note?: string
  submittedAt: string
  updatedAt: string
}

export function listInternshipApplications() {
  return call<InternshipApplicationRow[]>('GET', '/api/admin/internship/applications')
}

const COLUMNS: { key: keyof InternshipApplicationRow; label: string }[] = [
  { key: 'fullName', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'college', label: 'College' },
  { key: 'branch', label: 'Branch' },
  { key: 'graduationYear', label: 'Graduation year' },
  { key: 'cgpa', label: 'CGPA' },
  { key: 'resumeUrl', label: 'Resume' },
  { key: 'githubUrl', label: 'GitHub' },
  { key: 'linkedinUrl', label: 'LinkedIn' },
  { key: 'portfolioUrl', label: 'Portfolio' },
  { key: 'rolePreference', label: 'Role wanted' },
  { key: 'availability', label: 'Availability' },
  { key: 'locationPref', label: 'Location' },
  { key: 'note', label: 'Note' },
  { key: 'userId', label: 'User ID' },
  { key: 'submittedAt', label: 'Submitted at' },
]

// a leading =, +, - or @ makes a spreadsheet treat the cell as a formula, so a
// pasted value could execute on open. prefixing a quote keeps it text
function csvCell(value: unknown): string {
  const raw = value === undefined || value === null ? '' : String(value)
  const guarded = /^[=+\-@]/.test(raw) ? `'${raw}` : raw
  return `"${guarded.replace(/"/g, '""')}"`
}

export function applicationsToCsv(rows: InternshipApplicationRow[]): string {
  const header = COLUMNS.map(c => csvCell(c.label)).join(',')
  const body = rows.map(row => COLUMNS.map(c => csvCell(row[c.key])).join(','))
  return [header, ...body].join('\r\n')
}

export function downloadApplicationsCsv(rows: InternshipApplicationRow[]) {
  const stamp = new Date().toISOString().slice(0, 10)
  const blob = new Blob(['\uFEFF' + applicationsToCsv(rows)], {
    type: 'text/csv;charset=utf-8;',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `internship-applications-${stamp}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
