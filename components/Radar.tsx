'use client';

import { bearingDegrees } from '@/lib/geo';

export type NearbyUser = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distance_m: number;
};

type Props = {
  self: { lat: number; lng: number } | null;
  users: NearbyUser[];
  radiusMeters: number;
  onSelect: (u: NearbyUser) => void;
  pendingIds: Set<string>;
  connectedIds: Set<string>;
};

const SIZE = 340;
const CENTER = SIZE / 2;
const MAX_R = SIZE / 2 - 28;

export default function Radar({ self, users, radiusMeters, onSelect, pendingIds, connectedIds }: Props) {
  const rings = [1, 2, 3, 4];

  return (
    <div style={{ position: 'relative', width: SIZE, height: SIZE, margin: '0 auto' }}>
      <svg width={SIZE} height={SIZE} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <radialGradient id="scope" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#101724" />
            <stop offset="100%" stopColor="#0a0e14" />
          </radialGradient>
          <clipPath id="scopeClip">
            <circle cx={CENTER} cy={CENTER} r={MAX_R} />
          </clipPath>
        </defs>

        <circle cx={CENTER} cy={CENTER} r={MAX_R} fill="url(#scope)" stroke="var(--grid)" strokeWidth={1.5} />

        {rings.map((r) => (
          <circle
            key={r}
            cx={CENTER}
            cy={CENTER}
            r={(MAX_R / rings.length) * r}
            fill="none"
            stroke="var(--grid)"
            strokeWidth={1}
          />
        ))}
        <line x1={CENTER} y1={CENTER - MAX_R} x2={CENTER} y2={CENTER + MAX_R} stroke="var(--grid)" strokeWidth={1} />
        <line x1={CENTER - MAX_R} y1={CENTER} x2={CENTER + MAX_R} y2={CENTER} stroke="var(--grid)" strokeWidth={1} />

        {/* barrido giratorio */}
        <g clipPath="url(#scopeClip)">
          <g style={{ transformOrigin: `${CENTER}px ${CENTER}px`, animation: 'spin 3.2s linear infinite' }}>
            <path
              d={`M ${CENTER} ${CENTER} L ${CENTER} ${CENTER - MAX_R} A ${MAX_R} ${MAX_R} 0 0 1 ${
                CENTER + MAX_R * Math.sin((40 * Math.PI) / 180)
              } ${CENTER - MAX_R * Math.cos((40 * Math.PI) / 180)} Z`}
              fill="url(#sweepFill)"
            />
          </g>
        </g>
        <defs>
          <linearGradient id="sweepFill" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="var(--amber)" stopOpacity="0" />
            <stop offset="100%" stopColor="var(--amber)" stopOpacity="0.22" />
          </linearGradient>
        </defs>

        {/* centro = yo */}
        <circle cx={CENTER} cy={CENTER} r={5} fill="var(--cyan)" />
        <circle cx={CENTER} cy={CENTER} r={9} fill="none" stroke="var(--cyan)" strokeWidth={1} opacity={0.5} />

        {/* blips */}
        {self &&
          users.map((u) => {
            const bearing = bearingDegrees(self.lat, self.lng, u.lat, u.lng);
            const rNorm = Math.min(u.distance_m / radiusMeters, 1) * MAX_R;
            const angleRad = ((bearing - 90) * Math.PI) / 180;
            const x = CENTER + rNorm * Math.cos(angleRad);
            const y = CENTER + rNorm * Math.sin(angleRad);
            const isConnected = connectedIds.has(u.id);
            const isPending = pendingIds.has(u.id);
            const color = isConnected ? 'var(--cyan)' : isPending ? 'var(--text-dim)' : 'var(--amber)';

            return (
              <g
                key={u.id}
                transform={`translate(${x}, ${y})`}
                onClick={() => onSelect(u)}
                style={{ cursor: 'pointer' }}
              >
                <circle r={10} fill="transparent" />
                <circle r={5} fill={color} style={{ animation: isPending ? 'none' : 'ping 1.8s ease-out infinite' }} />
                <circle r={5} fill={color} />
                <text
                  y={-12}
                  textAnchor="middle"
                  fill="var(--text)"
                  fontFamily="var(--font-mono)"
                  fontSize={10}
                >
                  {u.name}
                </text>
              </g>
            );
          })}
      </svg>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes ping {
          0% { opacity: 1; }
          70% { opacity: 0.15; transform: scale(2.2); }
          100% { opacity: 0; transform: scale(2.2); }
        }
      `}</style>
    </div>
  );
}
