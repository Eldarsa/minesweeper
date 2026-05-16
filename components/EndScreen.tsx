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
  const isRandomPlayer = state.settings.mode === 'random-player' && state.settings.players.length > 0;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', width: '100vw', padding: 24,
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.14)',
        borderRadius: 24, padding: 36,
        width: 'min(620px, 100%)', textAlign: 'center',
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
          <Stat label="❄ Ice servert" value={state.triggered.ice} />
          <Stat label="🎲 Jokere servert" value={state.triggered.wild} />
          <Stat label="🛡 Miner unngått" value={avoided} />
        </div>

        {isRandomPlayer && (
          <div style={{ marginTop: 24 }}>
            <h3 style={{
              margin: '0 0 8px', fontSize: 12, color: 'var(--muted-on-dark)',
              textTransform: 'uppercase', letterSpacing: '.12em', fontWeight: 800,
            }}>
              Per deltaker
            </h3>
            <div style={{
              borderRadius: 14, overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.14)',
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, color: '#fff' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <Th align="left">Navn</Th>
                    <Th>Turer</Th>
                    <Th>🥃</Th>
                    <Th>❄</Th>
                    <Th>🎲</Th>
                  </tr>
                </thead>
                <tbody>
                  {state.settings.players.map((p, i) => {
                    const s = state.playerStats[i] ?? { turns: 0, shot: 0, ice: 0, wild: 0 };
                    return (
                      <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                        <Td align="left"><strong>{p.name}</strong></Td>
                        <Td>{s.turns}</Td>
                        <Td>{s.shot}</Td>
                        <Td>{s.ice}</Td>
                        <Td>{s.wild}</Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

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

function Th({ children, align }: { children: React.ReactNode; align?: 'left' | 'center' }) {
  return (
    <th style={{
      padding: '10px 12px', textAlign: align ?? 'center',
      fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em',
      color: 'var(--muted-on-dark)', fontWeight: 800,
    }}>{children}</th>
  );
}

function Td({ children, align }: { children: React.ReactNode; align?: 'left' | 'center' }) {
  return (
    <td style={{
      padding: '10px 12px', textAlign: align ?? 'center',
      fontSize: 15, fontWeight: 700,
    }}>{children}</td>
  );
}
