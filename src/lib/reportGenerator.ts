// reportGenerator.ts — TIFA writes structured PDF/Excel/Word from AI sections
// Each section type (heading, text, table, bar_chart, pie_chart, insight) is rendered
// programmatically with clean, professional layout. No screenshots.

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
export interface ReportSection {
  type: 'heading' | 'text' | 'table' | 'bar_chart' | 'pie_chart' | 'insight';
  text?: string;
  title?: string;
  headers?: string[];
  rows?: string[][];
  labels?: string[];
  values?: number[];
  unit?: string;
}

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const RED: [number, number, number]    = [220, 38, 38];
const DARK: [number, number, number]   = [30, 30, 30];
const MID: [number, number, number]    = [70, 70, 70];
const LIGHT: [number, number, number]  = [245, 245, 245];
const BORDER: [number, number, number] = [220, 220, 220];

const PALETTE: [number, number, number][] = [
  [220, 38, 38], [37, 99, 235], [245, 158, 11],
  [16, 185, 129], [139, 92, 246], [236, 72, 153],
  [6, 182, 212], [249, 115, 22], [132, 204, 22], [99, 102, 241],
  [251, 191, 36], [52, 211, 153], [167, 139, 250], [248, 113, 113],
  [96, 165, 250],
];

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 16;
const CONTENT_W = PAGE_W - MARGIN * 2;

const nowWIB = () =>
  new Date().toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }) + ' WIB';

const fmtNum = (n: number, unit?: string): string => {
  if (!n && n !== 0) return '-';
  if (unit === 'M' || n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + ' M';
  if (unit === 'Jt' || n >= 1_000_000)    return (n / 1_000_000).toFixed(1) + ' Jt';
  if (unit === 'Rb' || n >= 1_000)        return (n / 1_000).toFixed(0) + ' Rb';
  return n.toLocaleString('id-ID');
};

// ─────────────────────────────────────────────
// PAGE DECORATIONS
// ─────────────────────────────────────────────
function drawHeader(doc: any, title: string, period: string) {
  // Left red accent bar
  doc.setFillColor(...RED);
  doc.rect(0, 0, 5, PAGE_H, 'F');

  // Logo
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...RED);
  doc.text('TelkomInfra', MARGIN, 20);

  // Report title
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...DARK);
  const titleLines = doc.splitTextToSize(title, CONTENT_W - 30);
  titleLines.forEach((line: string, i: number) => {
    doc.text(line, MARGIN, 28 + i * 6);
  });

  // Period + timestamp right-aligned
  doc.setFontSize(8);
  doc.setTextColor(130, 130, 130);
  doc.text(`Periode: ${period}`, PAGE_W - MARGIN, 20, { align: 'right' });
  doc.text(`Dicetak: ${nowWIB()}`, PAGE_W - MARGIN, 26, { align: 'right' });

  // Red divider
  doc.setDrawColor(...RED);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, 34, PAGE_W - MARGIN, 34);
}

function drawFooter(doc: any, pageNum: number, total: number) {
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, PAGE_H - 11, PAGE_W - MARGIN, PAGE_H - 11);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(160, 160, 160);
  doc.text('TelkomInfra — TIFA AI Financial Assistant | RAHASIA', MARGIN, PAGE_H - 6);
  doc.text(`Halaman ${pageNum} / ${total}`, PAGE_W - MARGIN, PAGE_H - 6, { align: 'right' });
}

// ─────────────────────────────────────────────
// SECTION RENDERERS
// ─────────────────────────────────────────────

function renderHeading(doc: any, text: string, y: number): number {
  // Red left bar
  doc.setFillColor(...RED);
  doc.rect(MARGIN, y, 3, 8, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text(text, MARGIN + 6, y + 6);
  return y + 13;
}

function renderText(doc: any, text: string, y: number): number {
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...MID);
  const lines = doc.splitTextToSize(text, CONTENT_W);
  lines.forEach((line: string) => {
    doc.text(line, MARGIN, y);
    y += 5.5;
  });
  return y + 2;
}

function renderInsight(doc: any, text: string, y: number): number {
  doc.setFontSize(9.5);
  const lines = doc.splitTextToSize(text, CONTENT_W - 14);
  const boxH = lines.length * 5.5 + 14;

  // Background + border
  doc.setFillColor(254, 242, 242);
  doc.setDrawColor(...RED);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN, y, CONTENT_W, boxH, 3, 3, 'FD');
  // Left accent
  doc.setFillColor(...RED);
  doc.rect(MARGIN, y, 3, boxH, 'F');

  // Label
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...RED);
  doc.text('💡 Insight & Rekomendasi', MARGIN + 7, y + 8);

  // Body
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120, 20, 20);
  lines.forEach((line: string, i: number) => {
    doc.text(line, MARGIN + 7, y + 14 + i * 5.5);
  });

  return y + boxH + 6;
}

function renderBarChart(doc: any, section: ReportSection, y: number): number {
  const labels = section.labels || [];
  const values = section.values || [];
  if (!labels.length) return y;

  const CHART_H   = 60;
  const LABEL_H   = 12; // space below bars for x-axis labels
  const BOX_H     = CHART_H + LABEL_H + 22; // title + padding + bars + labels

  // Container box
  doc.setFillColor(252, 252, 252);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN, y, CONTENT_W, BOX_H, 3, 3, 'FD');

  // Chart title
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text(section.title || '', MARGIN + 6, y + 8);

  const chartX   = MARGIN + 18; // left offset for Y-axis labels
  const chartY   = y + 14;
  const chartW   = CONTENT_W - 24;
  const barAreaH = CHART_H;

  const maxVal = Math.max(...values) * 1.15 || 1;

  // Y-axis grid lines + labels
  const gridCount = 4;
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.2);
  for (let i = 0; i <= gridCount; i++) {
    const gy  = chartY + (barAreaH / gridCount) * i;
    const val = maxVal - (maxVal / gridCount) * i;
    doc.line(chartX, gy, chartX + chartW, gy);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(160, 160, 160);
    doc.text(fmtNum(val, section.unit), chartX - 2, gy + 1.5, { align: 'right' });
  }

  // Bars
  const groupW = chartW / labels.length;
  const barW   = Math.min(groupW * 0.55, 14);

  labels.forEach((label, i) => {
    const val   = values[i] || 0;
    const bh    = (val / maxVal) * barAreaH;
    const bx    = chartX + i * groupW + (groupW - barW) / 2;
    const by    = chartY + barAreaH - bh;
    const color = PALETTE[i % PALETTE.length];

    // Bar fill
    doc.setFillColor(...color);
    doc.rect(bx, by, barW, bh, 'F');

    // Value on top (only if bar is tall enough)
    if (bh > 8) {
      doc.setFontSize(5.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...color);
      doc.text(fmtNum(val, section.unit), bx + barW / 2, by - 1.5, { align: 'center' });
    }

    // X-axis label (truncated, clipped within box)
    const maxLabelLen = Math.floor(groupW / 2.2);
    const shortLabel  = label.length > maxLabelLen ? label.substring(0, maxLabelLen - 1) + '…' : label;
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(shortLabel, bx + barW / 2, chartY + barAreaH + 6, { align: 'center' });
  });

  return y + BOX_H + 6;
}

function renderPieChart(doc: any, section: ReportSection, y: number): number {
  const labels = section.labels || [];
  const values = section.values || [];
  if (!labels.length) return y;

  const total = values.reduce((a, b) => a + b, 0);
  if (!total) return y;

  const BOX_H  = 90;
  const cx     = MARGIN + 40;
  const cy     = y + BOX_H / 2 + 4;
  const R      = 32;

  // Container box
  doc.setFillColor(252, 252, 252);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN, y, CONTENT_W, BOX_H, 3, 3, 'FD');

  // Title
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text(section.title || '', MARGIN + 6, y + 8);

  // Draw pie slices using many tiny triangles (polygon approximation)
  let startAngle = -(Math.PI / 2);
  labels.forEach((_, i) => {
    const slice    = (values[i] / total) * 2 * Math.PI;
    const endAngle = startAngle + slice;
    const midAngle = startAngle + slice / 2;
    const color    = PALETTE[i % PALETTE.length];
    const STEPS    = Math.max(16, Math.round(slice * 22));

    // Build polygon points for slice
    const pts: [number, number][] = [];
    pts.push([cx, cy]);
    for (let s = 0; s <= STEPS; s++) {
      const a = startAngle + (slice / STEPS) * s;
      pts.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]);
    }

    doc.setFillColor(...color);
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.4);

    // Draw filled sector as a sequence of small triangles from center
    for (let s = 0; s < STEPS; s++) {
      doc.triangle(
        cx, cy,
        pts[s + 1][0], pts[s + 1][1],
        pts[s + 2][0], pts[s + 2][1],
        'F'
      );
    }

    // Percentage inside slice
    const pct = values[i] / total;
    if (pct > 0.06) {
      const lx = cx + Math.cos(midAngle) * (R * 0.63);
      const ly = cy + Math.sin(midAngle) * (R * 0.63);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(`${(pct * 100).toFixed(1)}%`, lx, ly + 1, { align: 'center' });
    }

    startAngle = endAngle;
  });

  // Donut hole
  doc.setFillColor(252, 252, 252);
  doc.circle(cx, cy, R * 0.42, 'F');

  // Center label
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text('Total', cx, cy - 1.5, { align: 'center' });
  doc.setFontSize(6);
  doc.text(total.toLocaleString('id-ID'), cx, cy + 4, { align: 'center' });

  // Legend — right side
  const legendX = MARGIN + 90;
  let legendY   = y + 16;
  labels.forEach((label, i) => {
    const pct   = ((values[i] / total) * 100).toFixed(2);
    const color = PALETTE[i % PALETTE.length];
    const val   = fmtNum(values[i], section.unit);

    doc.setFillColor(...color);
    doc.roundedRect(legendX, legendY - 3, 5, 5, 1, 1, 'F');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    const shortLabel = label.length > 20 ? label.substring(0, 20) + '…' : label;
    doc.text(shortLabel, legendX + 8, legendY + 1);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    doc.text(`${val}  (${pct}%)`, legendX + 8, legendY + 6);

    legendY += 13;
    if (legendY > y + BOX_H - 6) return; // prevent overflow
  });

  return y + BOX_H + 6;
}

// ─────────────────────────────────────────────
// MAIN PDF GENERATOR
// ─────────────────────────────────────────────

export const generatePDFReport = async (
  title: string,
  period: string,
  sections?: ReportSection[]
): Promise<string> => {
  const { jsPDF }         = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF('portrait', 'mm', 'a4');
  doc.setFont('helvetica', 'normal');

  let curY    = 40; // starts below header (header up to y≈34 + divider)
  let pageNum = 1;

  // ── helpers ──────────────────────────────────
  const newPage = () => {
    doc.addPage();
    pageNum++;
    // Re-draw left red bar on new pages
    doc.setFillColor(...RED);
    doc.rect(0, 0, 5, PAGE_H, 'F');
    curY = MARGIN + 4;
  };

  const need = (h: number) => {
    if (curY + h > PAGE_H - 16) newPage();
  };
  // ─────────────────────────────────────────────

  // First page header
  drawHeader(doc, title, period);

  if (!sections || sections.length === 0) {
    curY = renderText(doc, 'Tidak ada konten laporan yang tersedia.', curY + 4);
  } else {
    for (const s of sections) {
      switch (s.type) {

        case 'heading': {
          need(16);
          curY = renderHeading(doc, s.text || '', curY);
          break;
        }

        case 'text': {
          if (!s.text) break;
          const lines = doc.splitTextToSize(s.text, CONTENT_W);
          need(lines.length * 5.5 + 4);
          curY = renderText(doc, s.text, curY);
          break;
        }

        case 'table': {
          if (!s.headers || !s.rows) break;
          // Title above table
          if (s.title) {
            need(10);
            doc.setFontSize(8.5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...DARK);
            doc.text(s.title, MARGIN, curY);
            curY += 5;
          }
          need(30);
          autoTable(doc, {
            startY: curY,
            head: [s.headers],
            body: s.rows,
            theme: 'grid',
            margin: { left: MARGIN, right: MARGIN },
            headStyles: {
              fillColor: RED,
              textColor: [255, 255, 255],
              fontStyle: 'bold',
              fontSize: 8,
              cellPadding: { top: 3, right: 4, bottom: 3, left: 4 },
            },
            bodyStyles: {
              fontSize: 8,
              textColor: DARK,
              cellPadding: { top: 2.5, right: 4, bottom: 2.5, left: 4 },
            },
            alternateRowStyles: { fillColor: LIGHT },
            tableLineColor: BORDER,
            tableLineWidth: 0.15,
          });
          curY = (doc as any).lastAutoTable.finalY + 6;
          break;
        }

        case 'bar_chart': {
          const BOX_H = 60 + 12 + 22;
          need(BOX_H + 6);
          curY = renderBarChart(doc, s, curY);
          break;
        }

        case 'pie_chart': {
          need(96);
          curY = renderPieChart(doc, s, curY);
          break;
        }

        case 'insight': {
          if (!s.text) break;
          const lines = doc.splitTextToSize(s.text, CONTENT_W - 14);
          need(lines.length * 5.5 + 20);
          curY = renderInsight(doc, s.text, curY);
          break;
        }
      }
    }
  }

  // Footers on all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    if (p === 1) drawHeader(doc, title, period); // redraw in case overwritten
    drawFooter(doc, p, totalPages);
  }

  return URL.createObjectURL(doc.output('blob'));
};

// ─────────────────────────────────────────────
// EXCEL GENERATOR
// ─────────────────────────────────────────────

export const generateExcelReport = async (
  title: string,
  period: string,
  sections?: ReportSection[]
): Promise<string> => {
  const XLSX = await import('xlsx');
  const wb   = XLSX.utils.book_new();

  const rows: any[][] = [
    [`TelkomInfra — ${title}`],
    [`Periode: ${period}   |   Dicetak: ${nowWIB()}`],
    [],
  ];

  (sections || []).forEach(s => {
    if (s.type === 'heading') {
      rows.push([]);
      rows.push([s.text?.toUpperCase()]);
    } else if (s.type === 'text' || s.type === 'insight') {
      rows.push([s.text]);
    } else if (s.type === 'table' && s.headers && s.rows) {
      if (s.title) rows.push([s.title]);
      rows.push(s.headers);
      s.rows.forEach(r => rows.push(r));
      rows.push([]);
    } else if ((s.type === 'bar_chart' || s.type === 'pie_chart') && s.labels && s.values) {
      if (s.title) rows.push([s.title]);
      const total = s.values.reduce((a, b) => a + b, 0);
      rows.push(['Label', 'Nilai', 'Persentase']);
      s.labels.forEach((label, i) =>
        rows.push([label, s.values![i], `${((s.values![i] / total) * 100).toFixed(2)}%`])
      );
      rows.push([]);
    }
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  // Column widths
  ws['!cols'] = [{ wch: 40 }, { wch: 20 }, { wch: 16 }, { wch: 16 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Laporan');

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return URL.createObjectURL(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  );
};

// ─────────────────────────────────────────────
// WORD GENERATOR
// ─────────────────────────────────────────────

export const generateWordReport = async (
  title: string,
  period: string,
  sections?: ReportSection[]
): Promise<string> => {
  const {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    BorderStyle, WidthType, HeadingLevel, ShadingType,
  } = await import('docx');

  const body: any[] = [
    new Paragraph({
      children: [new TextRun({ text: 'TelkomInfra', bold: true, size: 44, color: 'DC2626' })],
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [new TextRun({ text: title, bold: true, size: 28 })],
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `Periode: ${period}   |   Dicetak: ${nowWIB()}`, size: 18, color: '888888' })],
      spacing: { after: 400 },
    }),
  ];

  const borders = {
    top:    { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
    left:   { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
    right:  { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
  };

  (sections || []).forEach(s => {
    if (s.type === 'heading') {
      body.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: s.text || '', bold: true, size: 26, color: 'DC2626' })],
        spacing: { before: 300, after: 120 },
      }));

    } else if (s.type === 'text') {
      body.push(new Paragraph({
        children: [new TextRun({ text: s.text || '', size: 20, color: '444444' })],
        spacing: { after: 120 },
      }));

    } else if (s.type === 'insight') {
      body.push(new Paragraph({
        children: [new TextRun({ text: `💡 ${s.text || ''}`, size: 20, bold: true, color: '7F1D1D' })],
        spacing: { before: 200, after: 200 },
      }));

    } else if (s.type === 'table' && s.headers && s.rows) {
      if (s.title) body.push(new Paragraph({ children: [new TextRun({ text: s.title, bold: true, size: 20 })], spacing: { after: 80 } }));
      body.push(new Table({
        rows: [
          new TableRow({
            children: s.headers.map(h => new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: 'FFFFFF', size: 18 })] })],
              shading: { type: ShadingType.SOLID, fill: 'DC2626' },
            })),
          }),
          ...s.rows.map(row => new TableRow({
            children: row.map(cell => new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: String(cell), size: 18 })] })],
            })),
          })),
        ],
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders,
      }));
      body.push(new Paragraph({ text: '', spacing: { after: 200 } }));

    } else if ((s.type === 'bar_chart' || s.type === 'pie_chart') && s.labels && s.values) {
      const total = s.values.reduce((a, b) => a + b, 0);
      if (s.title) body.push(new Paragraph({ children: [new TextRun({ text: s.title, bold: true, size: 20 })], spacing: { after: 80 } }));
      body.push(new Table({
        rows: [
          new TableRow({
            children: ['Label', 'Nilai', 'Persentase'].map(h => new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: 'FFFFFF', size: 18 })] })],
              shading: { type: ShadingType.SOLID, fill: 'DC2626' },
            })),
          }),
          ...s.labels!.map((label, i) => new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: label, size: 18 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: fmtNum(s.values![i], s.unit), size: 18 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${((s.values![i] / total) * 100).toFixed(2)}%`, size: 18 })] })] }),
            ],
          })),
        ],
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders,
      }));
      body.push(new Paragraph({ text: '', spacing: { after: 200 } }));
    }
  });

  const wordDoc = new Document({ sections: [{ properties: {}, children: body }] });
  return URL.createObjectURL(await Packer.toBlob(wordDoc));
};
