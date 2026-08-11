import { sql } from '@vercel/postgres';
import { NextRequest, NextResponse } from 'next/server';
import { notifyUser } from '@/lib/push-notify';

export async function POST(req: NextRequest) {
  const { requestId, senderId, content } = await req.json();

  if (!requestId || !senderId || !content?.trim()) {
    return NextResponse.json({ error: 'Faltan datos (requestId, senderId, content)' }, { status: 400 });
  }

  // Solo se puede escribir si la solicitud existe, está aceptada y el sender es parte de ella.
  const check = await sql`
    SELECT from_id, to_id FROM requests
    WHERE id = ${requestId} AND status = 'accepted'
      AND (from_id = ${senderId} OR to_id = ${senderId});
  `;
  if (check.rows.length === 0) {
    return NextResponse.json({ error: 'Solicitud inválida o no aceptada todavía' }, { status: 403 });
  }

  const { rows } = await sql`
    INSERT INTO messages (request_id, sender_id, content)
    VALUES (${requestId}, ${senderId}, ${content.trim()})
    RETURNING id, created_at;
  `;

  const peerId = check.rows[0].from_id === senderId ? check.rows[0].to_id : check.rows[0].from_id;
  const senderUser = await sql`SELECT name FROM users WHERE id = ${senderId};`;
  const senderName = senderUser.rows[0]?.name ?? 'Alguien';

  notifyUser(peerId, {
    title: senderName,
    body: content.trim().slice(0, 120),
    url: '/'
  }).catch((err) => console.error('push error:', err));

  return NextResponse.json({ messageId: rows[0].id, createdAt: rows[0].created_at });
}
