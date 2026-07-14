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

FORMAT LAPORAN — Gunakan json_report HANYA untuk permintaan PDF/Excel/Word terkait database perusahaan:
\`\`\`json_report
{
  "reportType": "PO Outstanding Summary",
  "format": "PDF",
  "period": "Jul 2026"
}
\`\`\`

Selalu berikan penjelasan singkat sebelum atau sesudah grafik dan tabel.`;


export async function POST(req: NextRequest) {
  if (apiKeys.length === 0) {
    return NextResponse.json({ error: 'GEMINI_API_KEY is not set in environment variables' }, { status: 500 });
  }

  try {
    const { message, files, history } = await req.json();

    const formattedHistory = history?.map((msg: any) => ({
      role: msg.role === 'ai' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    })) || [];

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

        if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('rate limit') || errorMessage.includes('too many')) {
          // Rate limited — advance to next key in the cycle
          const prevIndex = currentKeyIndex;
          currentKeyIndex = (currentKeyIndex + 1) % totalKeys;
          console.warn(`[Tifa] ⚠️ Key #${prevIndex + 1} rate-limited! Switching to Key #${currentKeyIndex + 1}...`);
          attempts++;
          continue;
        } else {
          // Non-rate-limit error (e.g. invalid key, model error) — throw immediately
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
