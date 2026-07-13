import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { dbToolsDefinitions } from '@/lib/ai/geminiTools';
import { lookupRecord, filterRecords, aggregateRecords } from '@/lib/db/supabaseQueries';
import { aggregateChartPython, predictCashflowPython, detectAnomalyPython } from '@/lib/api/pythonClient';

const apiKeyString = process.env.GEMINI_API_KEY || '';
// Parse comma-separated API keys
const apiKeys = apiKeyString.split(',').map(k => k.trim()).filter(k => k.length > 0);

const SYSTEM_INSTRUCTION = `Kamu adalah TIFA (TelkomInfra AI Financial Assistant). 
Berikan jawaban yang terstruktur, rapi, dan enak dibaca. Gunakan poin-poin (bullet points/numbered lists). Gunakan kalimat yang natural dan sesekali gunakan emoticon. Jawab dalam bahasa Indonesia.

PENTING: Kamu sekarang terhubung ke database asli melalui Function Calling (tools). Jika pengguna menanyakan total uang (agregasi), mencari data (filter), atau cek status tertentu, WAJIB panggil function/tool yang tersedia untuk mengambil data nyata dari Supabase. JANGAN MENGARANG DATA ANGKA!

Jika pengguna meminta data disajikan dalam bentuk grafik (bar, line, atau pie), JANGAN gunakan teks atau ASCII art. Alih-alih, hasilkan blok kode dengan bahasa "json_chart" yang berisi konfigurasi JSON berikut:

\`\`\`json_chart
{
  "type": "bar", // atau "line" atau "pie"
  "title": "Judul Grafik",
  "xAxisKey": "kategori",
  "keys": ["Nilai1", "Nilai2"],
  "data": [
    {"kategori": "A", "Nilai1": 100, "Nilai2": 50},
    {"kategori": "B", "Nilai1": 120, "Nilai2": 60}
  ]
}
\`\`\`

Jika pengguna meminta untuk membuat atau mengunduh laporan (seperti PDF, Word, atau Excel), PASTIKAN laporan tersebut HANYA terkait dengan tabel yang ada di database (projects, contracts, purchase_orders, sales_orders, invoices, cash_in). Jika pengguna meminta laporan di luar konteks database tersebut (misal: Personal Budgeting, Laporan Keuangan Pribadi, dll), JANGAN hasilkan blok kode "json_report". Sebaliknya, berikan pesan maaf bahwa permintaan tersebut berada di luar kemampuan TIFA atau di luar konteks perusahaan.
Jika permintaan valid, hasilkan blok kode dengan bahasa "json_report" yang berisi konfigurasi JSON berikut:

\`\`\`json_report
{
  "reportType": "PO Outstanding Summary", // Sesuaikan dengan permintaan (misal: Cash Flow Analysis, AR Aging Report)
  "format": "PDF", // Atau "Word", "Excel" sesuai permintaan
  "period": "Okt 2024" // Sesuaikan dengan periode yang dibicarakan
}
\`\`\`

Selalu berikan penjelasan singkat sebelum atau sesudah grafik.`;

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

    // Try keys randomly up to apiKeys.length times
    let lastError: any = null;
    let availableKeys = [...apiKeys];

    while (availableKeys.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableKeys.length);
      const selectedKey = availableKeys[randomIndex];
      availableKeys.splice(randomIndex, 1); // Remove it so we don't try it again in this request

      try {
        const genAI = new GoogleGenerativeAI(selectedKey);
        const model = genAI.getGenerativeModel({
          model: 'gemini-2.5-flash',
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
            funcRes = await filterRecords(args.tableName, args.filterColumn, args.filterValue, args.selectColumns, args.limitAmount);
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

          result = await chat.sendMessage([{
            functionResponse: {
              name: call.name,
              response: funcRes
            }
          }]);
          call = result.response.functionCalls()?.[0];
        }

        const finalString = result.response.text();

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

        // Check if it's a rate limit, quota, or 429 error
        if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
          console.warn(`[Tifa] API Key rate limited! Retrying... (${availableKeys.length} keys left in pool)`);
          continue; // Try next key in the pool
        } else {
          // For other errors, throw immediately to be caught by outer catch block
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
