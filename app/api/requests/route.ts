import { sql } from '@vercel/postgres';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'Falta userId' }, { status: 400 });
  }

  const incoming = await sql`
    SELECT r.id, r.status, r.created_at, u.id AS peer_id, u.name AS peer_name
    FROM requests r JOIN users u ON u.id = r.from_id
    WHERE r.to_id = ${userId}
    ORDER BY r.created_at DESC;
  `;

  const outgoing = await sql`
    SELECT r.id, r.status, r.created_at, u.id AS peer_id, u.name AS peer_name
    FROM requests r JOIN users u ON u.id = r.to_id
    WHERE r.from_id = ${userId}
    ORDER BY r.created_at DESC;
  `;

  return NextResponse.json({ incoming: incoming.rows, outgoing: outgoing.rows });
}
