import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase service-role configuration is missing');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

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
    const { data, error } = await adminClient()
      .from('whatsapp_allowed_groups')
      .select('group_jid, group_lid, group_name, is_active, allowed_senders, allowed_commands')
      .eq('group_jid', groupJid)
      .eq('is_active', true)
      .maybeSingle();
    if (error) throw error;
    return NextResponse.json({ allowed: Boolean(data), group: data || null });
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
    const { error } = await adminClient().from('whatsapp_tifa_requests').upsert(payload, { onConflict: 'message_id' });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Audit write failed' }, { status: 500 });
  }
}

