import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { dbToolsDefinitions } from '@/lib/ai/geminiTools';
import { lookupRecord, filterRecords, aggregateRecords } from '@/lib/db/supabaseQueries';
import { aggregateChartPython, predictCashflowPython, detectAnomalyPython } from '@/lib/api/pythonClient';

const apiKeyString = process.env.GEMINI_API_KEY || '';
// Parse comma-separated API keys
const apiKeys = apiKeyString.split(',').map(k => k.trim()).filter(k => k.length > 0);

// ===== STICKY ROUND-ROBIN KEY ROTATION =====
// Persists across requests in the same server process (warm instance).
// Starts from the last successful key — only advances when rate-limited.
// Cycles back to key[0] after the last key is exhausted.
let currentKeyIndex = 0;
// ===========================================

// ===== SMART MODEL ROUTING =====
// Classifies prompt complexity locally (zero tokens) to pick the right model.
// LITE model = fast response for simple queries.
// FULL model = powerful model for heavy analysis/charts.
const LITE_MODEL = 'gemini-flash-lite-latest';
const FULL_MODEL = 'gemini-flash-lite-latest'; // fallback: same model until flash-latest quota resets

function classifyPrompt(text: string): 'lite' | 'full' {
  const lower = text.toLowerCase();
  const heavyKeywords = [
    // Charts & Visualisasi
    'chart', 'grafik', 'pie', 'bar chart', 'line chart', 'donut', 'histogram', 'diagram',
    // Laporan
    'laporan', 'report', 'pdf', 'excel', 'word', 'unduh', 'download', 'ekspor', 'export',
    // Analisis Kompleks
    'analisis', 'analisa', 'tren', 'trend', 'prediksi', 'forecasting', 'proyeksi',
    'anomali', 'anomaly', 'deteksi', 'detect',
    // Multi-step / Kombinasi
    'all-in-one', 'sekaligus', 'laporan lengkap', 'laporan eksekutif', 'dashboard',
    'rangkuman lengkap', 'ringkasan lengkap', 'semua data',
    // Ranking & Perbandingan
    'ranking', 'peringkat', 'top 10', 'top 5', 'top-10', 'top-5', 'terbesar', 'terkecil',
    'perbandingan', 'bandingkan', 'vs ', 'versus',
    // Agregasi Kompleks
    'outstanding', 'aging', 'dso', 'overdue', 'jatuh tempo', 'profit', 'margin',
    // Multi-permintaan
    '1.', '2.', '3.', // numbered lists in prompt = multi-step
  ];

  const isHeavy = heavyKeywords.some(kw => lower.includes(kw));
  const model = isHeavy ? 'full' : 'lite';
  console.log(`[Tifa] Prompt classified as: ${model.toUpperCase()} | Trigger: "${lower.substring(0, 60)}..."`);
  return model;
}
// ===================================
const SYSTEM_INSTRUCTION = `Kamu adalah TIFA (TelkomInfra AI Financial Assistant).
Berikan jawaban yang terstruktur, rapi, dan enak dibaca. Gunakan poin-poin (bullet points/numbered lists). Gunakan kalimat yang natural dan sesekali gunakan emoticon. Jawab dalam bahasa Indonesia.

═══════════════════════════════════════
⛔ ATURAN MUTLAK YANG TIDAK BOLEH DILANGGAR:
═══════════════════════════════════════
1. JANGAN PERNAH memberikan alasan seperti "sistem sedang maintenance", "fitur tidak tersedia", "grafik tidak bisa ditampilkan", atau alasan teknis lainnya. Semua fitur SELALU tersedia.
2. Jika pengguna meminta BEBERAPA hal sekaligus (misalnya tabel + pie chart + bar chart + insight), kamu WAJIB menyelesaikan SEMUA permintaan tersebut tanpa terkecuali. TIDAK BOLEH melewati salah satunya.
3. JANGAN MENGARANG DATA ANGKA atau status apapun. Semua data harus diambil dari database melalui tools yang tersedia.
4. Jangan pernah mengatakan kamu "tidak bisa" menghasilkan grafik. Kamu SELALU bisa menghasilkan json_chart.
═══════════════════════════════════════

KONEKSI DATABASE: Kamu terhubung ke database asli melalui Function Calling (tools).
- Wajib panggil tools untuk: total uang (agregasi), cari data (filter), cek status.
- Hemat token: filterRecords maksimal 10 baris, gunakan selectColumns secukupnya.
- Gunakan orderColumn + orderAscending untuk data Terbesar/Terkecil/Terbaru.

CARA MENANGANI PERMINTAAN MULTI-ITEM:
Jika pengguna meminta beberapa hal (contoh: "Buatkan tabel X, pie chart Y, bar chart Z, dan insight W"), kamu HARUS:
  1. Panggil tool database untuk setiap item yang membutuhkan data.
  2. Hasilkan SEMUA output yang diminta: tabel markdown + json_chart + teks insight.
  3. Lakukan secara berurutan, satu per satu, hingga semua selesai.
  4. Jangan berhenti di tengah jalan.

FORMAT GRAFIK — Gunakan blok kode json_chart untuk SETIAP permintaan grafik:
PENTING: Maksimal 10-15 item per grafik. Gabungkan sisanya sebagai "Lainnya".

\`\`\`json_chart
{
  "type": "bar",
  "title": "Judul Grafik",
  "xAxisKey": "kategori",
  "keys": ["Nilai"],
  "data": [
    {"kategori": "A", "Nilai": 100},
    {"kategori": "B", "Nilai": 120}
  ]
}
\`\`\`

Untuk pie chart gunakan type "pie", untuk grafik garis gunakan type "line".
Untuk setiap grafik, WAJIB sertakan blok json_chart — bukan teks deskripsi grafik, bukan ASCII art.

FORMAT LAPORAN — Ketika pengguna meminta PDF/Excel/Word, kamu WAJIB:
1. Ambil semua data yang diperlukan dari database menggunakan tools SESUAI PERMINTAAN USER.
2. Hasilkan blok json_report dengan SELURUH konten laporan dalam array "sections".
3. Setiap section harus berisi data NYATA dari database — bukan placeholder.
4. Konten laporan SESUAI dengan apa yang diminta user — bukan hanya dari riwayat chat.

ATURAN PENULISAN LAPORAN (WAJIB DIIKUTI):
- Setiap section visual (table, bar_chart, pie_chart) HARUS didahului oleh section "text" yang menjelaskan konteks data tersebut (1-3 kalimat).
- Setiap section visual HARUS diikuti oleh section "text" singkat berisi temuan/kesimpulan dari data tersebut.
- Laporan harus mengalir seperti narasi analisis: heading → penjelasan → data → kesimpulan → heading berikutnya.
- Insight di akhir harus berisi rekomendasi yang konkret dan spesifik berdasarkan angka nyata.

Tipe section:
- {"type": "heading", "text": "1. Judul Section", "pageBreakBefore": boolean}
- {"type": "text", "text": "Narasi penjelasan sebelum atau sesudah data..."}
- {"type": "table", "title": "Judul Tabel", "headers": ["Kol1","Kol2"], "rows": [["val1","val2"]]}
- {"type": "bar_chart", "title": "Judul", "labels": ["A","B"], "values": [100,200], "unit": "Jt"}
- {"type": "pie_chart", "title": "Judul", "labels": ["A","B"], "values": [604,596]}
- {"type": "insight", "text": "Kesimpulan dan rekomendasi konkret berdasarkan angka nyata..."}

CONTOH STRUKTUR YANG BENAR (ikuti pola ini):
\`\`\`json_report
{
  "title": "REPORT SID AGING",
  "subtitle": "Laporan All SID",
  "format": "PDF",
  "period": "14 July 2026",
  "sections": [
    {"type": "heading", "text": "EXECUTIVE SUMMARY", "pageBreakBefore": false},
    {"type": "text", "text": "Berikut adalah ringkasan eksekutif untuk data aging. Dominasi masih dipegang oleh portfolio tertentu."},
    {"type": "bar_chart", "title": "Aging Process Closed", "labels": ["Maximum","Average"], "values": [1760,25], "unit": "Days"},
    {"type": "bar_chart", "title": "Aging Open In Cycle", "labels": ["Maximum","Average"], "values": [1686,357], "unit": "Days"},
    {"type": "heading", "text": "DETAILED LIST", "pageBreakBefore": true},
    {"type": "text", "text": "Berikut adalah rincian data untuk proyek yang perlu mendapatkan perhatian khusus."},
    {"type": "table", "title": "List Aging Open In Cycle", "headers": ["No", "Unit Name", "Aging Process Closed (Max)", "Aging Open In Cycle (Max)", "Progress (Days)", "Status"], "rows": [["1","MANAGED SERVICE & OPERATION","1548","488","146","Increased"], ["2","PROJECT & SERVICE DELIVERY 02","1513","29","76","Increased"]]},
    {"type": "heading", "text": "CLOSING", "pageBreakBefore": true},
    {"type": "insight", "text": "KESIMPULAN: Pertahankan kinerja pada proyek-proyek ini karena menjadi pilar utama."}
  ]
}
\`\`\`

PENTING: 
1. Isi rows tabel dan values chart dengan data NYATA dari database. 
2. OTOMATISASI STRUKTUR: Meskipun user HANYA meminta tabel data (misal: "tampilkan top 10 aging"), Anda WAJIB SECARA OTOMATIS membuatkan bab EXECUTIVE SUMMARY (lengkap dengan visual chart seperti bar_chart/pie_chart) dan bab CLOSING yang relevan dengan konteks. JANGAN PERNAH membuat laporan yang hanya berisi tabel saja! Selalu gunakan struktur 3 Bab penuh.
3. TABEL HARUS KOMPREHENSIF! Jika tabel menunjukkan data atau peringkat (misal "Top 10 Aging"), Anda WAJIB menampilkan METRIK/ANGKA pendukung di kolom tabel (misal: Nilai Aging Days, Nilai Tagihan, Status, dll). JANGAN PERNAH membuat tabel yang hanya berisi "Nama Proyek" dan "Portfolio" saja (minimal 5-7 kolom). Data yang menjadi alasan masuk 'Top 10' harus ditampilkan!
4. LABEL & NAMA HARUS HUMAN-READABLE! JANGAN PERNAH menggunakan kode sistem seperti "SID" atau "ID" sebagai label di chart (pie_chart/bar_chart) atau di tabel. SELALU gunakan "Nama Proyek" (project_name) atau nama entitas aslinya agar laporan mudah dimengerti oleh user umum. Jika nama proyek terlalu panjang, persingkat (truncate) secukupnya untuk label chart.

SUMBER DATA: Kamu terhubung ke sistem data internal TelkomInfra yang mencakup data proyek, keuangan, dan operasional. Gunakan tools yang tersedia untuk mengambil data.

⛔ KEAMANAN DATA - WAJIB DIPATUHI:
- JANGAN PERNAH menyebutkan, menjelaskan, atau mendeskripsikan nama tabel database, nama kolom, struktur skema, atau detail teknis sistem internal kepada user.
- Jika user bertanya tentang "isi database", "struktur data", "tabel apa saja", atau sejenisnya, jawab dengan: "Saya memiliki akses ke data proyek dan keuangan TelkomInfra. Silakan tanyakan data spesifik yang Anda butuhkan."
- Laporan HANYA untuk data perusahaan TelkomInfra.
`;


export async function POST(req: NextRequest) {
  if (apiKeys.length === 0) {
    return NextResponse.json({ error: 'GEMINI_API_KEY is not set in environment variables' }, { status: 500 });
  }

  try {
    const { message, files, history } = await req.json();

    // Sanitize history for Gemini:
    // 1. Map roles (ai → model)
    // 2. Drop leading 'model' messages (history must start with 'user')
    // 3. Ensure strictly alternating roles (user, model, user, model...)
    // 4. Exclude the last message if it's 'user' (that's sent as the current turn)
    const rawHistory = (history || []).map((msg: any) => ({
      role: msg.role === 'ai' ? 'model' : 'user',
      parts: [{ text: msg.content || '' }],
    }));

    // Drop the last user message (it's the current turn, sent separately)
    const withoutCurrentTurn = rawHistory.slice(0, -1);

    // Ensure history starts with 'user'
    let trimmed = withoutCurrentTurn;
    while (trimmed.length > 0 && trimmed[0].role !== 'user') {
      trimmed = trimmed.slice(1);
    }

    // Ensure strictly alternating: keep only valid alternating pairs
    const formattedHistory: { role: string; parts: { text: string }[] }[] = [];
    let expectedRole = 'user';
    for (const entry of trimmed) {
      if (entry.role === expectedRole) {
        formattedHistory.push(entry);
        expectedRole = expectedRole === 'user' ? 'model' : 'user';
      }
      // Skip entries that break alternation
    }

    // History must end with 'model' for Gemini
    while (formattedHistory.length > 0 && formattedHistory[formattedHistory.length - 1].role !== 'model') {
      formattedHistory.pop();
    }

    let parts: any[] = [];
    if (message) parts.push(message);
    if (files && files.length > 0) {
      // Instead of sending URL to Gemini directly (which fails), we use Python RAG parsing
      for (const file of files) {
        if (file.url) {
          try {
            const parseRes = await fetch(process.env.NEXT_PUBLIC_SITE_URL ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/parse_document` : 'http://localhost:4028/api/parse_document', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: file.url, name: file.name })
            });
            if (parseRes.ok) {
              const parsedData = await parseRes.json();
              if (parsedData.text) {
                parts.push(parsedData.text);
              }
            }
          } catch (err) {
            console.error('Failed to parse document with Python:', err);
          }
        }
      }
    }

    if (parts.length === 0) {
      return NextResponse.json({ error: 'Message or files are required' }, { status: 400 });
    }

    // ===== STICKY ROUND-ROBIN KEY ROTATION =====
    // Start from the last successful key. Advance on 429. Wrap around after last key.
    let lastError: any = null;
    const totalKeys = apiKeys.length;
    let attempts = 0;

    while (attempts < totalKeys) {
      const selectedKey = apiKeys[currentKeyIndex];
      const keyLabel = `Key #${currentKeyIndex + 1}/${totalKeys}`;

      try {
        const genAI = new GoogleGenerativeAI(selectedKey);
        // Smart model routing: pick lite or full based on prompt complexity
        const userMessageText = typeof message === 'string' ? message : (message?.text || '');
        const complexity = classifyPrompt(userMessageText);
        const selectedModel = complexity === 'full' ? FULL_MODEL : LITE_MODEL;
        console.log(`[Tifa] Using model: ${selectedModel} | ${keyLabel}`);
        const model = genAI.getGenerativeModel({
          model: selectedModel,
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ functionDeclarations: dbToolsDefinitions as any }]
        });

        const chat = model.startChat({ history: formattedHistory });

        let result = await chat.sendMessage(parts);
        let call = result.response.functionCalls()?.[0];

        while (call) {
          console.log(`[Tifa] Function called: ${call.name} with args:`, call.args);
          let funcRes: any = { error: 'Unknown function' };
          const args = call.args as any;

          if (call.name === 'lookupRecord') {
            funcRes = await lookupRecord(args.tableName, args.idColumn, args.idValue, args.selectColumns);
          } else if (call.name === 'filterRecords') {
            funcRes = await filterRecords(args.tableName, args.filterColumn, args.filterValue, args.selectColumns, args.limitAmount, args.orderColumn, args.orderAscending);
          } else if (call.name === 'aggregateRecords') {
            funcRes = await aggregateRecords(args.tableName, args.sumColumn, args.filterColumn, args.filterValue);
          } else if (call.name === 'aggregate_chart') {
            funcRes = await aggregateChartPython(args.table, args.group_by, args.sum_col);
          } else if (call.name === 'predict_cashflow') {
            funcRes = await predictCashflowPython(args.months_ahead);
          } else if (call.name === 'detect_anomaly') {
            funcRes = await detectAnomalyPython(args.table, args.amount_col);
          }

          console.log(`[Tifa] Function response:`, funcRes);

          // Prevent massive token usage by truncating large arrays
          let safeFuncRes = funcRes;
          if (Array.isArray(funcRes)) {
            safeFuncRes = funcRes.length > 15 ? { data: funcRes.slice(0, 15), note: `Terdapat ${funcRes.length - 15} data lainnya yang disembunyikan. Tolong kelompokkan sisanya sebagai 'Lainnya'.` } : funcRes;
          } else if (funcRes && Array.isArray(funcRes.data)) {
            safeFuncRes = { ...funcRes };
            if (safeFuncRes.data.length > 15) {
              safeFuncRes.note = `Terdapat ${safeFuncRes.data.length - 15} data lainnya yang disembunyikan. Tolong kelompokkan sisanya sebagai 'Lainnya'.`;
              safeFuncRes.data = safeFuncRes.data.slice(0, 15);
            }
          }

          result = await chat.sendMessage([{
            functionResponse: {
              name: call.name,
              response: safeFuncRes
            }
          }]);
          call = result.response.functionCalls()?.[0];
        }

        const finalString = result.response.text();

        // ✅ SUCCESS — keep currentKeyIndex as-is so next request reuses this key
        console.log(`[Tifa] ✅ Success with ${keyLabel}`);

        // Simulate streaming back the final result
        const stream = new ReadableStream({
          start(controller) {
            const chunkSize = 20;
            let i = 0;
            const encoder = new TextEncoder();

            function push() {
              if (i < finalString.length) {
                controller.enqueue(encoder.encode(finalString.substring(i, i + chunkSize)));
                i += chunkSize;
                setTimeout(push, 10);
              } else {
                controller.close();
              }
            }
            push();
          },
        });

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
          },
        });

      } catch (error: any) {
        lastError = error;
        const errorMessage = error.message?.toLowerCase() || '';
        const errorString = String(error).toLowerCase();

        // Cek apakah error terkait limit, quota, server overload, atau timeout/fetch failed
        const isTransientError = 
          errorMessage.includes('429') || 
          errorMessage.includes('quota') || 
          errorMessage.includes('rate limit') || 
          errorMessage.includes('too many') ||
          errorMessage.includes('503') ||
          errorMessage.includes('overloaded') ||
          errorMessage.includes('unavailable') ||
          errorMessage.includes('fetch failed') ||
          errorMessage.includes('timeout') ||
          errorString.includes('429') ||
          errorString.includes('503');

        if (isTransientError) {
          // Rate limited / Overloaded — advance to next key in the cycle
          const prevIndex = currentKeyIndex;
          currentKeyIndex = (currentKeyIndex + 1) % totalKeys;
          console.warn(`[Tifa] ⚠️ Key #${prevIndex + 1} failed (${errorMessage.substring(0, 50)}...). Switching to Key #${currentKeyIndex + 1}...`);
          attempts++;
          
          // Jeda singkat 1 detik sebelum mencoba key berikutnya (menghindari burst API yang memicu limit massal)
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        } else {
          // Non-transient error (e.g. invalid arguments) — throw immediately
          console.error(`[Tifa] ❌ Non-transient error on Key #${currentKeyIndex + 1}:`, error);
          throw error;
        }
      }
    }

    // If we've exhausted all keys
    throw new Error(`Semua limit API Key telah habis (Too Many Requests). Silakan coba beberapa saat lagi. Last error: ${lastError?.message}`);

  } catch (error: any) {
    console.error('Gemini API Error:', error);
    return NextResponse.json({ error: error.message || 'Something went wrong' }, { status: 500 });
  }
}
