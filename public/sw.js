self.addEventListener('push', (event) => {
  let data = { title: 'Radar', body: 'Tienes una novedad', url: '/' };
  try {
    data = event.data.json();
  } catch (e) {
    // si el payload no es JSON, usamos los valores por defecto
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Radar', {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: data.url || '/' }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});
