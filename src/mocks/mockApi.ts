import { mockTableData, mockChartData } from './mockData';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const fakeLogin = async (email: string, password: string) => {
  await delay(1500); // Simulate network latency
  if (!email || !password) {
    throw new Error('Email dan password wajib diisi');
  }
  return {
    token: 'mock-jwt-token-123456789',
    user: {
      id: 'usr-001',
      name: 'Viki Firmansyah',
      email: email,
      whatsapp: '6281234567890',
    },
  };
};

export const fakeSendMessage = async (message: string, onStreamUpdate: (text: string) => void) => {
  await delay(500); // Initial processing delay

  const fakeResponse = `Berdasarkan data yang ada, berikut adalah rincian untuk: "${message}". Data ini diambil secara realtime dari dummy database.`;

  // Simulate streaming
  let currentText = '';
  const words = fakeResponse.split(' ');

  for (let i = 0; i < words.length; i++) {
    currentText += (i === 0 ? '' : ' ') + words[i];
    onStreamUpdate(currentText);
    await delay(30 + Math.random() * 50); // Random delay per word
  }

  await delay(200);

  return {
    text: currentText,
    table: Math.random() > 0.5 ? mockTableData : null,
    chart: Math.random() > 0.5 ? mockChartData : null,
    modelUsed: 'Gemini Flash 1.5',
  };
};

export const fakeGenerateReport = async (format: string, period: string) => {
  await delay(3000); // Simulate processing time for generating report
  return {
    url: `/dummy-reports/laporan_${format.toLowerCase()}_${Date.now()}.${format.toLowerCase()}`,
    filename: `Laporan_Keuangan_${period}.${format.toLowerCase()}`,
    format,
  };
};

export const fakeUploadFiles = async (files: File[]) => {
  await delay(2000); // Simulate upload time
  return files.map((f) => ({
    name: f.name,
    status: 'Success',
    rowsParsed: Math.floor(Math.random() * 1000),
  }));
};
