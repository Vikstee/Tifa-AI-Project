// Imports are now dynamic to reduce First Load JS
// Helper to generate dummy data based on report type
const getDummyData = (reportType: string, period: string) => {
  if (reportType.includes('PO Outstanding')) {
    return [
      ['No', 'PO Number', 'Vendor', 'Date', 'Amount (Rp)', 'Status', 'Due Date'],
      ['1', 'PO-2024-001', 'PT Maju Jaya', '2024-10-01', '150,000,000', 'Outstanding', '2024-10-15'],
      ['2', 'PO-2024-002', 'CV Teknologi Abadi', '2024-10-03', '75,500,000', 'Outstanding', '2024-10-17'],
      ['3', 'PO-2024-005', 'PT Sarana Berkat', '2024-10-05', '210,000,000', 'Outstanding', '2024-10-20'],
      ['4', 'PO-2024-008', 'Vendor Lokal X', '2024-10-10', '45,000,000', 'Outstanding', '2024-10-25'],
      ['5', 'PO-2024-012', 'PT Solusi Pratama', '2024-10-12', '320,000,000', 'Outstanding', '2024-10-26'],
    ];
  }
  if (reportType.includes('Cash Flow')) {
    return [
      ['Date', 'Description', 'Category', 'Inflow (Rp)', 'Outflow (Rp)', 'Balance (Rp)'],
      ['2024-10-01', 'Opening Balance', 'Balance', '-', '-', '1,500,000,000'],
      ['2024-10-05', 'Payment from Telkomsel', 'Revenue', '500,000,000', '-', '2,000,000,000'],
      ['2024-10-10', 'Vendor Payment (PT Maju Jaya)', 'Expense', '-', '150,000,000', '1,850,000,000'],
      ['2024-10-15', 'Operational Costs', 'Expense', '-', '75,000,000', '1,775,000,000'],
    ];
  }
  // Default fallback data
  return [
    ['ID', 'Description', 'Amount', 'Date'],
    ['1', 'Dummy Item A', '1000', '2024-01-01'],
    ['2', 'Dummy Item B', '2000', '2024-01-02'],
  ];
};

const getDummyAnalysis = (reportType: string) => {
  if (reportType.includes('PO Outstanding')) {
    return [
      "RINGKASAN EKSEKUTIF",
      "Laporan ini memberikan tinjauan menyeluruh terhadap status Purchase Order (PO) yang berstatus 'Outstanding' hingga akhir periode tinjauan. Dari analisis data, ditemukan 5 PO utama yang belum diselesaikan dengan total akumulasi kewajiban mencapai lebih dari Rp 750.000.000. Tingkat Outstanding ini mengindikasikan adanya potensi bottleneck pada rantai pasok (supply chain) atau penundaan penyelesaian administratif di pihak vendor maupun internal procurement.",
      "",
      "ANALISIS MENDALAM & TEMUAN KUNCI",
      "1. Konsentrasi Kewajiban pada Vendor Utama: Vendor 'PT Solusi Pratama' menyumbang porsi kewajiban terbesar yakni Rp 320.000.000 (sekitar 42% dari total outstanding). Tingginya eksposur pada satu vendor ini menimbulkan risiko konsentrasi yang signifikan. Keterlambatan pengiriman atau penyelesaian kontrak dari vendor ini dapat berdampak langsung pada milestone proyek operasional.",
      "2. Tren Jatuh Tempo (Aging Analysis): Dari 5 PO yang berstatus outstanding, seluruhnya memiliki tanggal jatuh tempo dalam kurun waktu 15 hingga 26 Oktober 2024. Hal ini menunjukkan adanya penumpukan tagihan (invoice stacking) pada pertengahan hingga akhir bulan, yang berpotensi memberikan tekanan arus kas (cash flow pressure) yang cukup tinggi dalam jendela waktu yang sempit.",
      "3. Kesenjangan SLA (Service Level Agreement): Terdapat interval waktu rata-rata 14 hari antara tanggal penerbitan PO hingga tanggal jatuh tempo yang diekspektasikan. Namun, status 'Outstanding' yang berlarut-larut mengisyaratkan bahwa proses delivery barang/jasa atau verifikasi BAST (Berita Acara Serah Terima) membutuhkan waktu lebih lama dari estimasi awal.",
      "",
      "REKOMENDASI STRATEGIS (TINDAK LANJUT)",
      "• Tindakan Segera (Short-term): Bentuk task force kecil antara tim Procurement, Finance, dan User (Operasional) untuk segera memvalidasi status BAST dari PT Solusi Pratama dan PT Sarana Berkat. Pastikan tidak ada dispute yang menghalangi proses invoicing.",
      "• Mitigasi Risiko Arus Kas: Tim Treasury harus segera mengalokasikan pencadangan dana sebesar Rp 750.500.000 untuk mengantisipasi klaster penagihan pada periode 15-26 Oktober, demi menghindari penalty keterlambatan pembayaran.",
      "• Perbaikan Proses (Long-term): Terapkan sistem Vendor Performance Management System (VPMS) secara ketat untuk mengevaluasi ketepatan waktu vendor. Vendor dengan SLA pengiriman yang konsisten meleset harus ditinjau ulang kontraknya, atau diberlakukan skema term of payment yang lebih ketat berbasis milestone."
    ];
  }
  if (reportType.includes('Cash Flow')) {
    return [
      "RINGKASAN EKSEKUTIF",
      "Laporan Arus Kas (Cash Flow) periode ini menunjukkan posisi likuiditas yang cukup tangguh, diawali dengan saldo kas (Opening Balance) sebesar Rp 1.500.000.000. Secara keseluruhan, perusahaan mencatat arus kas masuk yang solid dari klien utama, yang secara efektif menutupi seluruh kebutuhan modal kerja operasional jangka pendek, sehingga mempertahankan saldo kas akhir pada posisi yang sangat aman yakni Rp 1.775.000.000.",
      "",
      "ANALISIS LIKUIDITAS & KOMPONEN ARUS KAS",
      "1. Analisis Arus Kas Masuk (Inflow): Pemasukan dominan pada periode ini bersumber dari pencairan piutang Telkomsel sebesar Rp 500.000.000. Realisasi penerimaan ini sangat krusial karena menyumbang 100% dari total cash inflow bulan ini. Ketergantungan pada satu klien besar (anchor client) menunjukkan stabilitas pendapatan, namun juga memunculkan risiko konsentrasi piutang (Account Receivable concentration risk).",
      "2. Analisis Arus Kas Keluar (Outflow): Total cash outflow tercatat sebesar Rp 225.000.000. Dari jumlah tersebut, pengeluaran terbesar dialokasikan untuk pembayaran vendor (PT Maju Jaya) senilai Rp 150.000.000. Biaya operasional rutin hanya mengonsumsi Rp 75.000.000. Struktur pengeluaran ini sangat sehat, di mana rasio biaya operasional terhadap pemasukan berada pada angka 15%, jauh di bawah ambang batas kritis.",
      "3. Analisis Posisi Kas Akhir (Ending Balance): Dengan saldo kas akhir Rp 1.775.000.000, perusahaan memiliki Cash Coverage Ratio yang sangat tinggi. Perusahaan memiliki ruang fiskal (fiscal space) yang cukup luas untuk berekspansi, melakukan investasi instrumen likuid jangka pendek, atau mempercepat pelunasan utang berbunga tinggi (jika ada).",
      "",
      "REKOMENDASI STRATEGIS (TINDAK LANJUT)",
      "• Optimalisasi Dana Menganggur (Idle Cash Management): Dengan kelebihan likuiditas yang mencapai Rp 1,77 Miliar, sangat direkomendasikan agar tim Finance & Treasury menempatkan sekitar 40-50% dari dana idle tersebut ke dalam instrumen investasi jangka pendek berisiko rendah (seperti deposito on-call atau reksadana pasar uang) untuk mendapatkan tambahan yield (pendapatan bunga) tanpa mengorbankan likuiditas.",
      "• Diversifikasi Sumber Pemasukan: Meskipun pembayaran dari Telkomsel sangat menopang arus kas, perusahaan perlu mengakselerasi penagihan (collection) dari klien-klien sekunder lainnya untuk menyeimbangkan rasio Account Receivables Turnover.",
      "• Negosiasi Terms of Payment: Dengan posisi kas yang kuat, perusahaan memiliki daya tawar tinggi. Pertimbangkan untuk menawarkan pembayaran dipercepat (early payment) kepada vendor strategis dengan syarat mereka memberikan diskon (early payment discount) sebesar 2-3%."
    ];
  }
  return [
    "RINGKASAN EKSEKUTIF",
    "Data menunjukkan stabilitas pada periode ini tanpa anomali yang signifikan. Seluruh indikator kinerja finansial berada dalam rentang toleransi yang ditetapkan.",
    "",
    "ANALISIS MENDALAM",
    "Tidak ada lonjakan biaya atau penundaan penerimaan yang berisiko mengganggu operasional. Sistem pencatatan berjalan baik dan rekonsiliasi data antara sub-ledger dan general ledger menunjukkan kesesuaian 100%.",
    "",
    "REKOMENDASI STRATEGIS (TINDAK LANJUT)",
    "• Lanjutkan prosedur pemantauan transaksi harian dengan disiplin kontrol yang ada.",
    "• Lakukan audit internal secara berkala untuk memastikan kepatuhan prosedur tetap terjaga."
  ];
};

export const generatePDFReport = async (reportType: string, period: string): Promise<string> => {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  const doc = new jsPDF('landscape');
  
  const data = getDummyData(reportType, period);
  const headers = data[0];
  const body = data.slice(1);

  doc.setFontSize(18);
  doc.setTextColor(220, 38, 38); // Telkom red
  doc.text('TelkomInfra', 14, 22);
  
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(reportType, 14, 32);
  
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text(`Period: ${period}`, 14, 40);

  autoTable(doc, {
    startY: 45,
    head: [headers],
    body: body,
    theme: 'grid',
    headStyles: { fillColor: [220, 38, 38] },
    styles: { fontSize: 10, cellPadding: 5 },
    alternateRowStyles: { fillColor: [245, 245, 245] }
  });

  const finalY = (doc as any).lastAutoTable.finalY || 45;
  const analysisLines = getDummyAnalysis(reportType);
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;
  
  let currentY = finalY + 15;
  
  // --- ADD CHART ---
  if (currentY + 100 > pageHeight - 20) {
    doc.addPage();
    currentY = 20;
  }
  
  const chartData = reportType.includes('PO Outstanding') ? [
      { label: 'PT Maju', values: [ {color: [225, 29, 72], val: 150} ] },
      { label: 'CV Tekno', values: [ {color: [225, 29, 72], val: 75} ] },
      { label: 'PT Sarana', values: [ {color: [225, 29, 72], val: 210} ] },
      { label: 'Vendor X', values: [ {color: [225, 29, 72], val: 45} ] },
      { label: 'PT Solusi', values: [ {color: [225, 29, 72], val: 320} ] },
  ] : [
      { label: 'Juli', values: [ {color: [225, 29, 72], val: 1500}, {color: [59, 130, 246], val: -500}, {color: [245, 158, 11], val: 200}, {color: [16, 185, 129], val: 1200} ] },
      { label: 'Agustus', values: [ {color: [225, 29, 72], val: 1800}, {color: [59, 130, 246], val: -700}, {color: [245, 158, 11], val: -100}, {color: [16, 185, 129], val: 1000} ] },
      { label: 'September', values: [ {color: [225, 29, 72], val: 1600}, {color: [59, 130, 246], val: -400}, {color: [245, 158, 11], val: 300}, {color: [16, 185, 129], val: 1500} ] },
  ];
  
  const chartTitle = reportType.includes('PO Outstanding') ? 'Grafik PO Outstanding per Vendor (Juta Rp)' : 'Arus Kas Utama per Bulan Q3 2024 (dalam Juta Rupiah)';
  
  // Draw chart box
  doc.setDrawColor(230, 230, 230);
  doc.setFillColor(252, 252, 252);
  doc.roundedRect(14, currentY, pageWidth - 28, 90, 3, 3, 'FD');
  
  doc.setFontSize(11);
  doc.setTextColor(50, 50, 50);
  doc.text(chartTitle, 20, currentY + 12);
  
  const chartX = 28;
  const chartY = currentY + 25;
  const chartW = pageWidth - 50;
  const chartH = 50;
  
  let maxVal = 0;
  let minVal = 0;
  chartData.forEach(d => d.values.forEach(v => {
    if (v.val > maxVal) maxVal = v.val;
    if (v.val < minVal) minVal = v.val;
  }));
  
  maxVal = Math.ceil(maxVal / 100) * 100 + 100;
  minVal = Math.floor(minVal / 100) * 100 - 100;
  if (minVal > 0) minVal = 0;
  
  const range = maxVal - minVal;
  const zeroY = chartY + (maxVal / range) * chartH;
  
  // axes
  doc.setDrawColor(200, 200, 200);
  doc.line(chartX, chartY, chartX, chartY + chartH);
  doc.line(chartX, zeroY, chartX + chartW, zeroY);
  
  // y labels
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(maxVal.toString(), chartX - 20, chartY + 3);
  doc.text("0", chartX - 10, zeroY + 3);
  if (minVal < 0) doc.text(minVal.toString(), chartX - 22, chartY + chartH + 3);
  
  // Draw Legend (for Cash Flow)
  if (!reportType.includes('PO Outstanding')) {
    doc.setFillColor(225, 29, 72); doc.rect(pageWidth - 110, currentY + 8, 4, 4, 'F'); doc.text('Operasi', pageWidth - 104, currentY + 11);
    doc.setFillColor(59, 130, 246); doc.rect(pageWidth - 85, currentY + 8, 4, 4, 'F'); doc.text('Investasi', pageWidth - 79, currentY + 11);
    doc.setFillColor(245, 158, 11); doc.rect(pageWidth - 60, currentY + 8, 4, 4, 'F'); doc.text('Pendanaan', pageWidth - 54, currentY + 11);
    doc.setFillColor(16, 185, 129); doc.rect(pageWidth - 35, currentY + 8, 4, 4, 'F'); doc.text('Arus Kas Bersih', pageWidth - 29, currentY + 11);
  }
  
  const groupWidth = chartW / chartData.length;
  chartData.forEach((d, i) => {
    const groupX = chartX + (i * groupWidth);
    const barWidth = (groupWidth - 20) / d.values.length;
    
    doc.text(d.label, groupX + groupWidth/2 - 10, chartY + chartH + 10);
    
    d.values.forEach((v: any, j: number) => {
      const barH = (Math.abs(v.val) / range) * chartH;
      const barX = groupX + 10 + (j * barWidth);
      let barY = zeroY;
      
      if (v.val > 0) {
        barY = zeroY - barH;
      }
      
      doc.setFillColor(v.color[0], v.color[1], v.color[2]);
      doc.rect(barX, barY, barWidth - 2, barH, 'F');
    });
  });
  
  currentY += 105;
  // --- END CHART ---
  
  if (currentY > pageHeight - 20) {
    doc.addPage();
    currentY = 20;
  }
  
  doc.setFontSize(14);
  doc.setTextColor(220, 38, 38);
  doc.text('Analisis & Insight Profesional LLM', 14, currentY);
  
  currentY += 10;
  
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);
  
  analysisLines.forEach(line => {
    if (line.toUpperCase() === line && line.trim() !== '') {
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      currentY += 5; 
    } else {
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
    }
    
    const splitLine = doc.splitTextToSize(line, pageWidth - 28);
    
    if (currentY + (splitLine.length * 6) > pageHeight - 15) {
      doc.addPage();
      currentY = 20;
    }
    
    doc.text(splitLine, 14, currentY);
    currentY += splitLine.length * 5 + 3; 
  });

  const blob = doc.output('blob');
  return URL.createObjectURL(blob);
};

export const generateExcelReport = async (reportType: string, period: string): Promise<string> => {
  const XLSX = await import('xlsx');
  
  const data = getDummyData(reportType, period);
  const analysisLines = getDummyAnalysis(reportType);
  
  const worksheet = XLSX.utils.aoa_to_sheet([
    [`TelkomInfra - ${reportType}`],
    [`Period: ${period}`],
    [], // empty row
    ...data,
    [],
    [],
    ['Analisis & Insight LLM'],
    ...analysisLines.map(line => [line])
  ]);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
  
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  return URL.createObjectURL(blob);
};

export const generateWordReport = async (reportType: string, period: string): Promise<string> => {
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, BorderStyle, WidthType } = await import('docx');

  const data = getDummyData(reportType, period);
  
  const tableRows = data.map((row, rowIndex) => {
    return new TableRow({
      children: row.map(cellText => 
        new TableCell({
          children: [new Paragraph({ text: String(cellText) })],
          shading: rowIndex === 0 ? { fill: "DC2626" } : undefined,
        })
      ),
    });
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: "TelkomInfra", bold: true, size: 36, color: "DC2626" }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: reportType, bold: true, size: 28 }),
            ],
            spacing: { before: 200, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Period: ${period}`, size: 24, color: "666666" }),
            ],
            spacing: { after: 400 },
          }),
          new Table({
            rows: tableRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
              left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
              right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
            }
          }),
          new Paragraph({ text: "", spacing: { after: 400 } }),
          new Paragraph({
            children: [
              new TextRun({ text: "Analisis & Insight LLM", bold: true, size: 28, color: "DC2626" }),
            ],
            spacing: { before: 200, after: 200 },
          }),
          ...getDummyAnalysis(reportType).map(line => 
            new Paragraph({
              children: [new TextRun({ text: line, size: 22, color: "444444" })],
              spacing: { after: 120 }
            })
          ),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  return URL.createObjectURL(blob);
};
