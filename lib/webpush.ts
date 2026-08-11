import webpush from 'web-push';

// Las llaves VAPID identifican a TU servidor ante los navegadores (Google/Mozilla/Apple push
// services) para que confíen en tus notificaciones. Se generan una sola vez, no cambian.
// Genera las tuyas con: npx web-push generate-vapid-keys
webpush.setVapidDetails(
  'mailto:soporte@example.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string,
  process.env.VAPID_PRIVATE_KEY as string
);

export default webpush;
