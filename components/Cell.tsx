'use client';

import type { Cell as CellModel } from '@/lib/types';
import { formatCoord } from '@/lib/coords';

type Props = {
  cell: CellModel;
  row: number;
  col: number;
  isLastReveal: boolean;
  showCoord: boolean;
  onClick: () => void;
  onRightClick: () => void;
};

const NUMBER_COLORS = ['', '#2563eb', '#16a34a', '#e11d48', '#7c3aed', '#b45309', '#0891b2', '#1f2937', '#6b7280'];

function hueFor(row: number, col: number): number {
  return Math.floor((row * 37 + col * 53) % 360);
}

export function Cell({ cell, row, col, isLastReveal, showCoord, onClick, onRightClick }: Props) {
  const hue = hueFor(row, col);
  const animationDelay = `${((row + col) % 7) * 0.25}s`;

  const base: React.CSSProperties = {
    aspectRatio: '1 / 1',
    borderRadius: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 900,
    fontFamily: 'ui-rounded, system-ui, sans-serif',
    userSelect: 'none',
    position: 'relative',
    transition: 'transform .15s',
    fontSize: 'clamp(14px, 2.4vh, 28px)',
    cursor: cell.revealed ? 'default' : 'pointer',
    outline: isLastReveal ? '4px solid #ffd23f' : 'none',
    outlineOffset: 3,
  };

  if (!cell.revealed) {
    const style: React.CSSProperties = {
      ...base,
      background: `linear-gradient(140deg, hsl(${hue}, 70%, 62%) 0%, hsl(${hue + 35}, 70%, 56%) 100%)`,
      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.25), 0 3px 8px rgba(0,0,0,0.22)',
      animation: 'tileGlow 4.5s ease-in-out infinite',
      animationDelay,
    };
    return (
      <div style={style} onClick={onClick} onContextMenu={e => { e.preventDefault(); onRightClick(); }}>
        {cell.flagged && (
          <span style={{ fontSize: '1.6em', color: '#fff', filter: 'drop-shadow(0 2px 0 rgba(0,0,0,0.25))' }}>⚑</span>
        )}
        {showCoord && !cell.flagged && (
          <span style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(40, 30, 70, 0.55)',
            fontSize: 'clamp(14px, 2vh, 20px)',
            fontWeight: 800,
            letterSpacing: '.04em',
            pointerEvents: 'none',
            userSelect: 'none',
          }}>
            {formatCoord(row, col)}
          </span>
        )}
      </div>
    );
  }

  if (cell.hasMine && cell.flavor) {
    const grad = cell.flavor === 'shot' ? 'linear-gradient(140deg, #ff5c8a 0%, #ff9a3c 100%)'
              : cell.flavor === 'ice'  ? 'linear-gradient(140deg, #2ec4b6 0%, #4cc9f0 100%)'
              :                          'linear-gradient(140deg, #b85cff 0%, #ff5cf2 100%)';
    const shadow = cell.flavor === 'shot' ? 'inset 0 0 0 2px rgba(255,255,255,0.6), 0 6px 16px rgba(255, 92, 138, 0.4)'
                : cell.flavor === 'ice'  ? 'inset 0 0 0 2px rgba(255,255,255,0.6), 0 6px 16px rgba(76, 201, 240, 0.4)'
                :                          'inset 0 0 0 2px rgba(255,255,255,0.6), 0 6px 16px rgba(184, 92, 255, 0.4)';
    const glyph = cell.flavor === 'shot' ? '🥃' : cell.flavor === 'ice' ? '❄' : '🎲';
    return (
      <div style={{ ...base, background: grad, boxShadow: shadow, color: 'white', animation: 'tilePop .35s ease-out' }}>
        {glyph}
      </div>
    );
  }

  const isEmpty = cell.adjacent === 0;
  const numberColor = NUMBER_COLORS[cell.adjacent] || '#1f2937';
  return (
    <div style={{
      ...base,
      background: isEmpty ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.92)',
      boxShadow: 'inset 0 0 0 1px rgba(106,76,255,0.10)',
      color: numberColor,
    }}>
      {!isEmpty && cell.adjacent}
    </div>
  );
}
