import { NextRequest, NextResponse } from 'next/server';
import { dbToolsDefinitions } from '@/lib/ai/geminiTools';
import { lookupRecord, filterRecords, aggregateRecords } from '@/lib/db/supabaseQueries';
import { aggregateChartPython, predictCashflowPython, detectAnomalyPython } from '@/lib/api/pythonClient';
import OpenAI from 'openai';

const apiKey = process.env.OPENROUTER_API_KEY;
// Initialize openai client inside POST to prevent build-time errors


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

// Daftar model gratis OpenRouter yang MENDUKUNG Function Calling
const FALLBACK_MODELS = [
  'google/gemini-2.5-flash:free',
  'meta-llama/llama-3.3-70b-instruct:free'
];

export async function POST(req: NextRequest) {
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENROUTER_API_KEY is not set in environment variables' }, { status: 500 });
  }

  const openai = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: apiKey,
  });

  try {
    const { message, files, history } = await req.json();

    // Mapping history to OpenAI format
    const messages: any[] = [
      { role: 'system', content: SYSTEM_INSTRUCTION }
    ];

    if (history) {
      history.forEach((msg: any) => {
        messages.push({
          role: msg.role === 'ai' ? 'assistant' : 'user',
          content: msg.content
        });
      });
    }

    let userMessageContent = message || '';

    if (files && files.length > 0) {
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
                userMessageContent += `\n\n[Isi Dokumen ${file.name}]:\n${parsedData.text}`;
              }
            }
          } catch (err) {
            console.error('Failed to parse document with Python:', err);
          }
        }
      }
    }

    if (!userMessageContent) {
      return NextResponse.json({ error: 'Message or files are required' }, { status: 400 });
    }

    messages.push({ role: 'user', content: userMessageContent });

    let lastError: any = null;

    // Fallback loop over models
    for (const currentModel of FALLBACK_MODELS) {
      try {
        let finalResponseText = '';
        let loopCount = 0;
        const maxLoops = 5;
        
        while (loopCount < maxLoops) {
          const response = await openai.chat.completions.create({
            model: currentModel,
            messages: messages,
            tools: dbToolsDefinitions as any,
            tool_choice: 'auto'
          });

          const messageResponse = response.choices[0].message;
          messages.push(messageResponse);

          if (messageResponse.content) {
            finalResponseText += messageResponse.content;
          }

          if (!messageResponse.tool_calls || messageResponse.tool_calls.length === 0) {
            break; // No more tool calls, we are done
          }

          for (const toolCall of messageResponse.tool_calls) {
            console.log(`[Tifa] Function called: ${toolCall.function.name} with args:`, toolCall.function.arguments);
            let funcRes: any = { error: 'Unknown function' };
            const args = JSON.parse(toolCall.function.arguments);

            if (toolCall.function.name === 'lookupRecord') {
              funcRes = await lookupRecord(args.tableName, args.idColumn, args.idValue);
            } else if (toolCall.function.name === 'filterRecords') {
              funcRes = await filterRecords(args.tableName, args.filterColumn, args.filterValue);
            } else if (toolCall.function.name === 'aggregateRecords') {
              funcRes = await aggregateRecords(args.tableName, args.sumColumn, args.filterColumn, args.filterValue);
            } else if (toolCall.function.name === 'aggregate_chart') {
              funcRes = await aggregateChartPython(args.table, args.group_by, args.sum_col);
            } else if (toolCall.function.name === 'predict_cashflow') {
              funcRes = await predictCashflowPython(args.months_ahead);
            } else if (toolCall.function.name === 'detect_anomaly') {
              funcRes = await detectAnomalyPython(args.table, args.amount_col);
            }

            console.log(`[Tifa] Function response:`, funcRes);

            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(funcRes)
            });
          }
          
          loopCount++;
        }

        // Simulate streaming back the final result to match frontend expectation
        const stream = new ReadableStream({
          start(controller) {
            const chunkSize = 20;
            let i = 0;
            const encoder = new TextEncoder();

            function push() {
              if (i < finalResponseText.length) {
                controller.enqueue(encoder.encode(finalResponseText.substring(i, i + chunkSize)));
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
        console.warn(`[Tifa] API Error with model ${currentModel}:`, error.message);
        // Continue to the next model in the fallback list
      }
    }

    throw new Error(`Semua model fallback (termasuk Gemini dan Llama) telah habis atau gagal. Last error: ${lastError?.message}`);

  } catch (error: any) {
    console.error('OpenRouter API Error:', error);
    return NextResponse.json({ error: error.message || 'Something went wrong' }, { status: 500 });
  }
}
