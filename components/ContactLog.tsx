'use client';

export type LogEntry = {
  id: string;
  peerName: string;
  status: 'pending_out' | 'pending_in' | 'accepted' | 'rejected';
  requestId: string;
};

type Props = {
  entries: LogEntry[];
  onAccept: (requestId: string) => void;
  onReject: (requestId: string) => void;
  onOpenChat: (requestId: string, peerName: string) => void;
};

const LABEL: Record<LogEntry['status'], string> = {
  pending_out: 'SOLICITUD ENVIADA — esperando respuesta',
  pending_in: 'SOLICITUD ENTRANTE',
  accepted: 'CONECTADO',
  rejected: 'RECHAZADA'
};

export default function ContactLog({ entries, onAccept, onReject, onOpenChat }: Props) {
  if (entries.length === 0) {
    return (
      <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', fontSize: 12, padding: '12px 0' }}>
        Sin contactos todavía. Toca un blip en el radar para enviar una solicitud.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {entries.map((e) => (
        <div
          key={e.id}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--grid)',
            borderRadius: 6,
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12
          }}
        >
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{e.peerName}</div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color:
                  e.status === 'accepted'
                    ? 'var(--cyan)'
                    : e.status === 'rejected'
                    ? 'var(--red)'
                    : 'var(--amber)',
                marginTop: 2
              }}
            >
              {LABEL[e.status]}
            </div>
          </div>

          {e.status === 'pending_in' && (
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => onAccept(e.requestId)}
                style={{
                  background: 'var(--cyan)',
                  color: '#0a0e14',
                  border: 'none',
                  borderRadius: 4,
                  padding: '6px 10px',
                  fontSize: 12,
                  fontWeight: 600
                }}
              >
                Aceptar
              </button>
              <button
                onClick={() => onReject(e.requestId)}
                style={{
                  background: 'transparent',
                  color: 'var(--text-dim)',
                  border: '1px solid var(--grid)',
                  borderRadius: 4,
                  padding: '6px 10px',
                  fontSize: 12
                }}
              >
                Ignorar
              </button>
            </div>
          )}

          {e.status === 'accepted' && (
            <button
              onClick={() => onOpenChat(e.requestId, e.peerName)}
              style={{
                background: 'transparent',
                color: 'var(--cyan)',
                border: '1px solid var(--cyan)',
                borderRadius: 4,
                padding: '6px 10px',
                fontSize: 12,
                fontWeight: 600
              }}
            >
              Abrir chat
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
