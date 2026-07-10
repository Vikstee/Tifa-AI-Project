import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: NextRequest) {
  try {
    const { historyTitles, userName } = await req.json();

    const apiKeyString = process.env.GEMINI_API_KEY || '';
    const apiKey = apiKeyString.split(',')[0].trim();
    
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
1. "subtitle": 1 kalimat singkat menyarankan bantuan.
2. "prompts": Array berisi persis 4 objek rekomendasi. Setiap objek memiliki:
   - "icon": satu emoji relevan
   - "text": judul prompt singkat (maks 6 kata).
   - "desc": deskripsi singkat 3-5 kata

Konteks Database:
Riwayat pencarian user akhir-akhir ini: ${recentQueries.length > 0 ? recentQueries.join(' | ') : 'Tampilkan status PO, Analisis cash flow, Laporan aging, Rekonsiliasi invoice'}.

Tugas Anda SANGAT KRITIKAL:
- Anda WAJIB membuat 4 prompts yang isinya MENGAMBIL INSPIRASI LANGSUNG dari "Riwayat pencarian user akhir-akhir ini" di atas.
- Jangan gunakan template default jika ada riwayat pencarian!
- HANYA kembalikan valid JSON tanpa markdown.`;

    const result = await model.generateContent(prompt);
    let text = result.response.text();
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    const parsed = JSON.parse(text);

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error('Error generating welcome message:', error);
    return NextResponse.json(
      { 
        subtitle: `Error: ${error.message || 'Unknown Error'}`,
        prompts: [
          { icon: '⚠️', text: 'Error', desc: error.message || 'Error API' },
          { icon: '💰', text: 'Analisis cash flow Q3 2024', desc: 'Arus kas masuk dan keluar' },
          { icon: '📋', text: 'Laporan aging piutang', desc: 'Piutang berdasarkan umur' },
          { icon: '🔍', text: 'Rekonsiliasi invoice outstanding', desc: 'Invoice yang belum terbayar' },
        ]
      },
      { status: 200 }
    );
  }
}
