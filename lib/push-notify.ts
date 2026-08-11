import { sql } from '@vercel/postgres';
import webpush from './webpush';

type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

// Manda una notificación a TODOS los dispositivos/navegadores donde ese usuario
// aceptó notificaciones. Si un endpoint ya no existe (usuario desinstaló / borró
// el permiso), lo limpiamos de la base para no seguir intentando.
export async function notifyUser(userId: string, payload: PushPayload) {
  const { rows } = await sql`
    SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ${userId};
  `;

  await Promise.all(
    rows.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth }
          },
          JSON.stringify(payload)
        );
      } catch (err: any) {
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await sql`DELETE FROM push_subscriptions WHERE endpoint = ${sub.endpoint};`;
        } else {
          console.error('Error enviando push:', err?.statusCode, err?.body);
        }
      }
    })
  );
}
