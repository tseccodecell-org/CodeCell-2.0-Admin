import jsPDF from 'jspdf'

export const INK = [15, 23, 42] as [number, number, number]
export const MUTED = [100, 116, 139] as [number, number, number]
export const FAINT = [148, 163, 184] as [number, number, number]
export const RULE = [226, 232, 240] as [number, number, number]
export const BAND = [248, 250, 252] as [number, number, number]

export const GOOD = [16, 185, 129] as [number, number, number]
export const WARN = [245, 158, 11] as [number, number, number]
export const BAD = [244, 63, 94] as [number, number, number]

export const MARGIN = 48
export const PAGE_W = 595.28
export const PAGE_H = 841.89
export const CONTENT_W = PAGE_W - MARGIN * 2

export function newDoc() {
  return new jsPDF({ unit: 'pt', format: 'a4', compress: true })
}

export function setColor(doc: jsPDF, rgb: [number, number, number]) {
  doc.setTextColor(rgb[0], rgb[1], rgb[2])
}

// every page gets the same footer, added at the end once the count is known
export function paginate(doc: jsPDF, subtitle: string) {
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setDrawColor(RULE[0], RULE[1], RULE[2])
    doc.setLineWidth(0.5)
    doc.line(MARGIN, PAGE_H - 38, PAGE_W - MARGIN, PAGE_H - 38)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    setColor(doc, FAINT)
    doc.text(subtitle, MARGIN, PAGE_H - 24)
    doc.text(`${i} of ${pages}`, PAGE_W - MARGIN, PAGE_H - 24, { align: 'right' })
  }
}

export function coverHeading(doc: jsPDF, title: string, subtitle: string) {
  doc.setFillColor(INK[0], INK[1], INK[2])
  doc.rect(0, 0, PAGE_W, 132, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(255, 255, 255)
  doc.text(title, MARGIN, 62)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(203, 213, 225)
  doc.text(subtitle, MARGIN, 84)

  doc.setFontSize(8)
  doc.setTextColor(148, 163, 184)
  doc.text(`Generated ${new Date().toLocaleString()}`, MARGIN, 106)

  return 164
}

export function sectionTitle(doc: jsPDF, text: string, y: number) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  setColor(doc, INK)
  doc.text(text, MARGIN, y)
  doc.setDrawColor(RULE[0], RULE[1], RULE[2])
  doc.setLineWidth(0.5)
  doc.line(MARGIN, y + 7, PAGE_W - MARGIN, y + 7)
  return y + 26
}

// a row of boxed figures, the headline numbers of a report
export function statRow(
  doc: jsPDF,
  stats: { label: string; value: string; tone?: [number, number, number] }[],
  y: number
) {
  const gap = 10
  const boxW = (CONTENT_W - gap * (stats.length - 1)) / stats.length
  const boxH = 52

  stats.forEach((s, i) => {
    const x = MARGIN + i * (boxW + gap)
    doc.setFillColor(BAND[0], BAND[1], BAND[2])
    doc.setDrawColor(RULE[0], RULE[1], RULE[2])
    doc.roundedRect(x, y, boxW, boxH, 4, 4, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(15)
    setColor(doc, s.tone ?? INK)
    doc.text(s.value, x + 11, y + 25)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    setColor(doc, MUTED)
    doc.text(s.label.toUpperCase(), x + 11, y + 40)
  })

  return y + boxH + 22
}

// breaks a page when the next block would not fit
export function ensureRoom(doc: jsPDF, y: number, needed: number) {
  if (y + needed > PAGE_H - 60) {
    doc.addPage()
    return MARGIN + 12
  }
  return y
}

export function paragraph(doc: jsPDF, text: string, y: number, size = 9) {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(size)
  setColor(doc, INK)
  const lines = doc.splitTextToSize(text, CONTENT_W) as string[]

  let cursor = y
  for (const line of lines) {
    cursor = ensureRoom(doc, cursor, 14)
    doc.text(line, MARGIN, cursor)
    cursor += size + 4
  }
  return cursor
}

export function percent(value: number) {
  return `${Math.round((value ?? 0) * 100)}%`
}

// registration leaves username blank for some accounts, so fall back to the
// part of their email before the @ rather than printing nothing
export function displayName(user: { username?: string; email?: string; name?: string }) {
  const username = (user.username || '').trim()
  if (username) return username
  const email = (user.email || '').trim()
  if (email.includes('@')) return email.split('@')[0]
  return (user.name || '').trim() || 'unknown'
}
