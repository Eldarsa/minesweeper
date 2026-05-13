'use client';

import { useEffect } from 'react';
import type { FlavorTally, MineFlavor } from '@/lib/types';
import { formatCoord } from '@/lib/coords';

type Props = {
  lastMine: { row: number; col: number; flavor: MineFlavor } | null;
  overlayDismissAt: number | null;
  totalMines: number;
  triggered: FlavorTally;
  wildcardText: string;
  onDismiss: () => void;
};

export function MineRevealOverlay({ lastMine, overlayDismissAt, totalMines, triggered, wildcardText, onDismiss }: Props) {
  useEffect(() => {
    if (!overlayDismissAt) return;
    const ms = overlayDismissAt - Date.now();
    if (ms <= 0) { onDismiss(); return; }
    const t = setTimeout(onDismiss, ms);
    return () => clearTimeout(t);
  }, [overlayDismissAt, onDismiss]);

  if (!lastMine || !overlayDismissAt) return null;

  const cell = formatCoord(lastMine.row, lastMine.col);
  const cfg =
    lastMine.flavor === 'shot' ? { glyph: '🥃', title: 'SHOT!', accent: '#ff5c8a', verb: 'bunns!' } :
    lastMine.flavor === 'ice'  ? { glyph: '❄',  title: 'IS!',   accent: '#4cc9f0', verb: 'is i nakken!' } :
                                 { glyph: '🎲', title: wildcardText.toUpperCase().slice(0, 24), accent: '#b85cff', verb: wildcardText };

  const remaining = totalMines - (triggered.shot + triggered.ice + triggered.wild);

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
