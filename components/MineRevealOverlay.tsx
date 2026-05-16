'use client';

import { useEffect } from 'react';
import type { FlavorTally, GameMode, MineFlavor } from '@/lib/types';
import { formatCoord } from '@/lib/coords';

type Props = {
  mode: GameMode;
  lastMine: { row: number; col: number; flavor: MineFlavor } | null;
  overlayDismissAt: number | null;
  totalMines: number;
  triggered: FlavorTally;
  wildcardText: string;
  currentPlayerName: string | null;
  onDismiss: () => void;
};

export function MineRevealOverlay({
  mode, lastMine, overlayDismissAt, totalMines, triggered, wildcardText, currentPlayerName, onDismiss,
}: Props) {
  const isModal = mode === 'random-player';

  // Classic mode: auto-dismiss after the deadline
  useEffect(() => {
    if (isModal) return;
    if (!overlayDismissAt) return;
    const ms = overlayDismissAt - Date.now();
    if (ms <= 0) { onDismiss(); return; }
    const t = setTimeout(onDismiss, ms);
    return () => clearTimeout(t);
  }, [isModal, overlayDismissAt, onDismiss]);

  // Modal variant: dismiss on Enter / Space
  useEffect(() => {
    if (!isModal || !overlayDismissAt) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onDismiss();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isModal, overlayDismissAt, onDismiss]);

  if (!lastMine || !overlayDismissAt) return null;

  const isVirtual = lastMine.row < 0 || lastMine.col < 0;
  const cell = isVirtual ? null : formatCoord(lastMine.row, lastMine.col);
  const cfg =
    lastMine.flavor === 'shot' ? { glyph: '🥃', title: 'SHOT!', accent: '#ff5c8a', verb: 'bunns!' } :
    lastMine.flavor === 'ice'  ? { glyph: '❄',  title: 'IS!',   accent: '#4cc9f0', verb: 'is i nakken!' } :
                                 { glyph: '🎲', title: wildcardText.toUpperCase().slice(0, 24), accent: '#b85cff', verb: wildcardText };

  const remaining = totalMines - (triggered.shot + triggered.ice + triggered.wild);

  if (isModal) {
    return (
      <div
        onClick={onDismiss}
        style={{
          position: 'fixed', inset: 0, zIndex: 20,
          background: 'rgba(8, 4, 24, 0.88)',
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24,
          animation: 'overlayFade .25s ease-out',
          cursor: 'pointer',
        }}
      >
        <div style={{
          width: 'min(560px, 100%)',
          background: 'linear-gradient(150deg, #2a1755 0%, #3a1d63 100%)',
          borderRadius: 28, padding: '36px 36px 28px',
          border: `4px solid ${cfg.accent}`,
          boxShadow: `0 24px 80px ${cfg.accent}80`,
          color: '#fff', textAlign: 'center',
        }}>
          <div style={{ fontSize: 12, letterSpacing: '.18em', color: cfg.accent, textTransform: 'uppercase', fontWeight: 800 }}>
            {isVirtual ? 'TIDEN GIKK UT' : `Mine sprengt · rute ${cell}`}
          </div>
          <div style={{ fontSize: 120, lineHeight: 1, margin: '10px 0' }}>{cfg.glyph}</div>
          <h2 style={{ fontSize: 72, fontWeight: 900, margin: 0, lineHeight: 1, color: '#fff' }}>{cfg.title}</h2>
          <p style={{ color: '#d4c4ff', fontSize: 20, margin: '14px 0 18px', fontWeight: 700 }}>
            {currentPlayerName ? <strong style={{ color: '#fff' }}>{currentPlayerName}</strong> : 'Spilleren'}
            {isVirtual ? ' rakk ikke å svare — ' : ' — '}
            {cfg.verb}
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 18 }}>
            <Chip>🥃 Shots: {triggered.shot}</Chip>
            <Chip>❄ Iser: {triggered.ice}</Chip>
            <Chip>🎲 Jokere: {triggered.wild}</Chip>
            <Chip>⏳ Igjen: {remaining}</Chip>
          </div>
          <div style={{
            fontSize: 14, fontWeight: 800, color: cfg.accent,
            letterSpacing: '.08em', textTransform: 'uppercase',
          }}>
            Trykk hvor som helst eller ↵ for å gå videre
          </div>
        </div>
        <style>{`@keyframes overlayFade { from { opacity: 0; } to { opacity: 1; } }`}</style>
      </div>
    );
  }

  // Classic toast variant (unchanged behavior)
  return (
    <div style={{
      position: 'fixed', right: 24, bottom: 24, width: 360,
      background: 'linear-gradient(150deg, #2a1755 0%, #3a1d63 100%)',
      borderRadius: 22, padding: '20px 22px',
      border: `3px solid ${cfg.accent}`,
      boxShadow: `0 18px 60px ${cfg.accent}59`,
      zIndex: 10, animation: 'overlayPop .35s ease-out',
      color: '#fff',
    }}>
      <div style={{ fontSize: 11, letterSpacing: '.14em', color: cfg.accent, textTransform: 'uppercase', fontWeight: 800 }}>
        Mine sprengt · rute {cell}
      </div>
      <div style={{ fontSize: 64, lineHeight: 1, margin: '4px 0' }}>{cfg.glyph}</div>
      <h3 style={{ fontSize: 42, fontWeight: 900, margin: 0, lineHeight: 1, color: '#fff' }}>{cfg.title}</h3>
      <p style={{ color: '#d4c4ff', fontSize: 14, margin: '6px 0 12px' }}>
        Den som ropte <strong>{cell}</strong> — {cfg.verb} Spillet fortsetter.
      </p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <Chip>🥃 Shots: {triggered.shot}</Chip>
        <Chip>❄ Iser: {triggered.ice}</Chip>
        <Chip>🎲 Jokere: {triggered.wild}</Chip>
        <Chip>⏳ Igjen: {remaining}</Chip>
      </div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      background: 'rgba(255,255,255,0.12)', color: '#fff',
      padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700,
    }}>{children}</span>
  );
}
