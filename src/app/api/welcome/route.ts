import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: NextRequest) {
  try {
    const { historyTitles, userName } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    // Fetch the 20 most recent user messages across all sessions to find "frequently/recently asked" questions
    const { data: recentMessages } = await supabase
      .from('chat_messages')
      .select('content')
      .eq('role', 'user')
      .order('created_at', { ascending: false })
      .limit(20);

    const recentQueries = recentMessages?.map((m: any) => m.content).filter(c => c.length > 10) || [];

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    let prompt = `Anda adalah TIFA (TelkomInfra Financial Assistant). 
Buatkan respon dalam format JSON yang berisi:
1. "subtitle": 1-2 kalimat singkat menyarankan bantuan (bahasa Indonesia). Jangan gunakan kata sapaan (Halo/Selamat pagi).
2. "prompts": Array berisi persis 4 objek rekomendasi. Setiap objek memiliki:
   - "icon": satu emoji relevan
   - "text": judul prompt singkat (maks 5-6 kata). Harus berupa pertanyaan/perintah yang bisa diklik user.
   - "desc": deskripsi singkat 3-5 kata

Konteks pengguna:
- Riwayat topik pengguna ini: ${historyTitles && historyTitles.length > 0 ? historyTitles.join(', ') : 'Belum ada riwayat'}.
- Pertanyaan yang baru-baru ini / sering ditanyakan oleh semua user di database: ${recentQueries.length > 0 ? recentQueries.join(' | ') : 'Belum ada data'}.

Tugas Anda:
- Buat 4 prompts (kotak rekomendasi) berdasarkan "Pertanyaan yang baru-baru ini / sering ditanyakan" di atas agar relevan dengan apa yang dicari user akhir-akhir ini.
- PASTIKAN prompt yang Anda rekomendasikan SESUAI DENGAN KEMAMPUAN ANDA (bisa dijawab karena datanya ada di database seperti projects, purchase_orders, cash_in, invoices, contracts). 
- Jika tidak ada data riwayat, buat 4 prompt standar terkait status PO, Cash flow, AR Aging, dan Rekonsiliasi.
HANYA kembalikan valid JSON tanpa markdown (tanpa \`\`\`json).`;

    const result = await model.generateContent(prompt);
    let text = result.response.text();
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    const parsed = JSON.parse(text);

    return NextResponse.json(parsed);
  } catch (error: any) {
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
