'use client';

import type { GameMode, Player } from '@/lib/types';
import { TurnTimer } from './TurnTimer';

type Props = {
  onExit: () => void;

  // Random-player mode (all null/empty in classic)
  mode: GameMode;
  players: Player[];
  currentPlayerIdx: number | null;
  turnExpiresAt: number | null;
  turnRemainingMs: number | null;
  turnSeconds: number;
  onTurnExpire: () => void;
  onTogglePause: () => void;
  pauseDisabled: boolean;
  showCoords: boolean;
  onToggleCoords: () => void;
};

export function Hud({
  onExit,
  mode, players, currentPlayerIdx, turnExpiresAt, turnRemainingMs, turnSeconds,
  onTurnExpire, onTogglePause, pauseDisabled,
  showCoords, onToggleCoords,
}: Props) {
  const currentName = mode === 'random-player' && currentPlayerIdx !== null
    ? players[currentPlayerIdx]?.name ?? null
    : null;
  const paused = turnRemainingMs !== null;

  return (
    <div style={{
      flex: '0 0 auto',
      display: 'grid',
      gridTemplateColumns: '1fr auto 1fr',
      alignItems: 'center',
      gap: 10,
      marginBottom: 12,
    }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifySelf: 'start', flexWrap: 'wrap' }}>
        <button
          onClick={(e) => { e.stopPropagation(); if (confirm('Avslutt spillet og gå til hovedmenyen?')) onExit(); }}
          style={pillButton(false)}
          title="Avslutt og gå til hovedmenyen"
        >
          ← Hovedmeny
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleCoords(); }}
          title={showCoords ? 'Skjul rutekoder' : 'Vis rutekoder'}
          style={pillButton(showCoords)}
        >
          {showCoords ? '🏷️ Ruter på' : '🏷️ Ruter av'}
        </button>
      </div>

      <div style={{ justifySelf: 'center' }}>
        {mode === 'random-player' && (
          <TurnTimer
            expiresAt={turnExpiresAt}
            pausedRemainingMs={turnRemainingMs}
            totalSeconds={turnSeconds}
            playerName={currentName}
            onExpire={onTurnExpire}
          />
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifySelf: 'end' }}>
        {mode === 'random-player' && (
          <button
            onClick={(e) => { e.stopPropagation(); onTogglePause(); }}
            disabled={pauseDisabled}
            title={paused ? 'Fortsett' : 'Pause'}
            style={{
              ...pillButton(paused, paused ? '#ffd23f' : undefined),
              cursor: pauseDisabled ? 'not-allowed' : 'pointer',
              opacity: pauseDisabled ? 0.4 : 1,
            }}
          >
            {paused ? '▶ Fortsett' : '⏸ Pause'}
          </button>
        )}
      </div>
    </div>
  );
}

function pillButton(active: boolean, accent?: string): React.CSSProperties {
  return {
    background: active ? 'rgba(184,92,255,0.18)' : 'rgba(255,255,255,0.06)',
    border: `1px solid ${active ? (accent ?? '#b85cff') : 'rgba(255,255,255,0.18)'}`,
    borderRadius: 999,
    padding: '8px 14px',
    color: 'var(--text-on-dark)',
    fontWeight: 700, fontSize: 13, cursor: 'pointer',
    fontFamily: 'inherit',
  };
}
