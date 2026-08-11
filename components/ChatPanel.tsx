'use client';

import { useEffect, useRef, useState } from 'react';

type Message = { id: string; sender_id: string; content: string; created_at: string };

type Props = {
  requestId: string;
  peerName: string;
  userId: string;
  onClose: () => void;
};

export default function ChatPanel({ requestId, peerName, userId, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      const res = await fetch(`/api/messages?requestId=${requestId}`);
      const data = await res.json();
      if (active && data.messages) setMessages(data.messages);
    };
    poll();
    const interval = setInterval(poll, 2500);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [requestId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send() {
    const content = draft.trim();
    if (!content) return;
    setDraft('');
    await fetch('/api/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, senderId: userId, content })
    });
    const res = await fetch(`/api/messages?requestId=${requestId}`);
    const data = await res.json();
    if (data.messages) setMessages(data.messages);
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(10,14,20,0.85)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        zIndex: 50
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          height: '78vh',
          background: 'var(--surface)',
          border: '1px solid var(--grid)',
          borderBottom: 'none',
          borderRadius: '12px 12px 0 0',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div
          style={{
            padding: '14px 16px',
            borderBottom: '1px solid var(--grid)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div>
            <div style={{ fontWeight: 600 }}>{peerName}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cyan)' }}>CONECTADO</div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', fontSize: 20 }}
          >
            ✕
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {messages.map((m) => {
            const mine = m.sender_id === userId;
            return (
              <div
                key={m.id}
                style={{
                  alignSelf: mine ? 'flex-end' : 'flex-start',
                  background: mine ? 'var(--amber)' : 'var(--surface-2)',
                  color: mine ? '#0a0e14' : 'var(--text)',
                  padding: '8px 12px',
                  borderRadius: 12,
                  maxWidth: '75%',
                  fontSize: 14
                }}
              >
                {m.content}
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <div style={{ padding: 12, borderTop: '1px solid var(--grid)', display: 'flex', gap: 8 }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Escribe un mensaje..."
            style={{
              flex: 1,
              background: 'var(--surface-2)',
              border: '1px solid var(--grid)',
              borderRadius: 8,
              padding: '10px 12px',
              color: 'var(--text)',
              fontSize: 14
            }}
          />
          <button
            onClick={send}
            style={{
              background: 'var(--amber)',
              color: '#0a0e14',
              border: 'none',
              borderRadius: 8,
              padding: '0 16px',
              fontWeight: 600
            }}
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}
