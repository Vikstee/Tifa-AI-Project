// reportGenerator.ts Ã¢â‚¬â€ TIFA writes structured PDF/Excel/Word from AI sections
// Each section type (heading, text, table, bar_chart, pie_chart, insight) is rendered
// programmatically with clean, professional layout. No screenshots.

export interface ReportSection {
  type: 'heading' | 'text' | 'table' | 'bar_chart' | 'pie_chart' | 'line_chart' | 'scatter' | 'candlestick' | 'gantt' | 'insight';
  text?: string;
  title?: string;
  headers?: string[];
  rows?: string[][];
  labels?: string[];
  values?: number[];
  unit?: string;
  pageBreakBefore?: boolean;
}

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

async function fetchImageAsBase64(url: string): Promise<string> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error('Failed to fetch image:', err);
    return '';
  }
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
// PDF GENERATOR
// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

function drawHeader(doc: any, title: string, period: string) {
  doc.setFillColor(...RED);
  doc.rect(0, 0, 5, PAGE_H, 'F');
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...RED);
  doc.text('TelkomInfra', MARGIN, 20);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...DARK);
  const titleLines = doc.splitTextToSize(title, CONTENT_W - 30);
  titleLines.forEach((line: string, i: number) => doc.text(line, MARGIN, 26 + i * 5));

  doc.setFontSize(8);
  doc.setTextColor(130, 130, 130);
  doc.text(`Periode: ${period}`, PAGE_W - MARGIN, 20, { align: 'right' });
  doc.text(`Dicetak: ${nowWIB()}`, PAGE_W - MARGIN, 25, { align: 'right' });

  doc.setDrawColor(...RED);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, 32, PAGE_W - MARGIN, 32);
}

function drawFooter(doc: any, pageNum: number, total: number) {
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, PAGE_H - 11, PAGE_W - MARGIN, PAGE_H - 11);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(160, 160, 160);
  doc.text('TelkomInfra Ã¢â‚¬â€ TIFA AI Financial Assistant | RAHASIA', MARGIN, PAGE_H - 6);
  doc.text(`Halaman ${pageNum} / ${total}`, PAGE_W - MARGIN, PAGE_H - 6, { align: 'right' });
}

function renderCoverPage(doc: any, title: string, subtitle: string, period: string, logoB64: string) {
  // Red accent band
  doc.setFillColor(...RED);
  doc.rect(0, 0, PAGE_W, 8, 'F');
  
  let curY = 60;
  
  if (logoB64) {
    try {
      doc.addImage(logoB64, 'PNG', MARGIN, curY, 80, 80);
      curY += 90;
    } catch (e) {
      console.warn('Could not add logo', e);
      curY += 20;
    }
  }

  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  const titleLines = doc.splitTextToSize(title, CONTENT_W);
  titleLines.forEach((line: string) => {
    doc.text(line, MARGIN, curY);
    curY += 14;
  });

  if (subtitle) {
    curY += 10;
    doc.setFontSize(18);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MID);
    const subLines = doc.splitTextToSize(subtitle, CONTENT_W);
    subLines.forEach((line: string) => {
      doc.text(line, MARGIN, curY);
      curY += 8;
    });
  }

  curY += 30;
  doc.setFontSize(12);
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.text('Data Date', MARGIN, curY);
  curY += 6;
  doc.setFont('helvetica', 'normal');
  doc.text(period, MARGIN, curY);

  curY += 20;
  doc.setFont('helvetica', 'bold');
  doc.text('GENERATED BY', MARGIN, curY);
  curY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...RED);
  doc.text('TIFA (TelkomInfra AI Financial Assistant)', MARGIN, curY);
}

// Reuse existing render functions but adjusted
function renderHeading(doc: any, text: string, y: number): number {
  doc.setFillColor(...RED);
  doc.rect(MARGIN, y, 3, 8, 'F');
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text(text, MARGIN + 6, y + 7);
  return y + 16;
}

function renderText(doc: any, text: string, y: number): number {
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...MID);
  const lines = doc.splitTextToSize(text, CONTENT_W);
  lines.forEach((line: string) => {
    doc.text(line, MARGIN, y);
    y += 6;
  });
  return y + 4;
}

function renderInsight(doc: any, text: string, y: number): number {
  doc.setFontSize(10);
  const lines = doc.splitTextToSize(text, CONTENT_W - 14);
  const boxH = lines.length * 6 + 14;
  doc.setFillColor(254, 242, 242);
  doc.setDrawColor(...RED);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN, y, CONTENT_W, boxH, 3, 3, 'FD');
  doc.setFillColor(...RED);
  doc.rect(MARGIN, y, 3, boxH, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...RED);
  doc.text('Insight & Rekomendasi', MARGIN + 7, y + 8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 20, 20);
  lines.forEach((line: string, i: number) => {
    doc.text(line, MARGIN + 7, y + 15 + i * 6);
  });
  return y + boxH + 8;
}

const HEADER_PALETTE_RGB: [number, number, number][] = [
  [26, 31, 54],   // 0: Dark gray
  [20, 48, 92],   // 1: Dark Blue
  [17, 74, 43],   // 2: Dark Green
  [107, 20, 20],  // 3: Dark Red
  [76, 29, 107],  // 4: Purple
  [19, 92, 82],   // 5: Teal
];
const HEADER_PALETTE_HEX = ['FF1A1F36', 'FF14305C', 'FF114A2B', 'FF6B1414', 'FF4C1D6B', 'FF135C52'];

function renderHorizontalBarChart(doc: any, section: ReportSection, y: number): number {
  const labels = section.labels || [];
  const values = section.values || [];
  if (!labels.length) return y;

  const BOX_H = labels.length * 15 + 30; 
  
  // Title
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text(section.title || '', MARGIN, y + 8);
  
  // Badge
  if (section.unit) {
    doc.setFillColor(209, 250, 229); 
    doc.roundedRect(CONTENT_W + MARGIN - 20, y + 4, 20, 6, 3, 3, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(6, 95, 70); 
    doc.text(section.unit.toUpperCase(), CONTENT_W + MARGIN - 10, y + 8.5, { align: 'center' });
  }

  const chartX = MARGIN + 25; 
  const chartY = y + 16;
  const chartW = CONTENT_W - 40;
  const maxVal = Math.max(...values) * 1.15 || 1;

  // Grid
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.2);
  const gridCount = 5;
  for (let i = 0; i <= gridCount; i++) {
    const gx = chartX + (chartW / gridCount) * i;
    doc.line(gx, chartY - 2, gx, chartY + labels.length * 15);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(160, 160, 160);
    doc.text(fmtNum((maxVal / gridCount) * i), gx, chartY + labels.length * 15 + 4, { align: 'center' });
  }

  // Bars
  labels.forEach((label, i) => {
    const val = values[i] || 0;
    const bw = (val / maxVal) * chartW;
    const by = chartY + i * 15 + 1;
    const bh = 10;
    
    // Label
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text(label, chartX - 3, by + 7, { align: 'right' });
    
    // Bar
    const color = PALETTE[(i + 1) % PALETTE.length]; 
    doc.setFillColor(...color);
    doc.roundedRect(chartX, by, bw, bh, 1, 1, 'F');
    
    // Value
    doc.setFontSize(8);
    doc.text(fmtNum(val), chartX + bw + 2, by + 7);
  });

  return y + BOX_H;
}

function renderPieChart(doc: any, section: ReportSection, curY: number): number {
  const labels = section.labels || [];
  const values = section.values || [];
  if (!labels.length || !values.length) return curY;
  
  const total = values.reduce((a, b) => a + b, 0) || 1;
  
  if (section.title) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text(section.title, MARGIN, curY + 8);
    curY += 16;
  }

  const cx = MARGIN + 40;
  const cy = curY + 25;
  const r = 25;
  
  let currentAngle = 0;
  
  values.forEach((val, i) => {
    const sliceAngle = (val / total) * 360;
    if (sliceAngle <= 0) return;

    const startAngle = currentAngle;
    const color = PALETTE[i % PALETTE.length];
    
    doc.setFillColor(...color);
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.5);
    
    if (sliceAngle >= 359.9) {
      doc.circle(cx, cy, r, 'FD');
    } else {
      const points = [{x: cx, y: cy}];
      const steps = Math.max(2, Math.floor(sliceAngle));
      for(let step = 0; step <= steps; step++) {
         const a = startAngle + (sliceAngle * step / steps);
         const rad = (a - 90) * Math.PI / 180;
         points.push({x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad)});
      }
      points.push({x: cx, y: cy});
      
      const lines = [];
      for(let j = 1; j < points.length; j++) {
         lines.push([points[j].x - points[j-1].x, points[j].y - points[j-1].y]);
      }
      doc.lines(lines, points[0].x, points[0].y, [1, 1], 'FD', true);
    }
    
    // Legend
    const legX = cx + 50;
    const legY = curY + 5 + (i * 8);
    doc.setFillColor(...color);
    doc.rect(legX, legY, 4, 4, 'F');
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK);
    
    const pct = ((val / total) * 100).toFixed(1) + '%';
    const text = `${labels[i]} - ${fmtNum(val, section.unit)} (${pct})`;
    doc.text(text, legX + 7, legY + 3.5);
    
    currentAngle += sliceAngle;
  });
  
  return curY + Math.max(60, values.length * 8 + 15);
}

function renderLineChart(doc: any, section: ReportSection, y: number): number {
  const labels = section.labels || [];
  const values = section.values || [];
  if (!labels.length || !values.length) return y;

  const BOX_H = 80;
  
  if (section.title) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text(section.title, MARGIN, y + 8);
  }
  
  if (section.unit) {
    doc.setFillColor(209, 250, 229); 
    doc.roundedRect(CONTENT_W + MARGIN - 20, y + 4, 20, 6, 3, 3, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(6, 95, 70); 
    doc.text(section.unit.toUpperCase(), CONTENT_W + MARGIN - 10, y + 8.5, { align: 'center' });
  }

  const chartX = MARGIN + 10; 
  const chartY = y + 25;
  const chartW = CONTENT_W - 20;
  const chartH = 35;
  const maxVal = Math.max(...values) * 1.15 || 1;

  // Grid
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.2);
  const gridCount = 4;
  for (let i = 0; i <= gridCount; i++) {
    const gy = chartY + chartH - (chartH / gridCount) * i;
    doc.line(chartX, gy, chartX + chartW, gy);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(160, 160, 160);
    doc.text(fmtNum((maxVal / gridCount) * i), chartX - 2, gy + 2, { align: 'right' });
  }

  const stepX = chartW / Math.max(1, (labels.length - 1));
  const points: {x: number, y: number}[] = [];
  
  labels.forEach((label, i) => {
    const val = values[i] || 0;
    const px = chartX + i * stepX;
    const py = chartY + chartH - (val / maxVal) * chartH;
    points.push({x: px, y: py});
    
    // Label
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text(label, px, chartY + chartH + 6, { align: 'center' });
  });

  // Draw line
  if (points.length > 1) {
    doc.setDrawColor(...RED);
    doc.setLineWidth(1.2);
    const lines = [];
    for(let j=1; j<points.length; j++){
      lines.push([points[j].x - points[j-1].x, points[j].y - points[j-1].y]);
    }
    doc.lines(lines, points[0].x, points[0].y, [1,1], 'S', false);
  }
  
  // Draw dots
  doc.setFillColor(...RED);
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.5);
  points.forEach((p, i) => {
    doc.circle(p.x, p.y, 2, 'FD');
    doc.setFontSize(7);
    doc.setTextColor(...DARK);
    doc.text(fmtNum(values[i]), p.x, p.y - 4, { align: 'center' });
  });

  return y + BOX_H;
}

function formatTableCellValue(val: any): string {
  if (val === null || val === undefined) return '-';
  const str = String(val).trim();
  // Format unformatted large numbers into full exact Indonesian dot-separated format (e.g. 45309600 -> 45.309.600)
  if (/^\d{6,}$/.test(str)) {
    const num = Number(str);
    if (!isNaN(num)) {
      return num.toLocaleString('id-ID'); // Full exact real number, NO M or Jt shortening!
    }
  }
  // Format date like 2026-01 -> Jan 2026
  if (/^\d{4}-\d{2}$/.test(str)) {
    const [y, m] = str.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const idx = parseInt(m, 10) - 1;
    if (idx >= 0 && idx < 12) return `${months[idx]} ${y}`;
  }
  return str;
}

function analyzeColumnProperties(headers: string[], rows: string[][]): { widths: string[]; wraps: boolean[] } {
  const colCount = headers.length;
  const weights: number[] = [];
  const wraps: boolean[] = [];

  for (let colIdx = 0; colIdx < colCount; colIdx += 1) {
    const headerText = (headers[colIdx] || '').trim();
    let maxCharLen = headerText.length;
    let hasLongTextWithSpaces = false;

    for (const row of rows) {
      const cellVal = String(row[colIdx] || '').trim();
      maxCharLen = Math.max(maxCharLen, cellVal.length);
      if (cellVal.length > 20 && cellVal.includes(' ')) hasLongTextWithSpaces = true;
    }

    const isNumberColumn = /(?:no|ranking|periode|rp|revenue|cash|invoice|bast|denda|target)/i.test(headerText);
    const weight = colIdx === 0 && /^(no|#|ranking)$/i.test(headerText)
      ? 42
      : Math.max(isNumberColumn ? 72 : 95, Math.min(190, maxCharLen * (isNumberColumn ? 3.5 : 4.5) + 18));
    weights.push(weight);
    wraps.push(hasLongTextWithSpaces || maxCharLen > 18);
  }

  const total = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  const widths = weights.map((weight) => `${(weight / total * 100).toFixed(2)}%`);
  return { widths, wraps };
}
function sanitizePdfText(value: unknown): string {
  return String(value ?? '')
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')
    .replace(/ðŸ[\u0080-\uFFFF]{2,4}/g, '')
    .replace(/Ã¢â‚¬â€|â€”|â€“/g, '-')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
function renderSingleSection(s: any): string {
  s = { ...s, text: sanitizePdfText(s.text), title: sanitizePdfText(s.title), headers: s.headers?.map(sanitizePdfText), labels: s.labels?.map(sanitizePdfText), rows: s.rows?.map((row: string[]) => row.map(sanitizePdfText)) };
  if (s.type === 'html' || s.content) {
    return `<div class="section-block">${s.content || s.text || ''}</div>`;
  }
  switch (s.type) {
    case 'heading':
      return `<div class="section-block"><h2 class="section-heading">${s.text || ''}</h2></div>`;
    case 'text':
      return `<div class="section-block"><p class="section-text">${s.text || ''}</p></div>`;
    case 'insight':
      return `<div class="section-block">
        <div class="insight-box">
          <div class="insight-title">Insight &amp; Rekomendasi</div>
          <p class="insight-text">${s.text || ''}</p>
        </div>
      </div>`;
    case 'table': {
      if (!s.headers || !s.rows) return '';
      const colCount = s.headers.length;
      const colClass = `col-count-${Math.min(10, colCount)}`;
      
      const { widths, wraps } = analyzeColumnProperties(s.headers, s.rows);

      const colGroup = s.headers.map((_: string, idx: number) => {
        const w = widths[idx];
        return `<col ${w !== 'auto' ? `style="width: ${w};"` : ''} />`;
      }).join('');

      const headerCols = s.headers.map((h: string, idx: number) => {
        const isWrap = wraps[idx];
        return `<th class="${isWrap ? 'col-wrap' : ''}">${h}</th>`;
      }).join('');

      const bodyRows = s.rows.map((row: string[]) => {
        const cols = row.map((c, idx) => {
          const isWrap = wraps[idx];
          return `<td class="${isWrap ? 'col-wrap' : ''}">${formatTableCellValue(c)}</td>`;
        }).join('');
        return `<tr>${cols}</tr>`;
      }).join('');

      return `<div class="section-block">
        ${s.title ? `<h3 class="table-title">${s.title}</h3>` : ''}
        <div class="table-container">
          <table class="${colClass}">
            <colgroup>${colGroup}</colgroup>
            <thead><tr>${headerCols}</tr></thead>
            <tbody>${bodyRows}</tbody>
          </table>
        </div>
      </div>`;
    }
    case 'bar_chart':
    case 'pie_chart':
    case 'line_chart':
    case 'scatter':
    case 'candlestick':
    case 'gantt': {
      const labels = s.labels || [];
      const values = s.values || [];
      if (!labels.length) return '';
      const maxVal = Math.max(...values) * 1.15 || 1;
      const barRows = labels.map((lbl: string, idx: number) => {
        const val = values[idx] || 0;
        const pct = Math.min(100, Math.max(2, Math.round((val / maxVal) * 100)));
        const colorHex = ['#DC2626', '#2563EB', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899'][idx % 6];
        return `
          <div class="chart-row">
            <div class="chart-label">${lbl}</div>
            <div class="chart-bar-bg">
              <div class="chart-bar-fill" style="width: ${pct}%; background-color: ${colorHex};"></div>
            </div>
            <div class="chart-val">${fmtNum(val, s.unit)}</div>
          </div>
        `;
      }).join('');
      return `<div class="section-block">
        <div class="chart-card">
          <div class="chart-card-header">
            <span class="chart-card-title">${s.title || 'Grafik Data'}</span>
            ${s.unit ? `<span class="chart-card-badge">${s.unit.toUpperCase()}</span>` : ''}
          </div>
          <div class="chart-body">${barRows}</div>
        </div>
      </div>`;
    }
    default:
      return s.text ? `<div class="section-block"><p class="section-text">${s.text}</p></div>` : '';
  }
}

function paginateReportSections(sections: any[], maxPageContentHeight: number = 900): any[][] {
  const pages: any[][] = [];
  let currentPage: any[] = [];
  let currentHeight = 0;

  for (const s of (sections || [])) {
    if (s.type === 'table' && s.rows && s.rows.length > 0) {
      let remainingRows = [...s.rows];
      let partIdx = 1;

      while (remainingRows.length > 0) {
        const rowH = 36;
        const headerH = 45;
        const availableH = maxPageContentHeight - currentHeight - headerH;
        let rowsFit = Math.floor(availableH / rowH);

        // Orphan prevention: if remaining rows exceed rowsFit by 1 or 2 rows, and total height still fits within tolerance, keep them on current page
        if (remainingRows.length <= rowsFit + 2 && (currentHeight + headerH + remainingRows.length * rowH) <= (maxPageContentHeight + 50)) {
          rowsFit = remainingRows.length;
        }

        if (rowsFit < 2 && currentPage.length > 0 && remainingRows.length > 1) {
          pages.push(currentPage);
          currentPage = [];
          currentHeight = 0;
          rowsFit = Math.floor((maxPageContentHeight - headerH) / rowH);
        }

        const fitCount = Math.max(1, Math.min(rowsFit, remainingRows.length));
        const chunk = remainingRows.slice(0, fitCount);
        remainingRows = remainingRows.slice(fitCount);

        const subTitle = s.title 
          ? (partIdx === 1 ? s.title : `${s.title} (Lanjutan ${partIdx - 1})`)
          : undefined;

        currentPage.push({
          ...s,
          rows: chunk,
          title: subTitle
        });

        currentHeight += headerH + chunk.length * rowH + (currentPage.length > 1 ? 14 : 0);
        partIdx++;

        if (remainingRows.length > 0) {
          pages.push(currentPage);
          currentPage = [];
          currentHeight = 0;
        }
      }
    } else {
      let secHeight = 50;
      if (s.type === 'heading') secHeight = 35;
      else if (s.type === 'text') secHeight = Math.ceil((s.text || '').length / 85) * 18 + 15;
      else if (s.type === 'insight') secHeight = Math.ceil((s.text || '').length / 80) * 18 + 40;
      else if (s.labels) secHeight = 55 + (s.labels || []).length * 30;
      else if (s.content) secHeight = Math.ceil((s.content || '').length / 80) * 18 + 30;

      if (currentPage.length > 0) {
        secHeight += 14;
      }

      if (s.pageBreakBefore && currentPage.length > 0) {
        pages.push(currentPage);
        currentPage = [s];
        currentHeight = secHeight;
      } else if (currentHeight + secHeight > (maxPageContentHeight + 20) && currentPage.length > 0) {
        pages.push(currentPage);
        currentPage = [s];
        currentHeight = secHeight;
      } else {
        currentPage.push(s);
        currentHeight += secHeight;
      }
    }
  }

  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  return pages.length > 0 ? pages : [[]];
}

export function generateHTMLFromSections(
  title: string,
  subtitle: string,
  period: string,
  sections?: (ReportSection & { content?: string })[],
  rawHtml?: string
): string {
  if (rawHtml && rawHtml.trim().length > 0) {
    return rawHtml;
  }

  const paginatedPages = paginateReportSections(sections || []);
  const totalPages = paginatedPages.length;

  const pagesHtml = paginatedPages.map((pageSections, pIdx) => {
    const pageNum = pIdx + 1;
    const contentHtml = pageSections.map(s => renderSingleSection(s)).join('');

    return `
      <div class="a4-page" id="page-${pageNum}">
        <div class="header-bar">
          <div>
            <div class="brand-title">TELKOMINFRA</div>
            <div class="doc-title">${title}</div>
            ${subtitle ? `<div class="doc-subtitle">${subtitle}</div>` : ''}
          </div>
          <div class="meta-info">
            <div class="meta-badge">Periode: ${period || 'Terbaru'}</div>
            <div>Dicetak: ${nowWIB()}</div>
          </div>
        </div>

        <main class="page-content">
          ${contentHtml || '<p class="section-text">Tidak ada konten laporan yang tersedia.</p>'}
        </main>

        <div class="footer-bar">
          <div>TelkomInfra - TIFA AI Financial Assistant | RAHASIA</div>
          <div>Halaman ${pageNum} dari ${totalPages}</div>
        </div>
      </div>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      font-family: Arial, 'Noto Sans', 'Segoe UI', sans-serif;
      background-color: #f1f5f9;
      color: #1e293b;
      padding: 20px 0;
      margin: 0 auto;
      line-height: 1.4;
    }

    @media print {
      @page { size: A4 portrait; margin: 0; }
      body { background-color: #ffffff; padding: 0; }
      .a4-page { box-shadow: none !important; margin: 0 !important; page-break-after: always; }
    }

    .a4-page {
      width: 794px;
      height: 1123px;
      padding: 36px 40px 42px 40px;
      background: #ffffff;
      box-sizing: border-box;
      margin: 0 auto 24px auto;
      box-shadow: 0 4px 16px rgba(15, 23, 42, 0.1);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      overflow: hidden;
    }

    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-bottom: 2px solid #dc2626;
      padding-bottom: 12px;
      margin-bottom: 16px;
      min-height: 55px;
      height: auto;
      flex-shrink: 0;
    }

    .brand-title {
      font-size: 12px;
      font-weight: 800;
      color: #dc2626;
      text-transform: uppercase;
      letter-spacing: 1.2px;
    }

    .doc-title {
      font-size: 19px;
      font-weight: 800;
      color: #0f172a;
      margin-top: 2px;
      line-height: 1.2;
    }

    .doc-subtitle {
      font-size: 11.5px;
      color: #64748b;
      margin-top: 2px;
    }

    .meta-info {
      text-align: right;
      font-size: 10.5px;
      color: #64748b;
    }

    .meta-badge {
      display: inline-block;
      background: #f1f5f9;
      color: #0f172a;
      padding: 3px 8px;
      border-radius: 6px;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .page-content {
      flex: 1;
      min-height: 0;
      overflow: visible;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .section-block {
      width: 100%;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .section-heading {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
      border-left: 4px solid #dc2626;
      padding-left: 10px;
      margin-top: 6px;
      margin-bottom: 6px;
    }

    .section-text {
      font-size: 12px;
      color: #334155;
      line-height: 1.5;
    }

    .insight-box {
      background-color: #fef2f2;
      border-left: 4px solid #dc2626;
      border-radius: 8px;
      padding: 10px 14px;
    }

    .insight-title {
      font-size: 12px;
      font-weight: 700;
      color: #991b1b;
      margin-bottom: 4px;
    }

    .insight-text {
      font-size: 11.5px;
      color: #7f1d1d;
      line-height: 1.45;
    }

    .table-title {
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 6px;
    }

    .table-container {
      display: block;
      width: 100%;
      max-width: 100%;
      border-radius: 8px;
      border: 1px solid #cbd5e1;
      overflow: hidden;
      box-sizing: border-box;
    }

    table {
      width: 100%;
      max-width: 100%;
      table-layout: fixed;
      border-collapse: collapse;
      font-size: 11px;
      text-align: left;
    }

    table.col-count-7, table.col-count-8, table.col-count-9, table.col-count-10 {
      font-size: 8.5px;
    }
    table.col-count-7 th, table.col-count-7 td,
    table.col-count-8 th, table.col-count-8 td,
    table.col-count-9 th, table.col-count-9 td,
    table.col-count-10 th, table.col-count-10 td {
      padding: 6px 7px;
    }

    table.col-count-5, table.col-count-6 {
      font-size: 9.5px;
    }
    table.col-count-5 th, table.col-count-5 td,
    table.col-count-6 th, table.col-count-6 td {
      padding: 6px 8px;
    }

    thead th {
      background-color: #1e293b;
      color: #ffffff;
      font-weight: 600;
      padding: 7px 9px;
      border-bottom: 2px solid #cbd5e1;
      white-space: normal;
      word-break: break-word !important;
      overflow-wrap: anywhere !important;
    }

    thead th.col-wrap, tbody td.col-wrap {
      white-space: normal;
      word-break: break-word !important;
      overflow-wrap: anywhere !important;
    }

    tbody td {
      padding: 6px 9px;
      border-bottom: 1px solid #e2e8f0;
      color: #334155;
      vertical-align: top;
      white-space: normal;
      word-break: break-word !important;
      overflow-wrap: anywhere !important;
    }

    tbody tr:nth-child(even) {
      background-color: #f8fafc;
    }

    .chart-card {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 12px 14px;
    }

    .chart-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }

    .chart-card-title {
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
    }

    .chart-card-badge {
      font-size: 9.5px;
      font-weight: 700;
      background: #d1fae5;
      color: #065f46;
      padding: 2px 7px;
      border-radius: 4px;
    }

    .chart-row {
      display: flex;
      align-items: center;
      margin-bottom: 7px;
      font-size: 11px;
    }

    .chart-label {
      width: 170px;
      font-weight: 600;
      color: #334155;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .chart-bar-bg {
      flex: 1;
      height: 9px;
      background: #f1f5f9;
      border-radius: 5px;
      margin: 0 10px;
      overflow: hidden;
    }

    .chart-bar-fill {
      height: 100%;
      border-radius: 5px;
    }

    .chart-val {
      width: 85px;
      text-align: right;
      font-weight: 600;
      color: #0f172a;
    }

    .footer-bar {
      margin-top: 14px;
      padding-top: 8px;
      border-top: 1px solid #cbd5e1;
      display: flex;
      justify-content: space-between;
      font-size: 9.5px;
      color: #94a3b8;
      min-height: 25px;
      height: auto;
      line-height: 1.35;
      flex-shrink: 0;
    }
  </style>
</head>
<body>
  ${pagesHtml}
</body>
</html>`;
}

export const generatePDFReport = async (
  title: string,
  subtitle: string,
  period: string,
  sections?: ReportSection[],
  customHtml?: string
): Promise<{ url: string; size: number; htmlString: string }> => {
  const { jsPDF } = await import('jspdf');
  const html2canvas = (await import('html2canvas')).default;

  const htmlString = generateHTMLFromSections(title, subtitle, period, sections, customHtml);

  // Render HTML in off-screen container
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = '794px';
  container.style.zIndex = '-9999';
  container.innerHTML = htmlString;
  document.body.appendChild(container);

  try {
    const pageEls = Array.from(container.querySelectorAll('.a4-page')) as HTMLElement[];
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    for (let i = 0; i < pageEls.length; i++) {
      const pageEl = pageEls[i];
      const canvas = await html2canvas(pageEl, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
    }

    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }

    const blob = pdf.output('blob');
    return { url: URL.createObjectURL(blob), size: blob.size, htmlString };
  } catch (err) {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
    console.error('HTML to PDF generation failed:', err);
    throw err;
  }
};


// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
// EXCEL GENERATOR
// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

export const generateExcelReport = async (
  title: string,
  subtitle: string,
  period: string,
  sections?: ReportSection[]
): Promise<{ url: string; size: number }> => {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'TIFA';
  workbook.created = new Date();
  
  const ws = workbook.addWorksheet('Laporan', { views: [{ showGridLines: false }] });
  
  // Base columns config
  ws.columns = [
    { width: 5 },  // spacer
    { width: 45 }, // Main col 1
    { width: 30 }, // Main col 2
    { width: 25 }, // Main col 3
    { width: 25 }, // Main col 4
    { width: 25 }, // Main col 5
  ];

  let currRow = 2;

  // Cover Page elements
  ws.mergeCells(`B${currRow}:F${currRow}`);
  const titleCell = ws.getCell(`B${currRow}`);
  titleCell.value = title.toUpperCase();
  titleCell.font = { name: 'Arial', size: 22, bold: true, color: { argb: 'FF333333' } };
  currRow++;

  if (subtitle) {
    ws.mergeCells(`B${currRow}:F${currRow}`);
    const subCell = ws.getCell(`B${currRow}`);
    subCell.value = subtitle;
    subCell.font = { name: 'Arial', size: 14, color: { argb: 'FF666666' } };
    currRow++;
  }

  currRow++;
  ws.mergeCells(`B${currRow}:D${currRow}`);
  const dateCell = ws.getCell(`B${currRow}`);
  dateCell.value = `Periode: ${period}  |  Dicetak: ${nowWIB()}`;
  dateCell.font = { name: 'Arial', size: 10, color: { argb: 'FF888888' } };
  currRow += 3;

  (sections || []).forEach(s => {
    if (s.type === 'heading') {
      if (s.pageBreakBefore) currRow += 2;
      ws.mergeCells(`B${currRow}:F${currRow}`);
      const hCell = ws.getCell(`B${currRow}`);
      hCell.value = s.text?.toUpperCase();
      hCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFDC2626' } };
      hCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
      currRow += 2;

    } else if (s.type === 'text' || s.type === 'insight') {
      ws.mergeCells(`B${currRow}:F${currRow}`);
      const tCell = ws.getCell(`B${currRow}`);
      tCell.value = s.text;
      tCell.font = { 
        name: 'Arial', 
        size: 11, 
        color: { argb: s.type === 'insight' ? 'FF991B1B' : 'FF444444' },
        bold: s.type === 'insight'
      };
      if (s.type === 'insight') {
        tCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF2F2' } };
      }
      tCell.alignment = { wrapText: true, vertical: 'top' };
      ws.getRow(currRow).height = s.text ? Math.ceil(s.text.length / 90) * 15 + 10 : 20;
      currRow += 2;

    } else if (s.type === 'table' && s.headers && s.rows) {
      if (s.title) {
        ws.mergeCells(`B${currRow}:F${currRow}`);
        ws.getCell(`B${currRow}`).value = s.title;
        ws.getCell(`B${currRow}`).font = { name: 'Arial', size: 12, bold: true };
        currRow++;
      }

      // Headers
      const startCol = 2; // B
      s.headers.forEach((h, i) => {
        const cell = ws.getCell(currRow, startCol + i);
        cell.value = h;
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        const hexColor = HEADER_PALETTE_HEX[i % HEADER_PALETTE_HEX.length];
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: hexColor } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: {style:'thin', color: {argb:'FFDDDDDD'}},
          left: {style:'thin', color: {argb:'FFDDDDDD'}},
          bottom: {style:'thin', color: {argb:'FFDDDDDD'}},
          right: {style:'thin', color: {argb:'FFDDDDDD'}}
        };
      });
      currRow++;

      // Rows
      s.rows.forEach((row, rowIdx) => {
        row.forEach((val, i) => {
          const cell = ws.getCell(currRow, startCol + i);
          cell.value = val;
          cell.font = { name: 'Arial', size: 10, color: { argb: 'FF333333' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowIdx % 2 === 0 ? 'FFFFFFFF' : 'FFF9FAFB' } };
          cell.border = {
            top: {style:'thin', color: {argb:'FFEEEEEE'}},
            left: {style:'thin', color: {argb:'FFEEEEEE'}},
            bottom: {style:'thin', color: {argb:'FFEEEEEE'}},
            right: {style:'thin', color: {argb:'FFEEEEEE'}}
          };
          cell.alignment = { wrapText: true, vertical: 'middle' };
        });
        ws.getRow(currRow).height = 20;
        currRow++;
      });
      currRow += 2;

    } else if ((s.type === 'bar_chart' || s.type === 'pie_chart') && s.labels && s.values) {
      if (s.title) {
        ws.mergeCells(`B${currRow}:F${currRow}`);
        ws.getCell(`B${currRow}`).value = s.title + ' (Data)';
        ws.getCell(`B${currRow}`).font = { name: 'Arial', size: 12, bold: true };
        currRow++;
      }

      const headers = ['Label', 'Nilai', 'Persentase'];
      headers.forEach((h, i) => {
        const cell = ws.getCell(currRow, 2 + i);
        cell.value = h;
        cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } };
        cell.border = { top: {style:'thin', color: {argb:'FFDDDDDD'}}, left: {style:'thin', color: {argb:'FFDDDDDD'}}, bottom: {style:'thin', color: {argb:'FFDDDDDD'}}, right: {style:'thin', color: {argb:'FFDDDDDD'}} };
      });
      currRow++;

      const total = s.values.reduce((a, b) => a + b, 0);
      s.labels.forEach((lbl, i) => {
        const rowData = [lbl, s.values![i], `${((s.values![i] / total) * 100).toFixed(2)}%`];
        rowData.forEach((val, j) => {
          const cell = ws.getCell(currRow, 2 + j);
          cell.value = val;
          cell.font = { name: 'Arial', size: 10, color: { argb: 'FF333333' } };
          cell.border = { top: {style:'thin', color: {argb:'FFEEEEEE'}}, left: {style:'thin', color: {argb:'FFEEEEEE'}}, bottom: {style:'thin', color: {argb:'FFEEEEEE'}}, right: {style:'thin', color: {argb:'FFEEEEEE'}} };
        });
        currRow++;
      });
      currRow += 2;
    }
  });

  // END OF REPORT
  currRow += 3;
  ws.mergeCells(`B${currRow}:F${currRow}`);
  const endCell1 = ws.getCell(`B${currRow}`);
  endCell1.value = 'End Of Report';
  endCell1.font = { name: 'Arial', size: 20, bold: true, color: { argb: 'FFDC2626' } };
  endCell1.alignment = { horizontal: 'center', vertical: 'middle' };
  currRow++;
  
  ws.mergeCells(`B${currRow}:F${currRow}`);
  const endCell2 = ws.getCell(`B${currRow}`);
  endCell2.value = 'Thank You';
  endCell2.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF333333' } };
  endCell2.alignment = { horizontal: 'center', vertical: 'middle' };
  currRow += 3;
  
  ws.mergeCells(`B${currRow}:F${currRow}`);
  const endCell3 = ws.getCell(`B${currRow}`);
  endCell3.value = 'GENERATED BY TIFA';
  endCell3.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF888888' } };
  endCell3.alignment = { horizontal: 'center', vertical: 'middle' };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  return { url: URL.createObjectURL(blob), size: blob.size };
};


// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
// WORD GENERATOR
// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

/** Render a horizontal bar chart to a PNG ArrayBuffer using Canvas API */
async function renderBarChartToImage(
  labels: string[], values: number[], title: string, unit?: string
): Promise<ArrayBuffer | null> {
  try {
    const BAR_H = 32;
    const PADDING = { top: 60, bottom: 40, left: 200, right: 80 };
    const CHART_W = 700;
    const chartH = labels.length * (BAR_H + 12);
    const totalH = chartH + PADDING.top + PADDING.bottom;
    
    const canvas = new OffscreenCanvas(CHART_W, totalH);
    const ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
    if (!ctx) return null;

    // White background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, CHART_W, totalH);

    // Title
    ctx.fillStyle = '#1E1E1E';
    ctx.font = 'bold 18px Arial';
    ctx.fillText(title, PADDING.left, 36);

    // Unit badge
    if (unit) {
      const badgeText = unit.toUpperCase();
      ctx.font = 'bold 11px Arial';
      const badgeW = ctx.measureText(badgeText).width + 16;
      ctx.fillStyle = '#D1FAE5';
      ctx.beginPath();
      ctx.roundRect(CHART_W - PADDING.right - badgeW, 18, badgeW, 20, 4);
      ctx.fill();
      ctx.fillStyle = '#065F46';
      ctx.fillText(badgeText, CHART_W - PADDING.right - badgeW + 8, 32);
    }

    const barAreaW = CHART_W - PADDING.left - PADDING.right;
    const maxVal = Math.max(...values) * 1.15 || 1;

    // Grid lines
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 0.5;
    for (let g = 0; g <= 4; g++) {
      const gx = PADDING.left + (barAreaW / 4) * g;
      ctx.beginPath();
      ctx.moveTo(gx, PADDING.top);
      ctx.lineTo(gx, PADDING.top + chartH);
      ctx.stroke();
    }

    const paletteRgb = [
      '#DC2626','#2563EB','#F59E0B','#10B981','#8B5CF6',
      '#EC4899','#06B6D4','#F97316','#84CC16','#6366F1',
    ];

    labels.forEach((lbl, i) => {
      const val = values[i] || 0;
      const barW = (val / maxVal) * barAreaW;
      const y = PADDING.top + i * (BAR_H + 12);

      // Label
      ctx.fillStyle = '#374151';
      ctx.font = 'bold 13px Arial';
      ctx.textAlign = 'right';
      const truncatedLbl = lbl.length > 28 ? lbl.substring(0, 25) + '...' : lbl;
      ctx.fillText(truncatedLbl, PADDING.left - 10, y + BAR_H / 2 + 5);

      // Bar (rounded)
      ctx.fillStyle = paletteRgb[i % paletteRgb.length];
      ctx.beginPath();
      ctx.roundRect(PADDING.left, y, Math.max(barW, 2), BAR_H, 4);
      ctx.fill();

      // Value label
      ctx.fillStyle = '#374151';
      ctx.font = '12px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(fmtNum(val, unit), PADDING.left + barW + 6, y + BAR_H / 2 + 5);
    });

    const blob = await canvas.convertToBlob({ type: 'image/png' });
    return await blob.arrayBuffer();
  } catch (e) {
    console.warn('Failed to render bar chart image', e);
    return null;
  }
}

/** Render a pie/donut chart to a PNG ArrayBuffer using Canvas API */
async function renderPieChartToImage(
  labels: string[], values: number[], title: string
): Promise<ArrayBuffer | null> {
  try {
    const SIZE = 600;
    const cx = SIZE / 2, cy = SIZE / 2;
    const R = 200, innerR = 100;
    const LEGEND_X = SIZE - 170;
    
    const canvas = new OffscreenCanvas(SIZE, SIZE);
    const ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
    if (!ctx) return null;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Title
    ctx.fillStyle = '#1E1E1E';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(title, cx - 80, 30);

    const total = values.reduce((a, b) => a + b, 0) || 1;
    const paletteRgb = [
      '#DC2626','#2563EB','#F59E0B','#10B981','#8B5CF6',
      '#EC4899','#06B6D4','#F97316','#84CC16','#6366F1',
    ];

    let startAngle = -Math.PI / 2;
    values.forEach((val, i) => {
      const slice = (val / total) * 2 * Math.PI;
      ctx.beginPath();
      ctx.moveTo(cx - 80, cy + 10);
      ctx.arc(cx - 80, cy + 10, R, startAngle, startAngle + slice);
      ctx.closePath();
      ctx.fillStyle = paletteRgb[i % paletteRgb.length];
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();
      startAngle += slice;
    });

    // Donut hole
    ctx.beginPath();
    ctx.arc(cx - 80, cy + 10, innerR, 0, 2 * Math.PI);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

    // Center text
    ctx.fillStyle = '#1E1E1E';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Total', cx - 80, cy + 6);
    ctx.fillText(fmtNum(total), cx - 80, cy + 24);

    // Legend
    values.forEach((val, i) => {
      const ly = 80 + i * 32;
      ctx.fillStyle = paletteRgb[i % paletteRgb.length];
      ctx.fillRect(LEGEND_X, ly, 14, 14);
      const pct = ((val / total) * 100).toFixed(1) + '%';
      const truncatedLbl = labels[i].length > 18 ? labels[i].substring(0, 15) + '...' : labels[i];
      ctx.fillStyle = '#374151';
      ctx.font = '11px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(truncatedLbl, LEGEND_X + 20, ly + 11);
      ctx.fillStyle = '#6B7280';
      ctx.fillText(pct, LEGEND_X + 20, ly + 23);
    });

    const blob = await canvas.convertToBlob({ type: 'image/png' });
    return await blob.arrayBuffer();
  } catch (e) {
    console.warn('Failed to render pie chart image', e);
    return null;
  }
}

export const generateWordReport = async (
  title: string,
  subtitle: string,
  period: string,
  sections?: ReportSection[]
): Promise<{ url: string; size: number }> => {
  const {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    BorderStyle, WidthType, HeadingLevel, ShadingType, PageBreak, AlignmentType
  } = await import('docx');

  const { ImageRun } = await import('docx');

  // Fetch logo as ArrayBuffer for Word's ImageRun
  let logoArrayBuffer: ArrayBuffer | null = null;
  try {
    const res = await fetch('/tifa_light.png');
    logoArrayBuffer = await res.arrayBuffer();
  } catch (e) {
    console.warn('Could not fetch logo for Word', e);
  }

  const coverChildren: any[] = [];

  // Spacer
  coverChildren.push(new Paragraph({ text: '', spacing: { after: 1200 } }));

  // Logo image
  if (logoArrayBuffer) {
    coverChildren.push(new Paragraph({
      children: [
        new ImageRun({
          data: logoArrayBuffer,
          transformation: { width: 150, height: 150 },
          type: 'png',
        } as any)
      ],
      spacing: { after: 600 },
    }));
  }

  // Title - large, bold, left-aligned like PDF
  coverChildren.push(new Paragraph({
    children: [new TextRun({ text: title.toUpperCase(), bold: true, size: 64, color: '1E1E1E' })],
    spacing: { after: 240 },
  }));

  // Subtitle
  if (subtitle) {
    coverChildren.push(new Paragraph({
      children: [new TextRun({ text: subtitle, size: 36, color: '4B4B4B' })],
      spacing: { after: 800 },
    }));
  }

  // Data Date label
  coverChildren.push(new Paragraph({
    children: [new TextRun({ text: 'Data Date', bold: true, size: 24, color: '1E1E1E' })],
    spacing: { after: 80 },
  }));

  // Period value - red, like PDF
  coverChildren.push(new Paragraph({
    children: [new TextRun({ text: period, size: 24, color: 'DC2626' })],
    spacing: { after: 400 },
  }));

  // Generated by label
  coverChildren.push(new Paragraph({
    children: [new TextRun({ text: 'GENERATED BY', bold: true, size: 18, color: '999999' })],
    spacing: { after: 80 },
  }));

  coverChildren.push(new Paragraph({
    children: [new TextRun({ text: 'TIFA (TelkomInfra AI Financial Assistant)', size: 18, color: 'DC2626', bold: true })],
    spacing: { after: 0 },
  }));

  const body: any[] = [...coverChildren];

  const cellBorders = {
    top:    { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
    left:   { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
    right:  { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
  };

  const sectionList = sections || [];
  for (let idx = 0; idx < sectionList.length; idx++) {
    const s = sectionList[idx];
    if (s.pageBreakBefore || idx === 0) {
      body.push(new Paragraph({ children: [new PageBreak()] }));
    }

    if (s.type === 'heading') {
      body.push(new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: s.text?.toUpperCase() || '', bold: true, size: 28, color: 'DC2626' })],
        spacing: { before: 300, after: 200 },
      }));

    } else if (s.type === 'text') {
      body.push(new Paragraph({
        children: [new TextRun({ text: s.text || '', size: 22, color: '444444' })],
        spacing: { after: 200 },
        alignment: AlignmentType.JUSTIFIED
      }));

    } else if (s.type === 'insight') {
      // Insight box (light red background)
      body.push(new Table({
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: s.text || '', size: 20, bold: true, color: '991B1B' })],
                    spacing: { before: 100, after: 100 }
                  })
                ],
                shading: { type: ShadingType.CLEAR, fill: 'FEF2F2' },
                margins: { top: 150, bottom: 150, left: 200, right: 200 },
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 3, color: 'DC2626' },
                  bottom: { style: BorderStyle.SINGLE, size: 1, color: 'FECACA' },
                  left: { style: BorderStyle.SINGLE, size: 3, color: 'DC2626' },
                  right: { style: BorderStyle.SINGLE, size: 1, color: 'FECACA' },
                }
              })
            ]
          })
        ],
        width: { size: 100, type: WidthType.PERCENTAGE },
      }));
      body.push(new Paragraph({ text: '', spacing: { after: 200 } }));

    } else if (s.type === 'table' && s.headers && s.rows) {
      if (s.title) {
        body.push(new Paragraph({
          children: [new TextRun({ text: s.title, bold: true, size: 24, color: '1E1E1E' })],
          spacing: { before: 200, after: 100 }
        }));
      }

      // Use single consistent header color (first palette color) matching PDF
      const headerFill = '1A1F36';

      body.push(new Table({
        rows: [
          new TableRow({
            tableHeader: true,
            children: s.headers.map(h => new TableCell({
              children: [new Paragraph({
                children: [new TextRun({ text: h, bold: true, color: 'FFFFFF', size: 18 })],
                alignment: AlignmentType.CENTER
              })],
              shading: { type: ShadingType.CLEAR, fill: headerFill },
              margins: { top: 120, bottom: 120, left: 120, right: 120 },
              borders: cellBorders
            })),
          }),
          ...s.rows.map((row, rIdx) => new TableRow({
            children: row.map((cell, cIdx) => new TableCell({
              children: [new Paragraph({
                children: [new TextRun({ text: String(cell), size: 18, color: '222222' })],
                alignment: cIdx === 0 ? AlignmentType.LEFT : AlignmentType.CENTER
              })],
              shading: { type: ShadingType.CLEAR, fill: rIdx % 2 === 0 ? 'FFFFFF' : 'F8FAFC' },
              margins: { top: 80, bottom: 80, left: 100, right: 100 },
              borders: cellBorders
            })),
          })),
        ],
        width: { size: 100, type: WidthType.PERCENTAGE },
      }));
      body.push(new Paragraph({ text: '', spacing: { after: 300 } }));

    } else if (s.type === 'bar_chart' && s.labels && s.values) {
      if (s.title) {
        body.push(new Paragraph({
          children: [new TextRun({ text: s.title, bold: true, size: 22, color: '1E1E1E' })],
          spacing: { before: 200, after: 120 }
        }));
      }

      // Try to render as canvas image
      const imgBuffer = await renderBarChartToImage(s.labels, s.values, s.title || '', s.unit);
      if (imgBuffer) {
        body.push(new Paragraph({
          children: [new ImageRun({
            data: imgBuffer,
            transformation: { width: 600, height: Math.max(120, s.labels.length * 44 + 100) },
            type: 'png',
          } as any)],
          spacing: { after: 300 }
        }));
      } else {
        // Fallback: visual table bar chart
        const maxVal = Math.max(...s.values) * 1.15 || 1;
        const noBorder = { style: BorderStyle.NONE, size: 0, color: 'auto' };
        const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideHorizontal: noBorder, insideVertical: noBorder };
        const barHexColors = ['DC2626','2563EB','F59E0B','10B981','8B5CF6','EC4899','06B6D4','F97316','84CC16','6366F1'];
        const chartRows: any[] = [];
        s.labels.forEach((lbl, i) => {
          const val = s.values![i] || 0;
          const pct = Math.max(1, Math.round((val / maxVal) * 55));
          const barColor = barHexColors[i % barHexColors.length];
          chartRows.push(new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: lbl, size: 18, bold: true, color: '333333' })], alignment: AlignmentType.RIGHT })],
                width: { size: 30, type: WidthType.PERCENTAGE },
                margins: { top: 60, bottom: 60, left: 100, right: 150 },
                borders: noBorders
              }),
              new TableCell({
                children: [new Paragraph({ text: '' })],
                width: { size: pct, type: WidthType.PERCENTAGE },
                shading: { type: ShadingType.CLEAR, fill: barColor },
                borders: noBorders
              }),
              new TableCell({
                children: [new Paragraph({ text: '' })],
                width: { size: 55 - pct, type: WidthType.PERCENTAGE },
                borders: noBorders
              }),
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: fmtNum(val, s.unit), size: 18, color: '555555' })] })],
                width: { size: 15, type: WidthType.PERCENTAGE },
                margins: { top: 60, bottom: 60, left: 80, right: 80 },
                borders: noBorders
              })
            ]
          }));
        });
        body.push(new Table({ rows: chartRows, width: { size: 100, type: WidthType.PERCENTAGE }, borders: noBorders }));
        body.push(new Paragraph({ text: '', spacing: { after: 300 } }));
      }

    } else if (s.type === 'pie_chart' && s.labels && s.values) {
      if (s.title) {
        body.push(new Paragraph({
          children: [new TextRun({ text: s.title, bold: true, size: 22, color: '1E1E1E' })],
          spacing: { before: 200, after: 120 }
        }));
      }

      const imgBuffer = await renderPieChartToImage(s.labels, s.values, s.title || '');
      if (imgBuffer) {
        body.push(new Paragraph({
          children: [new ImageRun({
            data: imgBuffer,
            transformation: { width: 500, height: 500 },
            type: 'png',
          } as any)],
          spacing: { after: 300 }
        }));
      } else {
        // Fallback: data table for pie chart
        const total = s.values.reduce((a, b) => a + b, 0) || 1;
        const noBorder = { style: BorderStyle.NONE, size: 0, color: 'auto' };
        const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideHorizontal: noBorder, insideVertical: noBorder };
        body.push(new Table({
          rows: [
            new TableRow({ children: ['Nama', 'Nilai', '%'].map(h => new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: 'FFFFFF', size: 18 })] })],
              shading: { type: ShadingType.CLEAR, fill: '1A1F36' },
              margins: { top: 100, bottom: 100, left: 100, right: 100 },
              borders: cellBorders
            })) }),
            ...s.labels.map((lbl, i) => new TableRow({ children: [lbl, fmtNum(s.values![i], s.unit), `${((s.values![i] / total) * 100).toFixed(1)}%`].map((cell) => new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: String(cell), size: 18, color: '333333' })] })],
              shading: { type: ShadingType.CLEAR, fill: i % 2 === 0 ? 'FFFFFF' : 'F8FAFC' },
              margins: { top: 80, bottom: 80, left: 100, right: 100 },
              borders: cellBorders
            }))}))
          ],
          width: { size: 100, type: WidthType.PERCENTAGE }
        }));
        body.push(new Paragraph({ text: '', spacing: { after: 300 } }));
      }
    }
  }

  // END OF REPORT
  body.push(new Paragraph({ children: [new PageBreak()] }));
  body.push(new Paragraph({ text: '', spacing: { after: 4000 } }));
  body.push(new Paragraph({
    children: [new TextRun({ text: 'End Of Report', bold: true, size: 56, color: 'DC2626' })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 }
  }));
  body.push(new Paragraph({
    children: [new TextRun({ text: 'Thank You', bold: true, size: 48, color: '333333' })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 1600 }
  }));
  body.push(new Paragraph({
    children: [new TextRun({ text: 'GENERATED BY', bold: true, size: 18, color: '888888' })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 }
  }));
  if (logoArrayBuffer) {
    body.push(new Paragraph({
      children: [new ImageRun({
        data: logoArrayBuffer,
        transformation: { width: 80, height: 80 },
        type: 'png',
      } as any)],
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 }
    }));
  }
  body.push(new Paragraph({
    children: [new TextRun({ text: 'TIFA (TelkomInfra AI Financial Assistant)', bold: true, size: 16, color: 'DC2626' })],
    alignment: AlignmentType.CENTER,
  }));

  const wordDoc = new Document({ sections: [{ properties: {}, children: body }] });
  const blob = await Packer.toBlob(wordDoc);
  return { url: URL.createObjectURL(blob), size: blob.size };
};

