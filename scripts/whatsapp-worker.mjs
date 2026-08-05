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
const logGroups = process.env.WHATSAPP_LOG_GROUPS !== 'false';
const logMessages = process.env.WHATSAPP_LOG_MESSAGES !== 'false';
const contextCacheFile = path.join(authDir, 'group-context-cache.json');
const groupContexts = new Map();

function getWibDayKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

function loadGroupContexts() {
  try {
    if (!fs.existsSync(contextCacheFile)) return;
    const saved = JSON.parse(fs.readFileSync(contextCacheFile, 'utf8'));
    const today = getWibDayKey();
    for (const [groupJid, context] of Object.entries(saved || {})) {
      if (!Array.isArray(context.messages)) continue;
      const legacyDay = context.expiresAt ? getWibDayKey(new Date(context.expiresAt - (24 * 60 * 60 * 1000))) : today;
      const migrated = { ...context, dayKey: context.dayKey || legacyDay };
      if (migrated.dayKey === today) groupContexts.set(groupJid, migrated);
    }
  } catch (error) {
    console.warn('[TIFA WhatsApp] cache konteks tidak dapat dibaca:', error.message);
  }
}

function saveGroupContexts() {
  try {
    const output = Object.fromEntries(groupContexts.entries());
    fs.writeFileSync(contextCacheFile, JSON.stringify(output), 'utf8');
  } catch (error) {
    console.warn('[TIFA WhatsApp] cache konteks tidak dapat disimpan:', error.message);
  }
}

function getGroupHistory(groupJid) {
  const context = groupContexts.get(groupJid);
  if (!context || context.dayKey !== getWibDayKey()) {
    groupContexts.delete(groupJid);
    return [];
  }
  return context.messages;
}

function rememberGroupTurn(groupJid, prompt, reply) {
  const messages = [...getGroupHistory(groupJid), { role: 'user', content: prompt }, { role: 'ai', content: reply }];
  groupContexts.set(groupJid, { dayKey: getWibDayKey(), messages });
  saveGroupContexts();
}
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

function getQuotedText(message) {
  const context = getContextInfo(message);
  const quoted = context.quotedMessage;
  if (!quoted) return '';
  const body = unwrapMessage({ message: quoted });
  return body.conversation || body.extendedTextMessage?.text || body.imageMessage?.caption || body.videoMessage?.caption || '';
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

function parseVisuals(text) {
  const visuals = [];
  const chartPattern = /```json_chart\s*([\s\S]*?)\s*```/gi;
  for (const match of text.matchAll(chartPattern)) {
    try {
      const chart = JSON.parse(match[1]);
      const typeMap = { bar_chart: 'bar', line_chart: 'line', pie_chart: 'pie' };
      const type = typeMap[chart?.type] || chart?.type;
      if (chart && ['bar', 'line', 'pie'].includes(type)) visuals.push({ ...chart, type });
    } catch (error) {
      console.warn('[TIFA WhatsApp] json_chart tidak valid:', error.message);
    }
  }

  const tablePattern = /((?:^\|[^\r\n]+\|\s*\r?\n){2,})/gm;
  for (const match of text.matchAll(tablePattern)) {
    const rows = match[1].trim().split(/\r?\n/).map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()));
    if (rows.length >= 2 && rows[1].every((cell) => /^:?-{3,}:?$/.test(cell))) {
      visuals.push({ type: 'table', title: 'Tabel TIFA', headers: rows[0], rows: rows.slice(2) });
    }
  }
  return visuals;
}

function chartToReportSection(chart) {
  if (Array.isArray(chart.labels) && Array.isArray(chart.values)) {
    return { type: chart.type === 'line' ? 'line_chart' : chart.type === 'pie' ? 'pie_chart' : 'bar_chart', title: chart.title || 'Visualisasi TIFA', labels: chart.labels, values: chart.values };
  }
  if (Array.isArray(chart.data)) {
    const key = chart.xAxisKey || 'kategori';
    const valueKey = chart.keys?.[0] || Object.keys(chart.data[0] || {}).find((item) => item !== key);
    if (!valueKey) return null;
    return { type: chart.type === 'line' ? 'line_chart' : chart.type === 'pie' ? 'pie_chart' : 'bar_chart', title: chart.title || 'Visualisasi TIFA', labels: chart.data.map((row) => row[key]), values: chart.data.map((row) => Number(String(row[valueKey]).replace(/[^0-9.-]/g, '')) || 0) };
  }
  return null;
}

function attachPreviousCharts(report, groupJid) {
  const previousCharts = getGroupHistory(groupJid).filter((item) => item.role === 'ai').flatMap((item) => parseVisuals(item.content || ''));
  const sections = previousCharts.map(chartToReportSection).filter(Boolean);
  if (!sections.length) return report;
  const existingTitles = new Set((report.sections || []).map((section) => section.title));
  return { ...report, sections: [...report.sections, ...sections.filter((section) => !existingTitles.has(section.title))] };
}
function isReportRequest(prompt) {
  return /\b(laporan|report|pdf|export|unduh|download|dokumen)\b/i.test(prompt || '');
}

function buildFallbackReport(prompt, rawReply, visuals) {
  const sections = [];
  const narrative = cleanReportReply(removeMarkdownTables(rawReply));
  if (narrative) sections.push({ type: 'text', text: narrative });
  for (const visual of visuals) {
    const section = chartToReportSection(visual);
    if (section) sections.push(section);
    else if (visual.type === 'table') sections.push({ type: 'table', title: visual.title || 'Tabel TIFA', headers: visual.headers || [], rows: visual.rows || [] });
  }
  if (!sections.length) sections.push({ type: 'text', text: 'Laporan berdasarkan jawaban data terbaru TIFA.' });
  return {
    title: 'Laporan TIFA - ' + String(prompt || 'Permintaan laporan').replace(/\s+/g, ' ').trim().slice(0, 70),
    format: 'PDF',
    period: 'Data terbaru',
    sections,
  };
}
function removeMarkdownTables(text) {
  return text.replace(/(?:^\|[^\r\n]+\|\s*\r?\n){2,}/gm, '').replace(/\n{3,}/g, '\n\n').trim();
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

function cleanReportReply(text) {
  let result = cleanReply(text)
    .replace(/^\s*---+\s*$/gm, '')
    .replace(/\n\s*(?:Apakah|Silakan beri tahu|Jika Anda ingin|Kalau Anda ingin)[\s\S]*$/i, '')
    .replace(/\bjson_report\b/gi, '')
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

async function askTifa(prompt, senderId, groupJid) {
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: prompt, history: getGroupHistory(groupJid), userId: 'whatsapp:user:' + senderId, groupId: 'whatsapp:group:' + groupJid }),
  });
  if (!response.ok) throw new Error(`TIFA API HTTP ${response.status}: ${await response.text()}`);
  const reply = await readChatResponse(response);
  rememberGroupTurn(groupJid, prompt, reply);
  return reply;
}

function shortText(value, max = 180) {
  const text = String(value || '').replace(/\\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function startTyping(sock, jid) {
  const update = () => sock.sendPresenceUpdate('composing', jid).catch(() => {});
  update();
  const timer = setInterval(update, 4500);
  return () => {
    clearInterval(timer);
    sock.sendPresenceUpdate('paused', jid).catch(() => {});
  };
}


async function createVisual(visual) {
  const response = await fetch(`${baseUrl}/api/whatsapp/visual`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${internalToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(visual),
  });
  if (!response.ok) throw new Error(`Visual API HTTP ${response.status}: ${await response.text()}`);
  return Buffer.from(await response.arrayBuffer());
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
  loadGroupContexts();
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

      const incomingText = getText(message);
      if (logMessages) {
        console.log('[TIFA WhatsApp] pesan grup masuk:', {
          id: message.key.id || 'tanpa-id',
          groupJid,
          pengirim: message.pushName || message.key.participant || 'unknown',
          teks: shortText(incomingText || '[pesan tanpa teks]'),
        });
      }

      if (logGroups) {
        console.log('[TIFA WhatsApp] grup terdeteksi:', groupJid, '| pengirim:', message.pushName || 'unknown');
      }

      const access = await isAllowedGroup(groupJid).catch((error) => ({ allowed: false, error }));
      if (!access.allowed) {
        console.log('[TIFA WhatsApp] pesan diabaikan: grup tidak ada di whitelist:', groupJid, access.error?.message || 'belum diizinkan');
        continue;
      }

      if (logMessages) console.log('[TIFA WhatsApp] whitelist OK:', groupJid);

      const botIds = [sock.user?.id, sock.user?.lid].filter(Boolean);
      const context = getContextInfo(message);
      const mentions = [...(context.mentionedJid || []), ...(context.mentionedLid || [])];
      if (!mentions.some((id) => idMatches(id, botIds))) {
        if (logMessages) console.log('[TIFA WhatsApp] diabaikan: mention bukan untuk bot:', { mentions, botIds });
        continue;
      }

      if (logMessages) console.log('[TIFA WhatsApp] mention bot terdeteksi:', groupJid);

      const senderId = message.key.participant || message.key.remoteJid;
      const userPrompt = stripMention(getText(message), botIds);
      const quotedText = getQuotedText(message);

      let fullPrompt = userPrompt;
      if (quotedText) {
        fullPrompt = `[Pesan yang di-reply/dikutip user di WhatsApp: "${quotedText}"]\n\nPermintaan/Instruksi User: ${userPrompt}`;
      }

      if (!fullPrompt) {
        console.log('[TIFA WhatsApp] mention tanpa permintaan; mengirim panduan singkat.');
        await sock.sendMessage(groupJid, { text: 'Halo, saya TIFA. Silakan tuliskan permintaan laporan setelah mention saya.' });
        continue;
      }

      const messageId = message.key.id || `${groupJid}:${Date.now()}`;
      const baseAudit = { message_id: messageId, group_jid: groupJid, group_lid: access.group?.group_lid || null, sender_id: senderId, prompt: fullPrompt, status: 'processing' };
      await audit(baseAudit);
      const stopTyping = startTyping(sock, groupJid);
      try {
        console.log('[TIFA WhatsApp] memproses permintaan via API (dengan kontek quote WA):', shortText(fullPrompt));
        const rawReply = await askTifa(fullPrompt, senderId, groupJid);
        let report = parseReport(rawReply);
        let visuals = parseVisuals(rawReply);
        if (report) {
          report = attachPreviousCharts(report, groupJid);
          visuals = [];
        } else if (isReportRequest(prompt)) {
          report = buildFallbackReport(prompt, rawReply, visuals);
          report = attachPreviousCharts(report, groupJid);
          visuals = [];
          console.warn('[TIFA WhatsApp] json_report tidak ditemukan; PDF fallback dibuat dari jawaban dan visual yang tersedia.');
        }
        const reply = isReportRequest(prompt) ? cleanReportReply(removeMarkdownTables(rawReply)) : (cleanReply(removeMarkdownTables(rawReply)) || 'Laporan berhasil dibuat.');
        console.log('[TIFA WhatsApp] API berhasil:', { messageId, adaPdf: Boolean(report), panjangBalasan: reply.length });
        await sock.sendMessage(groupJid, { text: reply });
        console.log('[TIFA WhatsApp] balasan teks terkirim:', messageId);
        try {
          if (!report && visuals.length) {
            for (const [index, visual] of visuals.entries()) {
              const image = await createVisual({ ...visual, title: visual.title || 'Visual TIFA ' + (index + 1)});
              await sock.sendMessage(groupJid, { image, mimetype: 'image/png', caption: visual.title || ('Visualisasi TIFA ' + (index + 1)) });
              console.log('[TIFA WhatsApp] visual terkirim:', visual.title || ('Visual TIFA ' + (index + 1)));
            }
          }
          if (report) {
            const pdf = await createPdf(report);
            const filename = String(report.title || 'TIFA_Laporan').replace(/[^a-z0-9_-]+/gi, '_').slice(0, 80) + '.pdf';
            await sock.sendMessage(groupJid, { document: pdf, mimetype: 'application/pdf', fileName: filename, caption: 'Lampiran laporan TIFA.' });
            console.log('[TIFA WhatsApp] lampiran PDF terkirim:', filename);
          }
        } catch (attachmentError) {
          console.error('[TIFA WhatsApp] lampiran gagal, jawaban teks tetap dikirim:', attachmentError);
          await sock.sendMessage(groupJid, { text: 'Jawaban laporan sudah dikirim. Lampiran visual/PDF belum berhasil dibuat karena kendala renderer server; data tetap tersedia pada pesan di atas.' });
        }
        await audit({ ...baseAudit, response_text: reply, report_title: report?.title || null, status: 'sent', completed_at: new Date().toISOString() });
      } catch (error) {
        console.error('[TIFA WhatsApp] request gagal:', error);
        await sock.sendMessage(groupJid, { text: 'Maaf, permintaan belum berhasil diproses. Silakan coba lagi atau hubungi admin TIFA.' });
        await audit({ ...baseAudit, status: 'failed', error_message: error.message, completed_at: new Date().toISOString() });
      } finally {
        stopTyping();
      }
    }
  });
}

start().catch((error) => { console.error('[TIFA WhatsApp] fatal:', error); process.exitCode = 1; });







