import { sql } from '@vercel/postgres';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { name, lat, lng } = await req.json();

  if (!name || typeof lat !== 'number' || typeof lng !== 'number') {
    return NextResponse.json({ error: 'Faltan datos (name, lat, lng)' }, { status: 400 });
  }

  const { rows } = await sql`
    INSERT INTO users (name, lat, lng)
    VALUES (${name}, ${lat}, ${lng})
    RETURNING id, name;
  `;

  return NextResponse.json({ userId: rows[0].id, name: rows[0].name });
}
