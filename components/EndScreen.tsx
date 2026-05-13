'use client';

import type { GameState } from '@/lib/types';

type Props = {
  state: GameState;
  onPlayAgain: () => void;
};

export function EndScreen({ state, onPlayAgain }: Props) {
  const totalMines = state.settings.mix.shot + state.settings.mix.ice + state.settings.mix.wild;
  const totalTriggered = state.triggered.shot + state.triggered.ice + state.triggered.wild;
  const avoided = totalMines - totalTriggered;
  const elapsedSec = state.startedAt && state.endedAt ? Math.round((state.endedAt - state.startedAt) / 1000) : 0;
  const mins = Math.floor(elapsedSec / 60);
  const secs = elapsedSec % 60;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', width: '100vw', padding: 24,
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.14)',
        borderRadius: 24, padding: 36,
        width: 'min(520px, 100%)', textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
      }}>
        <h1 style={{
          fontSize: 56, margin: 0, fontWeight: 900,
          background: 'linear-gradient(90deg, #ff5c8a, #ff9a3c, #ffd23f, #2ec4b6, #b85cff)',
          WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
        }}>Renset! 🎉</h1>
        <p style={{ color: 'var(--muted-on-dark)', marginTop: 8 }}>
          Tid: {mins} min {secs.toString().padStart(2, '0')} s
        </p>

        <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          <Stat label="🥃 Shots servert" value={state.triggered.shot} />
          <Stat label="❄ Iser servert" value={state.triggered.ice} />
          <Stat label="🎲 Jokere servert" value={state.triggered.wild} />
          <Stat label="🛡 Miner unngått" value={avoided} />
        </div>

        <button
          onClick={onPlayAgain}
          style={{
            marginTop: 28, width: '100%', padding: '14px 20px', borderRadius: 14,
            border: 'none', cursor: 'pointer',
            background: 'linear-gradient(90deg, #ff5c8a, #b85cff)',
            color: '#fff', fontWeight: 900, fontSize: 18,
            boxShadow: '0 10px 30px rgba(184,92,255,0.35)',
          }}
        >
          Spill igjen
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.14)',
      borderRadius: 12, padding: '12px 14px',
    }}>
      <div style={{ fontSize: 11, color: 'var(--muted-on-dark)', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', marginTop: 2 }}>{value}</div>
    </div>
  );
}
