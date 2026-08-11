import { sql } from '@vercel/postgres';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { userId, subscription } = await req.json();

  if (!userId || !subscription?.endpoint || !subscription?.keys) {
    return NextResponse.json({ error: 'Faltan datos (userId, subscription)' }, { status: 400 });
  }

  await sql`
    INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
    VALUES (${userId}, ${subscription.endpoint}, ${subscription.keys.p256dh}, ${subscription.keys.auth})
    ON CONFLICT (endpoint) DO UPDATE SET user_id = ${userId};
  `;

  return NextResponse.json({ ok: true });
}
