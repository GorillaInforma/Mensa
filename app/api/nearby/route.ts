import { sql } from '@vercel/postgres';
import { NextRequest, NextResponse } from 'next/server';

const ACTIVE_WINDOW_SECONDS = 30;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const radiusMeters = Number(searchParams.get('radius') ?? 2000);

  if (!userId) {
    return NextResponse.json({ error: 'Falta userId' }, { status: 400 });
  }

  const self = await sql`SELECT lat, lng FROM users WHERE id = ${userId};`;
  if (self.rows.length === 0) {
    return NextResponse.json({ error: 'Usuario no existe' }, { status: 404 });
  }
  const { lat, lng } = self.rows[0];

  // Haversine directo en SQL, filtrando por radio y por "recién visto".
  // (subquery porque no se puede filtrar por un alias calculado con HAVING sin GROUP BY)
  const { rows } = await sql`
    SELECT * FROM (
      SELECT
        id,
        name,
        lat,
        lng,
        2 * 6371000 * asin(sqrt(
          power(sin(radians((lat - ${lat}::float8) / 2)), 2) +
          cos(radians(${lat}::float8)) * cos(radians(lat)) *
          power(sin(radians((lng - ${lng}::float8) / 2)), 2)
        )) AS distance_m
      FROM users
      WHERE id != ${userId}
        AND updated_at > now() - make_interval(secs => ${ACTIVE_WINDOW_SECONDS})
    ) sub
    WHERE distance_m <= ${radiusMeters}
    ORDER BY distance_m ASC
    LIMIT 50;
  `;

  return NextResponse.json({ users: rows, self: { lat, lng } });
}
