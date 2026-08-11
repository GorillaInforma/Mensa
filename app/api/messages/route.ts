import { sql } from '@vercel/postgres';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const requestId = searchParams.get('requestId');

  if (!requestId) {
    return NextResponse.json({ error: 'Falta requestId' }, { status: 400 });
  }

  const { rows } = await sql`
    SELECT id, sender_id, content, created_at
    FROM messages
    WHERE request_id = ${requestId}
    ORDER BY created_at ASC
    LIMIT 200;
  `;

  return NextResponse.json({ messages: rows });
}
