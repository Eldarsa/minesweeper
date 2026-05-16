'use client';

import { useEffect, useState } from 'react';

type Props = {
  expiresAt: number | null;
  pausedRemainingMs: number | null;
  totalSeconds: number;
  playerName: string | null;
  onExpire: () => void;
};

export function TurnTimer({ expiresAt, pausedRemainingMs, totalSeconds, playerName, onExpire }: Props) {
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

  const paused = pausedRemainingMs !== null;
  const displaySeconds =
    paused ? Math.max(0, Math.ceil(pausedRemainingMs! / 1000)) :
    expiresAt === null ? null :
    secondsLeft;
  const urgent = !paused && expiresAt !== null && secondsLeft <= 5;
  const accent = paused ? '#a8a3c4' : urgent ? '#ff3d6e' : '#ffd23f';

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 16,
      background: paused ? 'rgba(160,150,200,0.10)' : 'rgba(255,210,63,0.12)',
      border: `3px solid ${accent}`,
      borderRadius: 999,
      padding: '10px 28px 10px 12px',
      boxShadow: urgent ? `0 0 32px ${accent}80` : '0 6px 18px rgba(0,0,0,0.22)',
      transition: 'box-shadow .2s ease, border-color .2s ease, background .2s ease',
      animation: urgent ? 'turnTimerPulse .9s ease-in-out infinite' : undefined,
      opacity: paused ? 0.85 : 1,
    }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 52, height: 52, borderRadius: 999,
        background: accent, color: '#241046',
        fontWeight: 900, fontSize: 22,
      }}>
        {displaySeconds === null ? '–' : displaySeconds}
      </span>
      <span style={{
        color: '#fff', fontWeight: 900, fontSize: 32,
        letterSpacing: '.01em', lineHeight: 1,
      }}>
        {playerName}
      </span>
      {paused && (
        <span style={{
          color: accent, fontSize: 12, fontWeight: 900,
          textTransform: 'uppercase', letterSpacing: '.18em',
        }}>
          Pauset
        </span>
      )}
      <style>{`
        @keyframes turnTimerPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.04); }
        }
      `}</style>
    </div>
  );
}
