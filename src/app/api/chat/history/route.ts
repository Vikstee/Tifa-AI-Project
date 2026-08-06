import { NextResponse } from 'next/server';
import { queryMysql } from '@/lib/db/mysqlClient';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const sessionId = searchParams.get('sessionId');

    if (sessionId) {
      const messages = await queryMysql(
        'SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC',
        [sessionId]
      );
      return NextResponse.json({ success: true, data: messages });
    }

    if (userId) {
      const sessions = await queryMysql(
        'SELECT * FROM chat_sessions WHERE user_id = ? ORDER BY updated_at DESC',
        [userId]
      );
      return NextResponse.json({ success: true, data: sessions });
    }

    return NextResponse.json({ success: false, error: 'userId or sessionId required' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, session, message } = body;

    if (type === 'create_session' && session) {
      const { id, user_id, title } = session;
      const sql = `
        INSERT INTO chat_sessions (id, user_id, title)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE title = VALUES(title), updated_at = NOW()
      `;
      await queryMysql(sql, [id, user_id, title || 'Percakapan Baru']);
      return NextResponse.json({ success: true });
    }

    if (type === 'add_message' && message) {
      const { id, session_id, user_id, role, content, attachments } = message;
      const attJson = attachments ? JSON.stringify(attachments) : null;
      const sql = `
        INSERT INTO chat_messages (id, session_id, user_id, role, content, attachments)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE content = VALUES(content)
      `;
      await queryMysql(sql, [id, session_id, user_id, role, content, attJson]);

      // Update session updated_at
      await queryMysql('UPDATE chat_sessions SET updated_at = NOW() WHERE id = ?', [session_id]);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'sessionId required' }, { status: 400 });
    }

    await queryMysql('DELETE FROM chat_messages WHERE session_id = ?', [sessionId]);
    await queryMysql('DELETE FROM chat_sessions WHERE id = ?', [sessionId]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
