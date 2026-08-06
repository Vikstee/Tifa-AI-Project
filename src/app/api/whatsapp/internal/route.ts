import { NextRequest, NextResponse } from 'next/server';
import { queryMysql } from '@/lib/db/mysqlClient';

export const runtime = 'nodejs';

function authorized(req: NextRequest) {
  const expected = process.env.WHATSAPP_INTERNAL_TOKEN;
  return Boolean(expected && req.headers.get('authorization') === `Bearer ${expected}`);
}

function localAllowedGroups() {
  return new Set(
    (process.env.WHATSAPP_ALLOWED_GROUP_IDS || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const groupJid = new URL(req.url).searchParams.get('groupJid');
  if (!groupJid) return NextResponse.json({ error: 'groupJid is required' }, { status: 400 });

  const localGroups = localAllowedGroups();
  if (localGroups.has(groupJid)) {
    return NextResponse.json({
      allowed: true,
      group: { group_jid: groupJid, group_lid: null, group_name: 'Local development group', is_active: true },
      source: 'env',
    });
  }

  try {
    const rows = await queryMysql<any>(
      'SELECT group_jid, group_lid, group_name, is_active, allowed_senders, allowed_commands FROM whatsapp_allowed_groups WHERE group_jid = ? AND is_active = 1 LIMIT 1',
      [groupJid]
    );
    const data = rows[0] || null;
    return NextResponse.json({ allowed: Boolean(data), group: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Whitelist lookup failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const payload = await req.json();
    if (payload?.group_jid && localAllowedGroups().has(payload.group_jid)) {
      return NextResponse.json({ ok: true, stored: false, source: 'env' });
    }

    const { message_id, group_jid, group_lid, sender_id, sender_lid, prompt, response_text, report_title, status, error_message } = payload || {};
    if (message_id && group_jid) {
      const sql = `
        INSERT INTO whatsapp_tifa_requests
        (message_id, group_jid, group_lid, sender_id, sender_lid, prompt, response_text, report_title, status, error_message, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          status = VALUES(status),
          response_text = VALUES(response_text),
          error_message = VALUES(error_message),
          completed_at = NOW()
      `;
      const validStatuses = ['received', 'processing', 'sent', 'ignored', 'failed'];
      let safeStatus = status || 'received';
      if (safeStatus === 'completed') safeStatus = 'sent';
      if (!validStatuses.includes(safeStatus)) safeStatus = 'received';

      await queryMysql(sql, [
        message_id,
        group_jid,
        group_lid || null,
        sender_id || '',
        sender_lid || null,
        prompt || '',
        response_text || null,
        report_title || null,
        safeStatus,
        error_message || null,
      ]);
    }
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Audit write failed' }, { status: 500 });
  }
}
