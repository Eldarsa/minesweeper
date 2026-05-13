import type { Cell, Settings, MineFlavor } from './types';

export type RevealResult = {
  grid: Cell[][];
  cascade: Array<{ row: number; col: number }>;
  hitMine: { row: number; col: number; flavor: MineFlavor } | null;
};

export function createEmptyGrid(rows: number, cols: number): Cell[][] {
  const grid: Cell[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < cols; c++) {
      row.push({ hasMine: false, flavor: null, revealed: false, flagged: false, adjacent: 0 });
    }
    grid.push(row);
  }
  return grid;
}

export function placeMines(
  grid: Cell[][],
  settings: Settings,
  firstReveal: { row: number; col: number },
  rng: () => number,
): Cell[][] {
  const { rows, cols, mix } = settings;
  const total = mix.shot + mix.ice + mix.wild;
  const safeZone = new Set<number>();
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const r = firstReveal.row + dr, c = firstReveal.col + dc;
      if (r >= 0 && r < rows && c >= 0 && c < cols) {
        safeZone.add(r * cols + c);
      }
    }
  }

  const candidates: number[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      if (!safeZone.has(idx)) candidates.push(idx);
    }
  }

  // Fisher–Yates shuffle, take first `total`
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const minePositions = candidates.slice(0, total);

  // Build the flavor pool and shuffle it
  const flavorPool: MineFlavor[] = [
    ...Array(mix.shot).fill('shot' as MineFlavor),
    ...Array(mix.ice).fill('ice' as MineFlavor),
    ...Array(mix.wild).fill('wild' as MineFlavor),
  ];
  for (let i = flavorPool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [flavorPool[i], flavorPool[j]] = [flavorPool[j], flavorPool[i]];
  }

  const next = grid.map(row => row.map(c => ({ ...c })));
  minePositions.forEach((idx, i) => {
    const r = Math.floor(idx / cols);
    const c = idx % cols;
    next[r][c] = { ...next[r][c], hasMine: true, flavor: flavorPool[i] };
  });

  // Compute adjacency
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (next[r][c].hasMine) continue;
      let count = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr, nc = c + dc;
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
          if (next[nr][nc].hasMine) count++;
        }
      }
      next[r][c] = { ...next[r][c], adjacent: count };
    }
  }

  return next;
}

export function reveal(grid: Cell[][], row: number, col: number): RevealResult {
  const rows = grid.length;
  const cols = grid[0].length;
  const target = grid[row][col];

  if (target.revealed || target.flagged) {
    return { grid, cascade: [], hitMine: null };
  }

  const next = grid.map(r => r.map(c => ({ ...c })));

  if (target.hasMine) {
    next[row][col].revealed = true;
    return {
      grid: next,
      cascade: [{ row, col }],
      hitMine: { row, col, flavor: target.flavor! },
    };
  }

  const cascade: Array<{ row: number; col: number }> = [];
  const queue: Array<[number, number]> = [[row, col]];
  const seen = new Set<number>([row * cols + col]);

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    const cell = next[r][c];
    if (cell.revealed || cell.flagged || cell.hasMine) continue;
    cell.revealed = true;
    cascade.push({ row: r, col: c });

    if (cell.adjacent === 0) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr, nc = c + dc;
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
          const idx = nr * cols + nc;
          if (seen.has(idx)) continue;
          seen.add(idx);
          queue.push([nr, nc]);
        }
      }
    }
  }

  return { grid: next, cascade, hitMine: null };
}

export function toggleFlag(grid: Cell[][], row: number, col: number): Cell[][] {
  const cell = grid[row][col];
  if (cell.revealed) return grid;
  const next = grid.map(r => r.map(c => ({ ...c })));
  next[row][col].flagged = !next[row][col].flagged;
  return next;
}

export function countSafeRemaining(grid: Cell[][]): number {
  let count = 0;
  for (const row of grid) {
    for (const c of row) {
      if (!c.hasMine && !c.revealed) count++;
    }
  }
  return count;
}
