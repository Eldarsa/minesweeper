'use client';

import { useEffect, useState } from 'react';

type Props = {
  expiresAt: number | null;
  totalSeconds: number;
  playerName: string | null;
  onExpire: () => void;
};

export function TurnTimer({ expiresAt, totalSeconds, playerName, onExpire }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);

  // Fire the expire dispatch exactly once when the deadline passes
  useEffect(() => {
    if (!expiresAt) return;
    const ms = expiresAt - Date.now();
    if (ms <= 0) { onExpire(); return; }
    const t = setTimeout(onExpire, ms);
    return () => clearTimeout(t);
  }, [expiresAt, onExpire]);

  // Tick the visual countdown
  useEffect(() => {
    if (!expiresAt) return;
    function tick() {
      const ms = (expiresAt ?? 0) - Date.now();
      setSecondsLeft(Math.max(0, Math.ceil(ms / 1000)));
    }
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [expiresAt]);

  if (!playerName) return null;

  const urgent = expiresAt !== null && secondsLeft <= 5;
  const accent = urgent ? '#ff3d6e' : '#ffd23f';

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 12,
      background: 'rgba(255,210,63,0.12)',
      border: `2px solid ${accent}`,
      borderRadius: 999,
      padding: '6px 16px 6px 8px',
      boxShadow: urgent ? `0 0 24px ${accent}80` : '0 4px 14px rgba(0,0,0,0.18)',
      transition: 'box-shadow .2s ease, border-color .2s ease',
      animation: urgent ? 'turnTimerPulse .9s ease-in-out infinite' : undefined,
    }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 32, height: 32, borderRadius: 999,
        background: accent, color: '#241046',
        fontWeight: 900, fontSize: 14,
      }}>
        {expiresAt === null ? '–' : secondsLeft}
      </span>
      <span style={{ color: '#fff', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', fontWeight: 800 }}>
        Tur
      </span>
      <span style={{ color: '#fff', fontWeight: 900, fontSize: 16 }}>
        {playerName}
      </span>
      <style>{`
        @keyframes turnTimerPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.04); }
        }
      `}</style>
    </div>
  );
}
