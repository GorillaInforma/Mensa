import { sql } from '@vercel/postgres';
import { NextRequest, NextResponse } from 'next/server';

// El cliente llama esto cada ~5s mientras la app está abierta.
// updated_at reciente = "en línea ahora"; si pasan 30s sin heartbeat, desaparece del radar.
export async function POST(req: NextRequest) {
  const { userId, lat, lng } = await req.json();

  if (!userId || typeof lat !== 'number' || typeof lng !== 'number') {
    return NextResponse.json({ error: 'Faltan datos (userId, lat, lng)' }, { status: 400 });
  }

  await sql`
    UPDATE users SET lat = ${lat}, lng = ${lng}, updated_at = now()
    WHERE id = ${userId};
  `;

  return NextResponse.json({ ok: true });
}
