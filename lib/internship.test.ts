import { describe, expect, it } from 'vitest'
import { applicationsToCsv, type InternshipApplicationRow } from './internship'

function row(overrides: Partial<InternshipApplicationRow> = {}): InternshipApplicationRow {
  return {
    id: 'app-1',
    userId: 42,
    fullName: 'Asha Menon',
    email: 'asha@example.com',
    phone: '9876543210',
    college: 'TSEC',
    branch: 'Computer Engineering',
    graduationYear: 2027,
    resumeUrl: 'https://drive.google.com/file/d/abc/view',
    submittedAt: '2026-09-17T10:00:00Z',
    updatedAt: '2026-09-17T10:00:00Z',
    ...overrides,
  }
}

describe('applications csv', () => {
  it('writes a header and one line per candidate', () => {
    const csv = applicationsToCsv([row(), row({ id: 'app-2', fullName: 'Rohit Nair' })])
    const lines = csv.split('\r\n')

    expect(lines).toHaveLength(3)
    expect(lines[0]).toContain('"Name"')
    expect(lines[1]).toContain('"Asha Menon"')
    expect(lines[2]).toContain('"Rohit Nair"')
  })

  it('keeps a comma or a quote inside a field from breaking the row', () => {
    const csv = applicationsToCsv([row({ note: 'Built a parser, a "fast" one' })])

    expect(csv).toContain('"Built a parser, a ""fast"" one"')
    expect(csv.split('\r\n')).toHaveLength(2)
  })

  it('stops a spreadsheet treating a pasted value as a formula', () => {
    const csv = applicationsToCsv([row({ fullName: '=HYPERLINK("http://evil","click")' })])

    expect(csv).toContain(`"'=HYPERLINK`)
  })

  it('writes an empty cell rather than undefined for a field nobody filled', () => {
    const csv = applicationsToCsv([row({ githubUrl: undefined })])

    expect(csv).not.toContain('undefined')
  })
})
