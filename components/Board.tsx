'use client';

import { Cell } from './Cell';
import { COL_LETTERS } from '@/lib/coords';
import type { Cell as CellModel } from '@/lib/types';

type Props = {
  grid: CellModel[][];
  lastReveal: { row: number; col: number } | null;
  onReveal: (row: number, col: number) => void;
  onFlag: (row: number, col: number) => void;
};

export function Board({ grid, lastReveal, onReveal, onFlag }: Props) {
  if (grid.length === 0) return null;
  const rows = grid.length;
  const cols = grid[0].length;

  return (
    <div style={{
      flex: '1 1 auto',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: 0,
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `42px repeat(${cols}, 1fr)`,
        gridTemplateRows: `42px repeat(${rows}, 1fr)`,
        gap: 6,
        aspectRatio: `${28 + cols * 60 + (cols - 1) * 6} / ${28 + rows * 60 + (rows - 1) * 6}`,
        height: '100%',
        maxWidth: '100%',
      }}>
        {/* Top axis (empty corner + column letters) */}
        <div />
        {Array.from({ length: cols }).map((_, c) => (
          <Axis key={`top-${c}`}>{COL_LETTERS[c]}</Axis>
        ))}
        {/* Rows */}
        {grid.map((row, r) => (
          <RowFragment
            key={`row-${r}`}
            r={r}
            row={row}
            isLastRow={lastReveal?.row === r}
            lastCol={lastReveal?.col ?? -1}
            onReveal={onReveal}
            onFlag={onFlag}
          />
        ))}
      </div>
    </div>
  );
}

function RowFragment({ r, row, isLastRow, lastCol, onReveal, onFlag }: {
  r: number; row: CellModel[];
  isLastRow: boolean; lastCol: number;
  onReveal: (r: number, c: number) => void;
  onFlag: (r: number, c: number) => void;
}) {
  return (
    <>
      <Axis>{r + 1}</Axis>
      {row.map((cell, c) => (
        <Cell
          key={`${r}-${c}`}
          cell={cell} row={r} col={c}
          isLastReveal={isLastRow && c === lastCol}
          onClick={() => onReveal(r, c)}
          onRightClick={() => onFlag(r, c)}
        />
      ))}
    </>
  );
}

function Axis({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 800, fontSize: 'clamp(16px, 2vh, 22px)', color: '#d4c4ff',
      userSelect: 'none', letterSpacing: '.04em',
    }}>{children}</div>
  );
}
