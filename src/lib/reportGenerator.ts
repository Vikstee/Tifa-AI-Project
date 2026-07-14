// reportGenerator.ts
// TIFA writes the PDF/Excel/Word report DIRECTLY from structured sections.
// No screenshots. All content (tables, charts, text) rendered programmatically.

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
  unit?: string; // e.g. "Jt" = juta, "M" = miliar
}

// Colors
const RED: [number, number, number] = [220, 38, 38];
const DARK: [number, number, number] = [30, 30, 30];
const GRAY: [number, number, number] = [100, 100, 100];
const LIGHT_GRAY: [number, number, number] = [245, 245, 245];
const PALETTE: [number, number, number][] = [
  [220, 38, 38], [0, 120, 255], [245, 158, 11],
  [16, 185, 129], [139, 92, 246], [236, 72, 153],
  [6, 182, 212], [249, 115, 22], [132, 204, 22], [99, 102, 241],
];

const nowWIB = () =>
  new Date().toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }) + ' WIB';

const formatNumber = (n: number, unit?: string): string => {
  if (unit === 'M' || n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + ' M';
  if (unit === 'Jt' || n >= 1_000_000) return (n / 1_000_000).toFixed(1) + ' Jt';
  if (unit === 'Rb' || n >= 1_000) return (n / 1_000).toFixed(0) + ' Rb';
  return n.toLocaleString('id-ID');
};

// ─────────────────────────────────────────────
// PDF RENDERER HELPERS
// ─────────────────────────────────────────────

function drawPageHeader(doc: any, title: string, period: string, pageW: number) {
  // Red accent bar on left
  doc.setFillColor(...RED);
  doc.rect(0, 0, 6, 297, 'F');

  // Logo text
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...RED);
  doc.text('TelkomInfra', 14, 18);

  // Report title
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...DARK);
  doc.text(title, 14, 27);

  // Period + timestamp
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY);
  doc.text(`Periode: ${period}   |   Dicetak: ${nowWIB()}`, 14, 34);

  // Divider
  doc.setDrawColor(220, 38, 38);
  doc.setLineWidth(0.4);
  doc.line(14, 37, pageW - 14, 37);
}

function drawPageFooter(doc: any, pageNum: number, totalPages: number, pageW: number, pageH: number) {
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(14, pageH - 12, pageW - 14, pageH - 12);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  doc.text('TelkomInfra — TIFA AI Financial Assistant | RAHASIA', 14, pageH - 7);
  doc.text(`Hal. ${pageNum} / ${totalPages}`, pageW - 14, pageH - 7, { align: 'right' });
}

function drawBarChart(
  doc: any, section: ReportSection,
  x: number, y: number, w: number, h: number
) {
  const labels = section.labels || [];
  const values = section.values || [];
  if (labels.length === 0) return y;

  const chartH = h;
  const barAreaH = chartH - 22; // leave room for labels
  const maxVal = Math.max(...values) * 1.1;
  const barW = Math.min((w / labels.length) - 4, 18);
  const groupW = w / labels.length;

  // Title
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text(section.title || '', x, y - 2);

  // Grid lines
  const gridLines = 4;
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.2);
  for (let i = 0; i <= gridLines; i++) {
    const gy = y + (barAreaH / gridLines) * i;
    doc.line(x, gy, x + w, gy);
    const val = maxVal - (maxVal / gridLines) * i;
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    doc.text(formatNumber(val, section.unit), x - 2, gy + 1, { align: 'right' });
  }

  // Bars
  labels.forEach((label, i) => {
    const val = values[i] || 0;
    const bh = (val / maxVal) * barAreaH;
    const bx = x + (i * groupW) + (groupW - barW) / 2;
    const by = y + barAreaH - bh;
    const color = PALETTE[i % PALETTE.length];

    doc.setFillColor(...color);
    // Rounded top (simulate with rect + small circle)
    doc.rect(bx, by, barW, bh, 'F');

    // Value label on top of bar
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...color);
    const valStr = formatNumber(val, section.unit);
    doc.text(valStr, bx + barW / 2, by - 1, { align: 'center' });

    // X-axis label (truncate long labels)
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    const shortLabel = label.length > 10 ? label.substring(0, 10) + '…' : label;
    doc.text(shortLabel, bx + barW / 2, y + barAreaH + 8, { align: 'center' });
  });

  return y + chartH + 6;
}

function drawPieChart(
  doc: any, section: ReportSection,
  x: number, y: number, w: number
) {
  const labels = section.labels || [];
  const values = section.values || [];
  if (labels.length === 0) return y;

  const total = values.reduce((a, b) => a + b, 0);
  if (total === 0) return y;

  const cx = x + w * 0.38;
  const cy = y + 42;
  const r = 34;

  // Title
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text(section.title || '', x, y - 2);

  // Draw pie slices
  let startAngle = -Math.PI / 2;
  labels.forEach((label, i) => {
    const slice = (values[i] / total) * 2 * Math.PI;
    const endAngle = startAngle + slice;
    const midAngle = startAngle + slice / 2;
    const color = PALETTE[i % PALETTE.length];

    // Draw slice as polygon approximation
    const steps = Math.max(12, Math.round(slice * 20));
    const points: [number, number][] = [[cx, cy]];
    for (let s = 0; s <= steps; s++) {
      const angle = startAngle + (slice / steps) * s;
      points.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r]);
    }
    points.push([cx, cy]);

    doc.setFillColor(...color);
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.5);

    // jsPDF polygon
    if (typeof (doc as any).polygon === 'function') {
      (doc as any).polygon(points, 'FD');
    } else {
      // Fallback: draw as path
      doc.lines(
        points.slice(1).map((p, idx) => {
          const prev = points[idx];
          return [p[0] - prev[0], p[1] - prev[1]];
        }),
        points[0][0], points[0][1], [1, 1], 'FD'
      );
    }

    // Percentage label inside slice (only if slice > 8%)
    const pct = values[i] / total;
    if (pct > 0.08) {
      const lx = cx + Math.cos(midAngle) * (r * 0.62);
      const ly = cy + Math.sin(midAngle) * (r * 0.62);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(`${(pct * 100).toFixed(1)}%`, lx, ly, { align: 'center' });
    }

    startAngle = endAngle;
  });

  // Donut hole
  doc.setFillColor(255, 255, 255);
  doc.circle(cx, cy, r * 0.42, 'F');

  // Center label
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text('Total', cx, cy - 2, { align: 'center' });
  doc.text(total.toLocaleString('id-ID'), cx, cy + 4, { align: 'center' });

  // Legend on the right
  const legendX = x + w * 0.74;
  let legendY = y + 14;
  labels.forEach((label, i) => {
    const pct = ((values[i] / total) * 100).toFixed(1);
    const color = PALETTE[i % PALETTE.length];
    doc.setFillColor(...color);
    doc.roundedRect(legendX, legendY - 3, 5, 5, 1, 1, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK);
    const shortLabel = label.length > 16 ? label.substring(0, 16) + '…' : label;
    doc.text(`${shortLabel} (${pct}%)`, legendX + 7, legendY + 1);
    legendY += 10;
  });

  return cy + r + 14;
}

// ─────────────────────────────────────────────
// PDF GENERATOR — main export
// ─────────────────────────────────────────────

export const generatePDFReport = async (
  title: string,
  period: string,
  sections?: ReportSection[]
): Promise<string> => {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const pageW = 210;
  const pageH = 297;
  const margin = 14;
  const contentW = pageW - margin * 2;
  const firstPageStartY = 42;
  const pageStartY = 20;

  const doc = new jsPDF('portrait', 'mm', 'a4');
  doc.setFont('helvetica', 'normal');

  // If no sections, show message
  if (!sections || sections.length === 0) {
    drawPageHeader(doc, title, period, pageW);
    doc.setFontSize(10);
    doc.setTextColor(...GRAY);
    doc.text('Tidak ada konten laporan yang tersedia.', margin, 55);
    drawPageFooter(doc, 1, 1, pageW, pageH);
    return URL.createObjectURL(doc.output('blob'));
  }

  let curY = firstPageStartY + 4;
  let pageNum = 1;

  const ensureSpace = (needed: number) => {
    if (curY + needed > pageH - 18) {
      doc.addPage();
      pageNum++;
      curY = pageStartY;
    }
  };

  // First page header
  drawPageHeader(doc, title, period, pageW);

  for (const section of sections) {
    switch (section.type) {

      case 'heading': {
        ensureSpace(14);
        // Red accent line
        doc.setFillColor(...RED);
        doc.rect(margin, curY, 3, 7, 'F');
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...DARK);
        doc.text(section.text || '', margin + 6, curY + 5.5);
        curY += 12;
        break;
      }

      case 'text': {
        if (!section.text) break;
        ensureSpace(10);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 60, 60);
        const lines = doc.splitTextToSize(section.text, contentW);
        lines.forEach((line: string) => {
          ensureSpace(6);
          doc.text(line, margin, curY);
          curY += 5;
        });
        curY += 3;
        break;
      }

      case 'table': {
        if (!section.headers || !section.rows) break;
        ensureSpace(30);
        if (section.title) {
          doc.setFontSize(8.5);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...DARK);
          doc.text(section.title, margin, curY);
          curY += 5;
        }
        autoTable(doc, {
          startY: curY,
          head: [section.headers],
          body: section.rows,
          theme: 'grid',
          margin: { left: margin, right: margin },
          headStyles: {
            fillColor: RED,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8,
            cellPadding: 3,
          },
          bodyStyles: { fontSize: 8, cellPadding: 3, textColor: DARK },
          alternateRowStyles: { fillColor: LIGHT_GRAY },
          tableLineColor: [220, 220, 220],
          tableLineWidth: 0.1,
        });
        curY = (doc as any).lastAutoTable.finalY + 6;
        break;
      }

      case 'bar_chart': {
        const chartH = 68;
        ensureSpace(chartH + 20);
        // Chart container box
        doc.setFillColor(252, 252, 252);
        doc.setDrawColor(240, 240, 240);
        doc.setLineWidth(0.3);
        doc.roundedRect(margin, curY - 2, contentW, chartH + 18, 3, 3, 'FD');
        curY += 6;
        curY = drawBarChart(doc, section, margin + 14, curY + 8, contentW - 20, chartH);
        curY += 4;
        break;
      }

      case 'pie_chart': {
        const pieH = 100;
        ensureSpace(pieH + 10);
        doc.setFillColor(252, 252, 252);
        doc.setDrawColor(240, 240, 240);
        doc.setLineWidth(0.3);
        doc.roundedRect(margin, curY - 2, contentW, pieH, 3, 3, 'FD');
        curY += 6;
        curY = drawPieChart(doc, section, margin + 6, curY + 4, contentW - 8);
        curY += 4;
        break;
      }

      case 'insight': {
        if (!section.text) break;
        ensureSpace(20);
        // Light red background box
        doc.setFillColor(254, 242, 242);
        doc.setDrawColor(...RED);
        doc.setLineWidth(0.3);
        const insightLines = doc.splitTextToSize(section.text, contentW - 16);
        const boxH = insightLines.length * 5 + 12;
        doc.roundedRect(margin, curY, contentW, boxH, 3, 3, 'FD');
        // Left red bar
        doc.setFillColor(...RED);
        doc.rect(margin, curY, 3, boxH, 'F');
        // Icon + text
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...RED);
        doc.text('💡 Insight & Rekomendasi', margin + 6, curY + 7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 20, 20);
        doc.setFontSize(8.5);
        insightLines.forEach((line: string, idx: number) => {
          doc.text(line, margin + 6, curY + 13 + idx * 5);
        });
        curY += boxH + 6;
        break;
      }
    }
  }

  // Add footers to all pages
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    if (p === 1) drawPageHeader(doc, title, period, pageW);
    drawPageFooter(doc, p, total, pageW, pageH);
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
  const workbook = XLSX.utils.book_new();

  const rows: any[][] = [
    [`TelkomInfra — ${title}`],
    [`Periode: ${period}   |   Dicetak: ${nowWIB()}`],
    [],
  ];

  if (sections && sections.length > 0) {
    for (const s of sections) {
      if (s.type === 'heading') {
        rows.push([], [s.text?.toUpperCase()]);
      } else if (s.type === 'text' || s.type === 'insight') {
        rows.push([s.text]);
      } else if (s.type === 'table' && s.headers && s.rows) {
        if (s.title) rows.push([s.title]);
        rows.push(s.headers);
        s.rows.forEach(row => rows.push(row));
        rows.push([]);
      } else if ((s.type === 'bar_chart' || s.type === 'pie_chart') && s.labels && s.values) {
        if (s.title) rows.push([s.title]);
        rows.push(['Label', 'Nilai']);
        s.labels.forEach((label, i) => rows.push([label, s.values![i]]));
        rows.push([]);
      }
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, ws, 'Laporan');

  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return URL.createObjectURL(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
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
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, BorderStyle, WidthType, HeadingLevel, AlignmentType, ShadingType } = await import('docx');

  const children: any[] = [
    new Paragraph({ children: [new TextRun({ text: 'TelkomInfra', bold: true, size: 40, color: 'DC2626' })], spacing: { after: 120 } }),
    new Paragraph({ children: [new TextRun({ text: title, bold: true, size: 28 })], spacing: { after: 80 } }),
    new Paragraph({ children: [new TextRun({ text: `Periode: ${period}   |   Dicetak: ${nowWIB()}`, size: 18, color: '666666' })], spacing: { after: 300 } }),
  ];

  if (sections && sections.length > 0) {
    for (const s of sections) {
      if (s.type === 'heading') {
        children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: s.text || '', bold: true, size: 24, color: 'DC2626' })], spacing: { before: 300, after: 120 } }));
      } else if (s.type === 'text') {
        children.push(new Paragraph({ children: [new TextRun({ text: s.text || '', size: 20 })], spacing: { after: 120 } }));
      } else if (s.type === 'insight') {
        children.push(new Paragraph({ children: [new TextRun({ text: `💡 Insight: ${s.text || ''}`, size: 20, color: '7F1D1D', bold: true })], spacing: { before: 200, after: 200 } }));
      } else if (s.type === 'table' && s.headers && s.rows) {
        if (s.title) children.push(new Paragraph({ children: [new TextRun({ text: s.title, bold: true, size: 20 })], spacing: { after: 80 } }));
        const tableRows = [
          new TableRow({ children: s.headers.map(h => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: 'FFFFFF', size: 18 })] })], shading: { type: ShadingType.SOLID, fill: 'DC2626' } })) }),
          ...s.rows.map(row => new TableRow({ children: row.map(cell => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(cell), size: 18 })] })] })) }))
        ];
        children.push(new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE }, borders: { top: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' }, bottom: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' }, left: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' }, right: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' } } }));
        children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
      } else if ((s.type === 'bar_chart' || s.type === 'pie_chart') && s.labels && s.values) {
        if (s.title) children.push(new Paragraph({ children: [new TextRun({ text: s.title, bold: true, size: 20 })], spacing: { after: 80 } }));
        const total = s.values.reduce((a, b) => a + b, 0);
        const chartRows = [
          new TableRow({ children: ['Label', 'Nilai', 'Persentase'].map(h => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: 'FFFFFF', size: 18 })] })], shading: { type: ShadingType.SOLID, fill: 'DC2626' } })) }),
          ...s.labels.map((label, i) => new TableRow({ children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: label, size: 18 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: formatNumber(s.values![i], s.unit), size: 18 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${((s.values![i] / total) * 100).toFixed(1)}%`, size: 18 })] })] }),
          ] }))
        ];
        children.push(new Table({ rows: chartRows, width: { size: 100, type: WidthType.PERCENTAGE }, borders: { top: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' }, bottom: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' }, left: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' }, right: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' } } }));
        children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
      }
    }
  }

  const wordDoc = new Document({ sections: [{ properties: {}, children }] });
  const blob = await Packer.toBlob(wordDoc);
  return URL.createObjectURL(blob);
};
