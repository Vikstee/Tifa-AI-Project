export interface ChatSession {
  id: string;
  title: string;
  timestamp: string;
}

export const mockHistory: ChatSession[] = [
  { id: 'chat-1', title: 'Status PO 45001239', timestamp: '2026-07-08T10:30:00Z' },
  { id: 'chat-2', title: 'Laporan Invoice Overdue', timestamp: '2026-07-07T14:15:00Z' },
  { id: 'chat-3', title: 'Ringkasan Eksekutif Q2', timestamp: '2026-07-05T09:00:00Z' },
  { id: 'chat-4', title: 'Prediksi Cash In Agustus', timestamp: '2026-07-01T11:45:00Z' },
  { id: 'chat-5', title: 'Daftar Kontrak Expire', timestamp: '2026-06-28T16:20:00Z' },
];

export const mockSuggestedPrompts = {
  'Purchase Order': ['PO mana yang sudah melewati SLA?', 'Status PO terbaru dari Vendor X'],
  'Sales Order': ['SO mana yang belum dibuat invoice?', 'Berapa total nilai SO bulan ini?'],
  Contract: ['Kontrak mana yang akan berakhir bulan depan?', 'Status realisasi Kontrak Telkomsel'],
  Invoice: [
    'Invoice mana yang overdue lebih dari 30 hari?',
    'Daftar invoice siap bayar minggu ini',
  ],
  'Cash In': ['Berapa cash in bulan ini?', 'Prediksi cash in bulan depan'],
  Project: ['Project mana yang cost overrun?', 'Progress project fiber optic Jakarta'],
  Executive: ['Ringkas kondisi PO to Cash In minggu ini', 'Top 5 risiko keterlambatan pembayaran'],
};

export const mockTableData = {
  columns: ['No. Dokumen', 'Nama Mitra', 'Nilai (IDR)', 'Status', 'Jatuh Tempo'],
  data: [
    ['INV-2026-07-001', 'PT. ABC Sukses', '150,000,000', 'Overdue 15 Hari', '2026-06-23'],
    ['INV-2026-07-002', 'PT. Maju Mundur', '45,500,000', 'Overdue 5 Hari', '2026-07-03'],
    ['INV-2026-07-003', 'CV. Aneka Jaya', '85,000,000', 'Akan Jatuh Tempo', '2026-07-15'],
    [
      'INV-2026-07-004',
      'PT. Teknologi Masa Depan',
      '210,000,000',
      'Akan Jatuh Tempo',
      '2026-07-20',
    ],
  ],
};

export const mockChartData = [
  { name: 'Jan', value: 120000000 },
  { name: 'Feb', value: 95000000 },
  { name: 'Mar', value: 150000000 },
  { name: 'Apr', value: 110000000 },
  { name: 'May', value: 180000000 },
  { name: 'Jun', value: 165000000 },
];
