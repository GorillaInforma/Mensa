# Radar — gente cerca

App que detecta usuarios cercanos por **geolocalización (GPS)** — no por Bluetooth — y
permite enviar una solicitud de conexión antes de habilitar el chat. Next.js (App Router)
+ Vercel Postgres.

> Nota importante: ninguna app web (ni nativa, de hecho) puede detectar "cualquier celular
> prendido" sin que ambos dispositivos participen en algún protocolo (GPS, WiFi, BLE). Esta
> app usa la ubicación GPS de cada usuario que la tiene abierta para calcular quién está cerca.

## Cómo funciona

1. El usuario entra su nombre y da permiso de ubicación → se crea un registro en `users`.
2. Justo después, el navegador pide permiso de **notificaciones**. Si acepta, se registra un
   Service Worker (`public/sw.js`) y se guarda su suscripción push en `push_subscriptions`.
   Desde ese momento puede recibir avisos **aunque tenga la pestaña o el navegador cerrado**
   — es la parte que resuelve "que le llegue sin tener la app abierta".
3. Cada 5s se actualiza su posición (`heartbeat`). Si no manda heartbeat en 30s, desaparece
   del radar de los demás (se asume que cerró la app).
4. Cada 4s se consulta `/api/nearby`, que calcula distancia real (fórmula de Haversine en SQL)
   contra todos los usuarios activos, y filtra por radio (2 km por defecto).
5. Al tocar un blip en el radar se crea una fila en `requests` con estado `pending` **y se
   dispara un push** al destinatario ("X quiere hablar contigo").
6. El otro usuario ve la solicitud entrante en su bitácora (o en la notificación) y puede
   **Aceptar** o **Ignorar**. Si acepta, se dispara otro push de vuelta ("X aceptó hablar contigo").
7. Con la solicitud aceptada, ambos pueden abrir el chat. Cada mensaje nuevo también dispara
   un push al otro ("mensajes cortos" — no reemplaza el chat en pantalla, solo avisa).

## Web Push: lo que sí y lo que no puede hacer

- **Sí**: la persona necesita visitar tu sitio **una sola vez** y tocar "Permitir" en el
  aviso de notificaciones del navegador. Nunca instala nada de una tienda de apps.
- **No**: no hay forma de que le llegue algo a alguien que nunca abrió el sitio ni aceptó el
  permiso — ningún sistema (Android, iOS, Windows) permite mandar notificaciones "en frío" a
  un dispositivo que no se suscribió; es una protección anti-spam del propio SO/navegador.
- **iPhone/iOS**: Safari solo permite Web Push si el usuario agregó el sitio a **Pantalla de
  inicio** primero (ícono de compartir → "Agregar a pantalla de inicio"), y necesita iOS 16.4+.
  Por eso incluí `public/manifest.json` — ayuda a que ese acceso directo se vea como app real.
- **Android/Chrome/Edge/Firefox de escritorio**: funciona directo, sin pasos extra.

## Configurar las llaves VAPID (una sola vez)

```bash
npx web-push generate-vapid-keys
```

Copia el `Public Key` a `NEXT_PUBLIC_VAPID_PUBLIC_KEY` y el `Private Key` a `VAPID_PRIVATE_KEY`
en tu `.env.local` (desarrollo) y en Vercel → Project Settings → Environment Variables (producción).

## Estructura

```
app/
  page.tsx              -> UI principal (registro, radar, bitácora)
  api/
    register/            -> crear usuario
    heartbeat/            -> actualizar ubicación
    nearby/               -> usuarios cercanos activos
    request/              -> enviar solicitud (+ dispara push)
    request/respond/      -> aceptar/rechazar (+ dispara push si acepta)
    requests/             -> listar solicitudes entrantes/salientes
    message/               -> enviar mensaje (solo si accepted, + dispara push)
    messages/              -> leer mensajes (polling)
    push/subscribe/        -> guardar suscripción push del navegador
    push/vapid-public-key/ -> exponer la llave pública al cliente
components/
  Radar.tsx              -> radar SVG con barrido giratorio y blips por rumbo/distancia real
  ContactLog.tsx         -> bitácora de solicitudes/contactos
  ChatPanel.tsx          -> panel de chat
lib/
  geo.ts                 -> haversine + rumbo (cliente)
  webpush.ts              -> configuración de VAPID (servidor)
  push-notify.ts           -> función notifyUser() usada en las 3 rutas que avisan
  push-client.ts            -> registro del service worker + suscripción (cliente)
public/
  sw.js                   -> service worker: recibe el push y abre la app al tocarlo
  manifest.json            -> necesario para "Agregar a pantalla de inicio" en iOS
schema.sql                -> esquema de la base (incluye push_subscriptions)
```

## 1. Instalar dependencias

```bash
npm install
```

## 2. Crear la base de datos en Vercel

1. En [vercel.com](https://vercel.com), entra a tu proyecto → tab **Storage** → **Create Database** → **Postgres** (Neon).
2. Conéctala a este proyecto. Vercel inyecta automáticamente las variables `POSTGRES_*`.
3. Trae las variables a tu entorno local:
   ```bash
   vercel env pull .env.local
   ```
4. Crea las tablas (usa el schema incluido):
   ```bash
   npm run db:init
   ```
   O si prefieres, copia el contenido de `schema.sql` y pégalo en el **Query editor** de
   Storage → tu base → Data.

## 3. Correr en local

```bash
npm run dev
```

Abre `http://localhost:3000`. El navegador pedirá permiso de ubicación (usa `localhost`,
que sí permite geolocalización sin HTTPS). Para probar con dos "usuarios" cercanos, abre
dos pestañas o dos navegadores distintos con nombres distintos — como no hay verificación
de dispositivo, cualquier pestaña cuenta como un usuario nuevo.

## 4. Deploy en Vercel

```bash
npm i -g vercel   # si no lo tienes
vercel
```

O conecta el repo de GitHub directamente desde el dashboard de Vercel (Import Project).
Asegúrate de que el proyecto en Vercel tenga la base Postgres conectada (paso 2) — las
env vars se inyectan solas en producción, no hace falta configurarlas a mano.

## Limitaciones a tener en cuenta

- **Precisión GPS**: en interiores puede tener error de 20–50 m; no es GPS de alta precisión
  como Bluetooth/UWB a corta distancia.
- **Polling, no WebSockets**: las funciones serverless de Vercel no mantienen conexiones
  persistentes, así que todo funciona por polling (4s radar, 3s solicitudes, 2.5s chat). Es
  suficiente para uso normal; si más adelante quieres tiempo real instantáneo, se podría migrar
  a Supabase Realtime o Pusher.
- **Sin autenticación real**: cualquiera que tenga la URL puede registrarse con cualquier
  nombre. Para producción real conviene añadir auth (NextAuth, Clerk, etc.) antes de lanzar.
- **Privacidad**: se guarda lat/lng exacto en la base mientras el usuario tiene la app abierta.
  Si vas a publicar esto, avísale claramente al usuario y borra ubicaciones viejas.
