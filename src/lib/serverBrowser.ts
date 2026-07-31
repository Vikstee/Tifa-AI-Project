import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer';

export async function launchTifaBrowser() {
  if (process.env.VERCEL) {
    const executablePath = await chromium.executablePath();
    return puppeteer.launch({
      executablePath,
      args: chromium.args,

      headless: true,
    });
  }

  return puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
}