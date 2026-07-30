import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

const cwd = process.cwd();
const envFiles = [path.join(cwd, '.env.local'), path.join(cwd, '.env')].filter((file) => fs.existsSync(file));
for (const file of envFiles) {
  dotenv.config({ path: file, override: false });
}

const mode = (process.argv[2] || process.env.WHATSAPP_WORKER_MODE || 'local').toLowerCase();

if (!['local', 'vercel'].includes(mode)) {
  console.error('[TIFA WhatsApp] mode harus "local" atau "vercel".');
  process.exit(1);
}

if (mode === 'local') {
  process.env.TIFA_BASE_URL = process.env.TIFA_BASE_URL || 'http://127.0.0.1:4028';
} else {
  process.env.TIFA_BASE_URL = process.env.TIFA_BASE_URL || 'https://tifa-ai-assistant.vercel.app';
}

console.log(`[TIFA WhatsApp] worker mode: ${mode} | base URL: ${process.env.TIFA_BASE_URL}`);

await import('./whatsapp-worker.mjs');
