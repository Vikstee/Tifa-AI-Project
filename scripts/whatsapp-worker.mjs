import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import makeWASocket, {
  Browsers,
  DisconnectReason,
  useMultiFileAuthState,
} from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';

const authDir = process.env.WHATSAPP_AUTH_DIR || path.resolve('.wwebjs_baileys_auth');
const baseUrl = (process.env.TIFA_BASE_URL || 'http://127.0.0.1:4028').replace(/\/$/, '');
const internalToken = process.env.WHATSAPP_INTERNAL_TOKEN || '';
const allowedFromEnv = new Set((process.env.WHATSAPP_ALLOWED_GROUP_IDS || '').split(',').map((v) => v.trim()).filter(Boolean));
const logGroups = process.env.WHATSAPP_LOG_GROUPS === 'true';

if (!internalToken) {
  console.warn('[TIFA WhatsApp] WHATSAPP_INTERNAL_TOKEN belum di-set; whitelist database tidak dapat dipakai.');
}

function unwrapMessage(message) {
  let current = message?.message || {};
  for (let i = 0; i < 4; i += 1) {
    const key = Object.keys(current)[0];
    if (!key) break;
    if (key === 'ephemeralMessage' || key === 'viewOnceMessage' || key === 'viewOnceMessageV2') {
      current = current[key]?.message || {};
      continue;
    }
    break;
  }
  return current;
}

function getText(message) {
  const body = unwrapMessage(message);
  return body.conversation || body.extendedTextMessage?.text || body.imageMessage?.caption || body.videoMessage?.caption || '';
}

function getContextInfo(message) {
  const body = unwrapMessage(message);
  return body.extendedTextMessage?.contextInfo || body.imageMessage?.contextInfo || body.videoMessage?.contextInfo || {};
}

function normaliseId(value) {
  return String(value || '').trim().toLowerCase().replace(/^\+/, '');
}

function idMatches(candidate, botIds) {
  const value = normaliseId(candidate);
  if (!value) return false;
  const [valueLocal, valueServer = ''] = value.split('@');
  const valueBare = valueLocal.split(':')[0];
  return botIds.some((id) => {
    const other = normaliseId(id);
    const [otherLocal, otherServer = ''] = other.split('@');
    const otherBare = otherLocal.split(':')[0];
    return value === other
      || (valueBare && otherBare && valueBare === otherBare && valueServer === otherServer);
  });
}

function stripMention(text, ids) {
  let result = text;
  for (const id of ids.filter(Boolean)) {
    const token = String(id).split('@')[0].split(':')[0];
    if (token) result = result.replaceAll(`@${token}`, '');
  }
  return result.replace(/\s+/g, ' ').trim();
}

function parseReport(text) {
  const match = text.match(/```json_report\s*([\s\S]*?)\s*```/i);
  if (!match) return null;
  try {
    const report = JSON.parse(match[1]);
    return report?.format?.toUpperCase() === 'PDF' && Array.isArray(report.sections) ? report : null;
  } catch {
    return null;
  }
}

function cleanReply(text) {
  let result = text
    .replace(/```json_report\s*[\s\S]*?\s*```/gi, '')
    .replace(/```json_chart\s*[\s\S]*?\s*```/gi, '')
    .replace(/^#{1,6}\s*/gm, '')
    // WhatsApp uses *text* for bold; AI responses often use Markdown **text**.
    .replace(/\*\*([^*\n]+?)\*\*/g, '*$1*')
    .replace(/__([^_\n]+?)__/g, '*$1*')
    .replace(/^[ \t]*[-*]\s+/gm, '• ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return result;
}

async function jsonRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: `Bearer ${internalToken}`, 'Content-Type': 'application/json' },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}

async function isAllowedGroup(groupJid) {
  if (allowedFromEnv.has(groupJid)) return { allowed: true, group: null };
  if (!internalToken) return { allowed: false, group: null };
  return jsonRequest(`${baseUrl}/api/whatsapp/internal?groupJid=${encodeURIComponent(groupJid)}`);
}

async function audit(payload) {
  if (!internalToken) return;
  try { await jsonRequest(`${baseUrl}/api/whatsapp/internal`, { method: 'POST', body: JSON.stringify(payload) }); }
  catch (error) { console.warn('[TIFA WhatsApp] audit gagal:', error.message); }
}

async function readChatResponse(response) {
  const raw = await response.text();
  return raw.replace(/^data:\s?/gm, '').trim();
}

async function askTifa(prompt, senderId) {
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: prompt, history: [], userId: `whatsapp:${senderId}` }),
  });
  if (!response.ok) throw new Error(`TIFA API HTTP ${response.status}: ${await response.text()}`);
  return readChatResponse(response);
}

async function createPdf(report) {
  const response = await fetch(`${baseUrl}/api/whatsapp/report`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${internalToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(report),
  });
  if (!response.ok) throw new Error(`PDF API HTTP ${response.status}: ${await response.text()}`);
  return Buffer.from(await response.arrayBuffer());
}

async function start() {
  fs.mkdirSync(authDir, { recursive: true });
  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const sock = makeWASocket({ auth: state, browser: Browsers.ubuntu('TIFA'), markOnlineOnConnect: false, syncFullHistory: false });
  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log('\n[TIFA WhatsApp] QR tersedia. Scan dari WhatsApp > Perangkat tertaut.\n');
      qrcode.generate(qr, { small: true });
      console.log('');
    }
    if (connection === 'open') {
      const ids = [sock.user?.id, sock.user?.lid].filter(Boolean);
      console.log('[TIFA WhatsApp] terhubung. Identitas bot:', ids.join(', '));
    }
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code !== DisconnectReason.loggedOut) setTimeout(start, 3000);
      else console.error('[TIFA WhatsApp] logout permanen; hapus auth hanya setelah konfirmasi.');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const message of messages) {
      if (!message.message || message.key.fromMe) continue;
      const groupJid = message.key.remoteJid;
      if (!groupJid?.endsWith('@g.us')) continue;

      if (logGroups) {
        console.log('[TIFA WhatsApp] grup terdeteksi:', groupJid, '| pengirim:', message.pushName || 'unknown');
      }

      const access = await isAllowedGroup(groupJid).catch((error) => ({ allowed: false, error }));
      if (!access.allowed) {
        if (logGroups) console.log('[TIFA WhatsApp] grup ditolak whitelist:', groupJid, access.error?.message || 'belum diizinkan');
        continue;
      }

      const botIds = [sock.user?.id, sock.user?.lid].filter(Boolean);
      const context = getContextInfo(message);
      const mentions = [...(context.mentionedJid || []), ...(context.mentionedLid || [])];
      if (!mentions.some((id) => idMatches(id, botIds))) {
        if (logGroups) console.log('[TIFA WhatsApp] mention bukan untuk bot:', { mentions, botIds });
        continue;
      }

      const senderId = message.key.participant || message.key.remoteJid;
      const prompt = stripMention(getText(message), botIds);
      if (!prompt) {
        await sock.sendMessage(groupJid, { text: 'Halo, saya TIFA. Silakan tuliskan permintaan laporan setelah mention saya.' });
        continue;
      }

      const messageId = message.key.id || `${groupJid}:${Date.now()}`;
      const baseAudit = { message_id: messageId, group_jid: groupJid, group_lid: access.group?.group_lid || null, sender_id: senderId, prompt, status: 'processing' };
      await audit(baseAudit);

      try {
        const rawReply = await askTifa(prompt, senderId);
        const report = parseReport(rawReply);
        const reply = cleanReply(rawReply) || 'Laporan berhasil dibuat.';
        await sock.sendMessage(groupJid, { text: reply });
        if (report) {
          const pdf = await createPdf(report);
          const filename = `${String(report.title || 'TIFA_Laporan').replace(/[^a-z0-9_-]+/gi, '_').slice(0, 80)}.pdf`;
          await sock.sendMessage(groupJid, { document: pdf, mimetype: 'application/pdf', fileName: filename, caption: 'Lampiran laporan TIFA.' });
        }
        await audit({ ...baseAudit, response_text: reply, report_title: report?.title || null, status: 'sent', completed_at: new Date().toISOString() });
      } catch (error) {
        console.error('[TIFA WhatsApp] request gagal:', error);
        await sock.sendMessage(groupJid, { text: 'Maaf, permintaan belum berhasil diproses. Silakan coba lagi atau hubungi admin TIFA.' });
        await audit({ ...baseAudit, status: 'failed', error_message: error.message, completed_at: new Date().toISOString() });
      }
    }
  });
}

start().catch((error) => { console.error('[TIFA WhatsApp] fatal:', error); process.exitCode = 1; });

