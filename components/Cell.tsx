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

export function Cell({ cell, row, col, isLastReveal, showCoord, onClick, onRightClick }: Props) {
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
      background: 'linear-gradient(140deg, #ffc488 0%, #ff9a4a 100%)',
      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.35), 0 3px 8px rgba(0,0,0,0.22)',
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
    const glyph = cell.flavor === 'shot' ? '🥃' : cell.flavor === 'ice' ? '❄' : '🎲';
    return (
      <div style={{
        ...base,
        background: 'linear-gradient(140deg, #ff2a3c 0%, #a80818 100%)',
        boxShadow: 'inset 0 0 0 2px rgba(255,220,220,0.45), 0 6px 20px rgba(255,40,60,0.55)',
        color: 'white',
        animation: 'tilePop .35s ease-out',
      }}>
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
