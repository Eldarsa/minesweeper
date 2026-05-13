import { describe, it, expect } from 'vitest';
import {
  createEmptyGrid,
  placeMines,
} from '../minesweeper';
import type { Settings } from '../types';

const settings = (rows: number, cols: number, shot: number, ice: number, wild: number): Settings => ({
  rows,
  cols,
  mix: { shot, ice, wild },
  wildcardText: 'Bunns!',
});

// Deterministic RNG for tests: mulberry32
function rng(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6D2B79F5) >>> 0;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

describe('createEmptyGrid', () => {
  it('returns rows×cols of empty cells', () => {
    const grid = createEmptyGrid(3, 4);
    expect(grid.length).toBe(3);
    expect(grid[0].length).toBe(4);
    for (const row of grid) for (const c of row) {
      expect(c).toEqual({ hasMine: false, flavor: null, revealed: false, flagged: false, adjacent: 0 });
    }
  });
});

describe('placeMines', () => {
  it('places exactly the mix sum of mines', () => {
    const grid = createEmptyGrid(9, 9);
    const placed = placeMines(grid, settings(9, 9, 3, 2, 1), { row: 0, col: 0 }, rng(1));
    let count = 0;
    for (const row of placed) for (const c of row) if (c.hasMine) count++;
    expect(count).toBe(6);
  });

  it('distributes flavors per the mix', () => {
    const grid = createEmptyGrid(9, 9);
    const placed = placeMines(grid, settings(9, 9, 3, 2, 1), { row: 0, col: 0 }, rng(2));
    const tally = { shot: 0, ice: 0, wild: 0 };
    for (const row of placed) for (const c of row) if (c.flavor) tally[c.flavor]++;
    expect(tally).toEqual({ shot: 3, ice: 2, wild: 1 });
  });

  it('keeps the first-click 3×3 safety zone mine-free (interior cell)', () => {
    const grid = createEmptyGrid(9, 9);
    const placed = placeMines(grid, settings(9, 9, 30, 0, 0), { row: 4, col: 4 }, rng(3));
    for (let r = 3; r <= 5; r++) {
      for (let c = 3; c <= 5; c++) {
        expect(placed[r][c].hasMine).toBe(false);
      }
    }
  });

  it('keeps the first-click safety zone mine-free (corner cell)', () => {
    const grid = createEmptyGrid(9, 9);
    const placed = placeMines(grid, settings(9, 9, 30, 0, 0), { row: 0, col: 0 }, rng(4));
    for (let r = 0; r <= 1; r++) {
      for (let c = 0; c <= 1; c++) {
        expect(placed[r][c].hasMine).toBe(false);
      }
    }
  });

  it('computes adjacent counts matching the placed mines', () => {
    const grid = createEmptyGrid(5, 5);
    const placed = placeMines(grid, settings(5, 5, 3, 0, 0), { row: 4, col: 4 }, rng(5));
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (placed[r][c].hasMine) continue;
        let expected = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr, nc = c + dc;
            if (nr < 0 || nr >= 5 || nc < 0 || nc >= 5) continue;
            if (placed[nr][nc].hasMine) expected++;
          }
        }
        expect(placed[r][c].adjacent).toBe(expected);
      }
    }
  });
});
