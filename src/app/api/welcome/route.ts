import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: NextRequest) {
  try {
    const { historyTitles, userName } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    let prompt = `Anda adalah TIFA (TelkomInfra Financial Assistant). 
Buatkan respon dalam format JSON yang berisi:
1. "subtitle": 1-2 kalimat singkat menyarankan bantuan (bahasa Indonesia). Jangan gunakan kata sapaan (Halo/Selamat pagi).
2. "prompts": Array berisi persis 4 objek rekomendasi. Setiap objek memiliki:
   - "icon": satu emoji relevan
   - "text": judul prompt singkat (maks 5-6 kata)
   - "desc": deskripsi singkat 3-5 kata

Konteks pengguna:
Riwayat topik pencarian baru-baru ini: ${historyTitles && historyTitles.length > 0 ? historyTitles.join(', ') : 'Belum ada riwayat'}.

Tugas Anda:
- Buat subtitle yang menyarankan tindak lanjut dari riwayat secara halus (jika ada) atau saran umum analisis keuangan, PO to Cash.
- Buat 4 prompts. Kombinasikan hal yang mungkin sedang dibahas pengguna dari riwayatnya dengan fitur umum terkait keuangan.
HANYA kembalikan valid JSON tanpa markdown (tanpa \`\`\`json).`;

    const result = await model.generateContent(prompt);
    let text = result.response.text();
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    const parsed = JSON.parse(text);

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Error generating welcome message:', error);
    return NextResponse.json(
      { 
        subtitle: 'Asisten AI Keuangan TelkomInfra yang siap membantu analisis PO hingga Cash Flow Anda.',
        prompts: [
          { icon: '📊', text: 'Tampilkan status PO bulan ini', desc: 'Ringkasan Purchase Order aktif' },
          { icon: '💰', text: 'Analisis cash flow Q3 2024', desc: 'Arus kas masuk dan keluar' },
          { icon: '📋', text: 'Laporan aging piutang', desc: 'Piutang berdasarkan umur' },
          { icon: '🔍', text: 'Rekonsiliasi invoice outstanding', desc: 'Invoice yang belum terbayar' },
        ]
      },
      { status: 200 }
    );
  }
}
