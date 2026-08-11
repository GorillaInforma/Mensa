import { sql } from '@vercel/postgres';
import { NextRequest, NextResponse } from 'next/server';
import { notifyUser } from '@/lib/push-notify';

// Enviar una solicitud "quiero hablar contigo" a otro usuario detectado en el radar.
export async function POST(req: NextRequest) {
  const { fromId, toId } = await req.json();

  if (!fromId || !toId) {
    return NextResponse.json({ error: 'Faltan datos (fromId, toId)' }, { status: 400 });
  }
  if (fromId === toId) {
    return NextResponse.json({ error: 'No puedes enviarte una solicitud a ti mismo' }, { status: 400 });
  }

  const { rows } = await sql`
    INSERT INTO requests (from_id, to_id, status)
    VALUES (${fromId}, ${toId}, 'pending')
    ON CONFLICT (from_id, to_id) DO UPDATE SET status = requests.status
    RETURNING id, status;
  `;

  const fromUser = await sql`SELECT name FROM users WHERE id = ${fromId};`;
  const fromName = fromUser.rows[0]?.name ?? 'Alguien';

  // No bloqueamos la respuesta esperando el push; si falla, no debe tumbar la solicitud.
  notifyUser(toId, {
    title: 'Nueva solicitud cercana',
    body: `${fromName} quiere hablar contigo`,
    url: '/'
  }).catch((err) => console.error('push error:', err));

  return NextResponse.json({ requestId: rows[0].id, status: rows[0].status });
}
