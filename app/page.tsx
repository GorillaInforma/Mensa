'use client';

import { useEffect, useRef, useState } from 'react';
import Radar, { NearbyUser } from '@/components/Radar';
import ContactLog, { LogEntry } from '@/components/ContactLog';
import ChatPanel from '@/components/ChatPanel';
import { setupPushNotifications, PushSetupResult } from '@/lib/push-client';

const RADIUS_METERS = 2000;

type RequestRow = {
  id: string;
  status: 'pending' | 'accepted' | 'rejected';
  peer_id: string;
  peer_name: string;
};

export default function Home() {
  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [geoError, setGeoError] = useState<string | null>(null);
  const [self, setSelf] = useState<{ lat: number; lng: number } | null>(null);
  const [nearby, setNearby] = useState<NearbyUser[]>([]);
  const [incoming, setIncoming] = useState<RequestRow[]>([]);
  const [outgoing, setOutgoing] = useState<RequestRow[]>([]);
  const [openChat, setOpenChat] = useState<{ requestId: string; peerName: string } | null>(null);
  const [pushStatus, setPushStatus] = useState<PushSetupResult | null>(null);

  const watchIdRef = useRef<number | null>(null);

  // 1. Registro: pide nombre, obtiene ubicación, crea usuario en DB.
  async function register() {
    const cleanName = nameInput.trim();

    if (!cleanName) {
      setGeoError('Escribe tu nombre primero.');
      return;
    }

    if (!navigator.geolocation) {
      setGeoError('Este navegador no soporta geolocalización.');
      return;
    }

    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;

          const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: cleanName,
              lat: latitude,
              lng: longitude
            })
          });

          const data = await res.json().catch(() => ({}));

          if (!res.ok) {
            throw new Error(data.error || `Error del servidor (${res.status})`);
          }

          if (!data.userId) {
            throw new Error('El servidor no devolvió un ID de usuario.');
          }

          setUserId(data.userId);
          setName(data.name || cleanName);
          setSelf({ lat: latitude, lng: longitude });
        } catch (err) {
          console.error('Error registrando usuario:', err);
          setGeoError(
            err instanceof Error
              ? err.message
              : 'No se pudo activar el radar.'
          );
        }
      },
      (err) => {
        console.error('Error de geolocalización:', err);

        switch (err.code) {
          case err.PERMISSION_DENIED:
            setGeoError(
              'Permiso de ubicación denegado. Permite la ubicación para este sitio y vuelve a pulsar Activar radar.'
            );
            break;
          case err.POSITION_UNAVAILABLE:
            setGeoError(
              'No se pudo obtener tu ubicación. Activa el GPS y vuelve a intentarlo.'
            );
            break;
          case err.TIMEOUT:
            setGeoError(
              'El GPS tardó demasiado. Activa la ubicación precisa y vuelve a intentarlo.'
            );
            break;
          default:
            setGeoError('No se pudo obtener tu ubicación.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0
      }
    );
  }

  // 1b. Una vez registrado: pedir permiso de notificaciones y suscribir al service worker.
  useEffect(() => {
    if (!userId) return;
    setupPushNotifications(userId).then(setPushStatus);
  }, [userId]);

  // 2. Una vez registrado: heartbeat de ubicación cada 5s.
  useEffect(() => {
    if (!userId || !navigator.geolocation) return;
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => setSelf({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true }
    );
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [userId]);

  useEffect(() => {
    if (!userId || !self) return;
    const beat = () =>
      fetch('/api/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, lat: self.lat, lng: self.lng })
      });
    beat();
    const interval = setInterval(beat, 5000);
    return () => clearInterval(interval);
  }, [userId, self]);

  // 3. Polling de usuarios cercanos.
  useEffect(() => {
    if (!userId) return;
    const poll = async () => {
      const res = await fetch(`/api/nearby?userId=${userId}&radius=${RADIUS_METERS}`);
      const data = await res.json();
      if (data.users) setNearby(data.users);
    };
    poll();
    const interval = setInterval(poll, 4000);
    return () => clearInterval(interval);
  }, [userId]);

  // 4. Polling de solicitudes (entrantes/salientes).
  useEffect(() => {
    if (!userId) return;
    const poll = async () => {
      const res = await fetch(`/api/requests?userId=${userId}`);
      const data = await res.json();
      if (data.incoming) setIncoming(data.incoming);
      if (data.outgoing) setOutgoing(data.outgoing);
    };
    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [userId]);

  async function sendRequest(u: NearbyUser) {
    if (!userId) return;
    await fetch('/api/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromId: userId, toId: u.id })
    });
  }

  async function respond(requestId: string, accept: boolean) {
    if (!userId) return;
    await fetch('/api/request/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, userId, accept })
    });
  }

  // ----- Pantalla de registro -----
  if (!userId) {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24
        }}
      >
        <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontSize: 12, letterSpacing: 2 }}>
          RADAR // GENTE CERCA
        </div>
        <h1 style={{ fontSize: 28, margin: '8px 0 24px', textAlign: 'center' }}>
          Detecta quién está cerca<br />y pide hablar primero
        </h1>
        <input
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && register()}
          placeholder="Tu nombre"
          style={{
            width: 260,
            background: 'var(--surface)',
            border: '1px solid var(--grid)',
            borderRadius: 8,
            padding: '12px 14px',
            color: 'var(--text)',
            fontSize: 15,
            marginBottom: 12
          }}
        />
        <button
          onClick={register}
          style={{
            background: 'var(--amber)',
            color: '#0a0e14',
            border: 'none',
            borderRadius: 8,
            padding: '12px 24px',
            fontWeight: 700,
            fontSize: 15
          }}
        >
          Activar radar
        </button>
        {geoError && (
          <div style={{ color: 'var(--red)', fontSize: 13, marginTop: 14, maxWidth: 280, textAlign: 'center' }}>
            {geoError}
          </div>
        )}
        <div style={{ color: 'var(--text-dim)', fontSize: 12, marginTop: 20, maxWidth: 300, textAlign: 'center' }}>
          Necesitas dar permiso de ubicación. Tu posición solo se usa para calcular distancia y rumbo, no se muestra a otros.
        </div>
      </main>
    );
  }

  const pendingIds = new Set(outgoing.filter((r) => r.status === 'pending').map((r) => r.peer_id));
  const connectedIds = new Set(
    [...incoming, ...outgoing].filter((r) => r.status === 'accepted').map((r) => r.peer_id)
  );

  const log: LogEntry[] = [
    ...incoming
      .filter((r) => r.status === 'pending')
      .map((r) => ({ id: 'in-' + r.id, peerName: r.peer_name, status: 'pending_in' as const, requestId: r.id })),
    ...outgoing
      .filter((r) => r.status === 'pending')
      .map((r) => ({ id: 'out-' + r.id, peerName: r.peer_name, status: 'pending_out' as const, requestId: r.id })),
    ...[...incoming, ...outgoing]
      .filter((r) => r.status === 'accepted')
      .map((r) => ({ id: 'ok-' + r.id, peerName: r.peer_name, status: 'accepted' as const, requestId: r.id })),
    ...outgoing
      .filter((r) => r.status === 'rejected')
      .map((r) => ({ id: 'rej-' + r.id, peerName: r.peer_name, status: 'rejected' as const, requestId: r.id }))
  ];

  return (
    <main style={{ minHeight: '100vh', padding: '24px 16px 60px', maxWidth: 480, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontSize: 11, letterSpacing: 2 }}>
          RADAR
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', fontSize: 11 }}>
          {name} · radio {RADIUS_METERS / 1000} km
        </div>
      </div>

      {(pushStatus === 'denied' || pushStatus === 'unsupported') && (
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--red)',
            background: 'var(--surface)',
            border: '1px solid var(--grid)',
            borderRadius: 6,
            padding: '8px 10px',
            marginBottom: 14
          }}
        >
          {pushStatus === 'denied'
            ? 'Notificaciones bloqueadas: solo verás solicitudes/mensajes con la pestaña abierta. Actívalas en el ícono de candado del navegador.'
            : 'Este navegador no soporta notificaciones push. En iPhone: agrega el sitio a Pantalla de inicio primero (Safari, iOS 16.4+).'}
        </div>
      )}

      <Radar
        self={self}
        users={nearby}
        radiusMeters={RADIUS_METERS}
        onSelect={sendRequest}
        pendingIds={pendingIds}
        connectedIds={connectedIds}
      />

      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)', textAlign: 'center', margin: '10px 0 28px' }}>
        {nearby.length === 0
          ? 'Escaneando... nadie detectado todavía'
          : `${nearby.length} contacto(s) en rango — toca uno para enviar solicitud`}
      </div>

      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dim)', marginBottom: 8, letterSpacing: 1 }}>
        BITÁCORA
      </div>
      <ContactLog
        entries={log}
        onAccept={(id) => respond(id, true)}
        onReject={(id) => respond(id, false)}
        onOpenChat={(requestId, peerName) => setOpenChat({ requestId, peerName })}
      />

      {openChat && userId && (
        <ChatPanel
          requestId={openChat.requestId}
          peerName={openChat.peerName}
          userId={userId}
          onClose={() => setOpenChat(null)}
        />
      )}
    </main>
  );
}
