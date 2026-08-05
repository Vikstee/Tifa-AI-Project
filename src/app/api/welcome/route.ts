import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: NextRequest) {
  try {
    const { historyTitles, userName } = await req.json();

    const grokKey = process.env.XAI_GROK_API_KEY || process.env.GROK_API_KEY || process.env.GROQ_API_KEY || '';

    if (!grokKey) {
      return NextResponse.json({
        subtitle: 'Asisten AI Keuangan TelkomInfra yang siap membantu Anda.',
        prompts: [
          { icon: '📊', text: 'Tampilkan status PO bulan ini', desc: 'Ringkasan Purchase Order aktif' },
          { icon: '💰', text: 'Analisis cash flow Q3 2024', desc: 'Arus kas masuk dan keluar' },
          { icon: '📋', text: 'Laporan aging piutang', desc: 'Piutang berdasarkan umur' },
          { icon: '🔍', text: 'Rekonsiliasi invoice outstanding', desc: 'Invoice yang belum terbayar' },
        ]
      }, { status: 200 });
    }

    // Fetch recent user messages across sessions to find frequent topics
    const { data: recentMessages } = await supabase
      .from('chat_messages')
      .select('content')
      .eq('role', 'user')
      .order('created_at', { ascending: false })
      .limit(20);

    const recentQueries = recentMessages?.map((m: any) => m.content).filter(c => c.length > 10) || [];

    const isXai = grokKey.startsWith('xai-');
    const endpoint = isXai ? 'https://api.x.ai/v1/chat/completions' : 'https://api.groq.com/openai/v1/chat/completions';
    const modelName = isXai ? 'grok-4.20-non-reasoning-latest' : 'llama-3.3-70b-versatile';

    const prompt = `Anda adalah TIFA (TelkomInfra Financial Assistant). 
Buatkan respon dalam format JSON yang berisi:
1. "subtitle": 1-2 kalimat singkat menyarankan bantuan (bahasa Indonesia). Jangan gunakan kata sapaan (Halo/Selamat pagi).
2. "prompts": Array berisi persis 4 objek rekomendasi. Setiap objek memiliki:
   - "icon": satu emoji relevan
   - "text": judul prompt singkat (maks 5-6 kata). Harus berupa pertanyaan/perintah yang bisa diklik user.
   - "desc": deskripsi singkat 3-5 kata

Konteks pengguna:
- Nama pengguna: ${userName || 'Pengguna'}.
- Riwayat topik pengguna ini: ${historyTitles && historyTitles.length > 0 ? historyTitles.join(', ') : 'Belum ada riwayat'}.
- Pertanyaan yang baru-baru ini / sering ditanyakan oleh semua user di database: ${recentQueries.length > 0 ? recentQueries.join(' | ') : 'Belum ada data'}.

Tugas Anda:
- Buat 4 prompts (kotak rekomendasi) berdasarkan "Pertanyaan yang baru-baru ini / sering ditanyakan" di atas agar relevan dengan apa yang dicari user akhir-akhir ini.
- PASTIKAN prompt yang Anda rekomendasikan SESUAI DENGAN KEMAMPUAN ANDA (bisa dijawab karena datanya ada di database seperti data_po-cashin). 
- Jika tidak ada data riwayat, buat 4 prompt standar terkait status PO, Cash flow, AR Aging, dan Rekonsiliasi.
HANYA kembalikan valid JSON tanpa markdown (tanpa \`\`\`json).`;

    const apiRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${grokKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3
      })
    });

    if (!apiRes.ok) {
      throw new Error(`HTTP ${apiRes.status}`);
    }

    const resData = await apiRes.json();
    let text = resData.choices?.[0]?.message?.content || '';
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    const parsed = JSON.parse(text);
    return NextResponse.json(parsed);

  } catch (error: any) {
    console.warn('[Tifa Welcome] Fallback triggered:', error?.message || error);

    let fallbackPrompts: any[] = [];
    try {
      const { data: recentMessages } = await supabase
        .from('chat_messages')
        .select('content')
        .eq('role', 'user')
        .order('created_at', { ascending: false })
        .limit(20);

      const recent = recentMessages?.map((m: any) => m.content).filter(c => c.length > 10) || [];
      const uniqueQueries = Array.from(new Set(recent)).slice(0, 4);
      const fallbackIcons = ['💬', '🔍', '📊', '💡'];

      if (uniqueQueries.length > 0) {
        fallbackPrompts = (uniqueQueries as string[]).map((q: string, idx: number) => ({
          icon: fallbackIcons[idx % fallbackIcons.length],
          text: q.length > 40 ? q.substring(0, 40) + '...' : q,
          desc: 'Riwayat pertanyaan'
        }));
      }
    } catch (e) {
      console.error('Failed to fetch fallback from DB', e);
    }

    if (fallbackPrompts.length === 0) {
      fallbackPrompts = [
        { icon: '📊', text: 'Tampilkan status PO bulan ini', desc: 'Ringkasan Purchase Order aktif' },
        { icon: '💰', text: 'Analisis cash flow Q3 2024', desc: 'Arus kas masuk dan keluar' },
        { icon: '📋', text: 'Laporan aging piutang', desc: 'Piutang berdasarkan umur' },
        { icon: '🔍', text: 'Rekonsiliasi invoice outstanding', desc: 'Invoice yang belum terbayar' },
      ];
    }

    return NextResponse.json(
      {
        subtitle: 'Asisten AI Keuangan TelkomInfra yang siap membantu Anda.',
        prompts: fallbackPrompts
      },
      { status: 200 }
    );
  }
}
