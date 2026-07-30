import { NextRequest } from 'next/server';
import puppeteer from 'puppeteer';
import { generateHTMLFromSections } from '@/lib/reportGenerator';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const expected = process.env.WHATSAPP_INTERNAL_TOKEN;
  if (!expected || req.headers.get('authorization') !== `Bearer ${expected}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  let browser: puppeteer.Browser | undefined;
  try {
    const { title, subtitle = '', period = '', sections = [] } = await req.json();
    if (!title || !Array.isArray(sections)) return new Response('Invalid report payload', { status: 400 });

    const html = generateHTMLFromSections(title, subtitle, period, sections);
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '0', right: '0', bottom: '0', left: '0' } });
    return new Response(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${String(title).replace(/[^a-z0-9_-]+/gi, '_').slice(0, 90)}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('[WhatsApp report]', error);
    return new Response(error.message || 'Report generation failed', { status: 500 });
  } finally {
    await browser?.close();
  }
}

