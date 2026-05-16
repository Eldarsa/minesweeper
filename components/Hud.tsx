'use client';

import { useEffect, useRef } from 'react';
import type { FlavorTally, GameMode, Player } from '@/lib/types';
import { TurnTimer } from './TurnTimer';

type Props = {
  totalMines: number;
  triggered: FlavorTally;
  inputValue: string;
  inputError: 'invalid' | 'oob' | 'flagsDisabled' | null;
  onInputChange: (v: string) => void;
  onSubmit: () => void;
  onExit: () => void;

  // Random-player mode (all null/empty in classic)
  mode: GameMode;
  players: Player[];
  currentPlayerIdx: number | null;
  turnExpiresAt: number | null;
  turnSeconds: number;
  onTurnExpire: () => void;
  inputDisabled: boolean;
};

export function Hud({
  totalMines, triggered, inputValue, inputError, onInputChange, onSubmit, onExit,
  mode, players, currentPlayerIdx, turnExpiresAt, turnSeconds, onTurnExpire, inputDisabled,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  useEffect(() => {
    const onClick = () => { if (!inputDisabled) inputRef.current?.focus(); };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [inputDisabled]);

  const totalTriggered = triggered.shot + triggered.ice + triggered.wild;
  const currentName = mode === 'random-player' && currentPlayerIdx !== null
    ? players[currentPlayerIdx]?.name ?? null
    : null;

  const errorMessage =
    inputError === 'oob' ? 'Ukjent rute' :
    inputError === 'invalid' ? 'Ugyldig' :
    inputError === 'flagsDisabled' ? 'Flagging er av i festmodus' :
    mode === 'random-player' ? '↵ for å åpne rute' :
    '↵ for å åpne · «F rute» for å flagge';

  return (
    <div style={{
      flex: '0 0 auto',
      display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap',
    }}>
      <Pill label="Miner" value={`${totalTriggered} / ${totalMines}`} />
      <Pill label="🥃 Shots" value={String(triggered.shot)} />
      <Pill label="❄ Iser" value={String(triggered.ice)} />
      <Pill label="🎲 Jokere" value={String(triggered.wild)} />

      <button
        onClick={(e) => { e.stopPropagation(); if (confirm('Avslutt spillet og gå til hovedmenyen?')) onExit(); }}
        style={{
          marginLeft: 8,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.18)',
          borderRadius: 999,
          padding: '8px 14px',
          color: 'var(--text-on-dark)',
          fontWeight: 700, fontSize: 13, cursor: 'pointer',
          fontFamily: 'inherit',
        }}
        title="Avslutt og gå til hovedmenyen"
      >
        ← Hovedmeny
      </button>

      {mode === 'random-player' && (
        <TurnTimer
          expiresAt={turnExpiresAt}
          totalSeconds={turnSeconds}
          playerName={currentName}
          onExpire={onTurnExpire}
        />
      )}

      <div style={{
        marginLeft: 'auto',
        background: inputDisabled ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.95)',
        border: `2px solid ${inputError ? '#ff3d6e' : '#b85cff'}`,
        borderRadius: 999,
        padding: '8px 16px',
        boxShadow: '0 6px 20px rgba(184, 92, 255, 0.35)',
        display: 'flex', alignItems: 'center', gap: 10, minWidth: 320,
        opacity: inputDisabled ? 0.6 : 1,
      }}>
        <input
          ref={inputRef}
          value={inputValue}
          onChange={e => onInputChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onSubmit(); }}
          disabled={inputDisabled}
          placeholder={currentName ? `${currentName}, skriv rute…` : 'Skriv rute, f.eks. F4'}
          style={{
            flex: 1, border: 0, outline: 0, fontSize: 16, fontWeight: 800,
            color: '#2a1845', background: 'transparent',
            textTransform: 'uppercase', letterSpacing: '.04em',
          }}
        />
        <span style={{ color: inputError ? '#ff3d6e' : '#6a4d7a', fontSize: 11, fontWeight: 700 }}>
          {errorMessage}
        </span>
      </div>
    </div>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.08)',
      border: '1px solid rgba(255,255,255,0.14)',
      borderRadius: 999,
      padding: '8px 14px',
      boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
      fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
      color: 'var(--text-on-dark)',
    }}>
      <span style={{ color: 'var(--muted-on-dark)', textTransform: 'uppercase', letterSpacing: '.08em', fontSize: 10, fontWeight: 700 }}>{label}</span>
      <span style={{ fontWeight: 800, color: '#fff', fontSize: 15 }}>{value}</span>
    </div>
  );
}
