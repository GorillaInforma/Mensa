// Corre el schema.sql contra la base conectada por las env vars de Vercel Postgres.
// Uso: npm run db:init  (necesita POSTGRES_URL en tu entorno, ej. `vercel env pull`)
import { sql } from '@vercel/postgres';
import { readFileSync } from 'fs';

const schema = readFileSync(new URL('../schema.sql', import.meta.url), 'utf8');

const statements = schema
  .split(';')
  .map((s) => s.trim())
  .filter(Boolean);

for (const stmt of statements) {
  await sql.query(stmt);
  console.log('OK ->', stmt.slice(0, 60).replace(/\s+/g, ' '), '...');
}

console.log('Base de datos inicializada correctamente.');
process.exit(0);
