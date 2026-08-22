import jsPDF from 'jspdf'

// a plain paper look: serif face, black on white, rules only where a rule
// carries meaning. no fills, no stripes, no colour.
export const BLACK: [number, number, number] = [0, 0, 0]
export const GREY: [number, number, number] = [90, 90, 90]

export const SERIF = 'times'

export const MARGIN = 64
export const PAGE_W = 595.28
export const PAGE_H = 841.89
export const CONTENT_W = PAGE_W - MARGIN * 2
export const BOTTOM = PAGE_H - 64

export function newDoc() {
  const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true })
  doc.setFont(SERIF, 'normal')
  doc.setTextColor(0, 0, 0)
  return doc
}

// centred title block, the way a paper opens
export function titleBlock(doc: jsPDF, title: string, subtitle: string) {
  const centre = PAGE_W / 2

  doc.setFont(SERIF, 'bold')
  doc.setFontSize(17)
  doc.text(title, centre, MARGIN + 24, { align: 'center' })

  doc.setFont(SERIF, 'normal')
  doc.setFontSize(10.5)
  doc.text(subtitle, centre, MARGIN + 44, { align: 'center' })

  doc.setFontSize(9)
  doc.setTextColor(GREY[0], GREY[1], GREY[2])
  doc.text(new Date().toLocaleString(), centre, MARGIN + 60, { align: 'center' })
  doc.setTextColor(0, 0, 0)

  return MARGIN + 92
}

// numbered section headings, no rule under them
export function section(doc: jsPDF, n: number, text: string, y: number) {
  const cursor = ensureRoom(doc, y, 40)
  doc.setFont(SERIF, 'bold')
  doc.setFontSize(12)
  doc.text(`${n}  ${text}`, MARGIN, cursor)
  return cursor + 18
}

export function subsection(doc: jsPDF, text: string, y: number) {
  const cursor = ensureRoom(doc, y, 34)
  doc.setFont(SERIF, 'bold')
  doc.setFontSize(10.5)
  doc.text(text, MARGIN, cursor)
  return cursor + 15
}

export function ensureRoom(doc: jsPDF, y: number, needed: number) {
  if (y + needed > BOTTOM) {
    doc.addPage()
    return MARGIN
  }
  return y
}

export function paragraph(doc: jsPDF, text: string, y: number, size = 10) {
  doc.setFont(SERIF, 'normal')
  doc.setFontSize(size)
  const lines = doc.splitTextToSize(String(text ?? '').trim(), CONTENT_W) as string[]
  const lead = size + 3.5

  let cursor = y
  for (const line of lines) {
    cursor = ensureRoom(doc, cursor, lead)
    doc.text(line, MARGIN, cursor)
    cursor += lead
  }
  return cursor
}

// key: value pairs down the page, aligned on a fixed gutter
export function describe(doc: jsPDF, pairs: [string, string][], y: number) {
  const labelW = 168
  let cursor = y

  for (const [label, value] of pairs) {
    cursor = ensureRoom(doc, cursor, 16)
    doc.setFont(SERIF, 'normal')
    doc.setFontSize(10)
    doc.text(label, MARGIN, cursor)
    doc.setFont(SERIF, 'bold')
    doc.text(value, MARGIN + labelW, cursor)
    cursor += 15
  }
  return cursor + 6
}

export function percent(value: number) {
  return `${Math.round((value ?? 0) * 100)}%`
}

// registration leaves username blank on some accounts, so fall back to the part
// of the email before the @ rather than printing an empty cell
export function displayName(user: { username?: string; email?: string; name?: string }) {
  const username = (user.username || '').trim()
  if (username) return username
  const email = (user.email || '').trim()
  if (email.includes('@')) return email.split('@')[0]
  return (user.name || '').trim() || 'unknown'
}

export function footers(doc: jsPDF, note: string) {
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFont(SERIF, 'normal')
    doc.setFontSize(9)
    doc.setTextColor(GREY[0], GREY[1], GREY[2])
    doc.text(note, MARGIN, PAGE_H - 40)
    doc.text(String(i), PAGE_W - MARGIN, PAGE_H - 40, { align: 'right' })
    doc.setTextColor(0, 0, 0)
  }
}
