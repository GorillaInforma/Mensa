import { sql } from '@vercel/postgres';
import { NextRequest, NextResponse } from 'next/server';
import { notifyUser } from '@/lib/push-notify';

export async function POST(req: NextRequest) {
  const { requestId, userId, accept } = await req.json();

  if (!requestId || !userId || typeof accept !== 'boolean') {
    return NextResponse.json({ error: 'Faltan datos (requestId, userId, accept)' }, { status: 400 });
  }

  // Solo el destinatario (to_id) puede aceptar/rechazar.
  const { rows } = await sql`
    UPDATE requests
    SET status = ${accept ? 'accepted' : 'rejected'}
    WHERE id = ${requestId} AND to_id = ${userId}
    RETURNING id, status, from_id;
  `;

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Solicitud no encontrada o sin permiso' }, { status: 404 });
  }

  if (accept) {
    const acceptorUser = await sql`SELECT name FROM users WHERE id = ${userId};`;
    const acceptorName = acceptorUser.rows[0]?.name ?? 'Alguien';
    notifyUser(rows[0].from_id, {
      title: 'Solicitud aceptada',
      body: `${acceptorName} aceptó hablar contigo`,
      url: '/'
    }).catch((err) => console.error('push error:', err));
  }

  return NextResponse.json({ requestId: rows[0].id, status: rows[0].status });
}
