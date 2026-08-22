import autoTable from 'jspdf-autotable'
import type jsPDF from 'jspdf'
import { CONTENT_W, MARGIN, PAGE_H, BOTTOM, SERIF, ensureRoom } from './theme'

export interface Column {
  header: string
  // share of the table width, normalised, so these are ratios not points
  width: number
  align?: 'left' | 'right'
}

// booktabs: a thick rule above the header, a thin one under it, a thick one
// under the last row. no vertical rules, no shading, no stripes.
export function table(
  doc: jsPDF,
  columns: Column[],
  rows: string[][],
  y: number,
  opts: { boldFirstRows?: number } = {}
) {
  const totalRatio = columns.reduce((s, c) => s + c.width, 0)
  const columnStyles: Record<number, { cellWidth: number; halign: 'left' | 'right' }> = {}

  columns.forEach((c, i) => {
    columnStyles[i] = {
      cellWidth: (c.width / totalRatio) * CONTENT_W,
      halign: c.align ?? 'left',
    }
  })

  const start = ensureRoom(doc, y, 60)

  autoTable(doc, {
    startY: start,
    head: [columns.map(c => c.header)],
    body: rows,
    theme: 'plain',
    margin: { left: MARGIN, right: MARGIN, bottom: PAGE_H - BOTTOM },
    tableWidth: CONTENT_W,
    styles: {
      font: SERIF,
      fontSize: 9.5,
      textColor: [0, 0, 0],
      cellPadding: { top: 4, bottom: 4, left: 3, right: 3 },
      lineWidth: 0,
      lineColor: [0, 0, 0],
      overflow: 'linebreak',
      valign: 'top',
    },
    headStyles: {
      font: SERIF,
      fontStyle: 'bold',
      fontSize: 9.5,
      textColor: [0, 0, 0],
      cellPadding: { top: 5, bottom: 5, left: 3, right: 3 },
      lineColor: [0, 0, 0],
      // the two rules that open the table, repeated on every page break
      lineWidth: { top: 1, bottom: 0.5, left: 0, right: 0 },
    },
    columnStyles,
    didParseCell: data => {
      if (opts.boldFirstRows && data.section === 'body' && data.row.index < opts.boldFirstRows) {
        data.cell.styles.fontStyle = 'bold'
      }
    },
  })

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY

  // closing rule under the last row
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(1)
  doc.line(MARGIN, finalY, MARGIN + CONTENT_W, finalY)

  return finalY + 22
}
