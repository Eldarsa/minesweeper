import { describe, it, expect } from 'vitest';
import {
  createEmptyGrid,
  placeMines,
  reveal,
  toggleFlag,
  countSafeRemaining,
} from '../minesweeper';
import type { Settings } from '../types';

const settings = (rows: number, cols: number, shot: number, ice: number, wild: number): Settings => ({
  rows,
  cols,
  mix: { shot, ice, wild },
  wildcardText: 'Bunns!',
  mode: 'classic',
  players: [],
  turnSeconds: 15,
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

function placedFixture() {
  // 3×3 grid; mine at (1,1); adjacency hand-set so revealing (0,0) returns just the cell.
  const grid = createEmptyGrid(3, 3);
  grid[1][1] = { hasMine: true, flavor: 'shot', revealed: false, flagged: false, adjacent: 0 };
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (grid[r][c].hasMine) continue;
      grid[r][c].adjacent = 1; // every non-mine neighbors the single mine
    }
  }
  return grid;
}

describe('reveal', () => {
  it('reveals a numbered cell only', () => {
    const grid = placedFixture();
    const result = reveal(grid, 0, 0);
    expect(result.cascade).toEqual([{ row: 0, col: 0 }]);
    expect(result.hitMine).toBeNull();
    expect(result.grid[0][0].revealed).toBe(true);
    expect(result.grid[0][1].revealed).toBe(false);
  });

  it('revealing a mine returns hitMine and marks the cell revealed', () => {
    const grid = placedFixture();
    const result = reveal(grid, 1, 1);
    expect(result.hitMine).toEqual({ row: 1, col: 1, flavor: 'shot' });
    expect(result.grid[1][1].revealed).toBe(true);
    expect(result.cascade).toEqual([{ row: 1, col: 1 }]);
  });

  it('cascades through empty (zero-adjacent) cells', () => {
    // 4×4 grid with one mine in the corner; the rest have zero or one adjacent.
    const grid = createEmptyGrid(4, 4);
    grid[3][3] = { hasMine: true, flavor: 'ice', revealed: false, flagged: false, adjacent: 0 };
    // Adjacency by hand: only (2,2), (2,3), (3,2) touch the mine
    grid[2][2].adjacent = 1;
    grid[2][3].adjacent = 1;
    grid[3][2].adjacent = 1;
    // All others remain zero-adjacent

    const result = reveal(grid, 0, 0);
    // Cascade should reveal everything except the mine and the three "1" cells stop the cascade
    // (the 1-cells themselves are revealed but their neighbors past them are not auto-revealed)
    const revealedCount = result.grid.flat().filter(c => c.revealed).length;
    expect(revealedCount).toBeGreaterThanOrEqual(13); // 16 cells - 1 mine - at most 2 unrevealed
    expect(result.grid[3][3].revealed).toBe(false);
    expect(result.hitMine).toBeNull();
  });

  it('does not reveal a flagged cell', () => {
    const grid = placedFixture();
    grid[0][0].flagged = true;
    const result = reveal(grid, 0, 0);
    expect(result.grid[0][0].revealed).toBe(false);
    expect(result.cascade).toEqual([]);
    expect(result.hitMine).toBeNull();
  });

  it('flag→reveal-blocked→unflag→reveal-succeeds: a flagged cell must be unflagged before it can be opened', () => {
    let grid = placedFixture();
    grid = toggleFlag(grid, 0, 0);
    expect(grid[0][0].flagged).toBe(true);
    let result = reveal(grid, 0, 0);
    expect(result.grid[0][0].revealed).toBe(false);
    expect(result.cascade).toEqual([]);

    const unflagged = toggleFlag(result.grid, 0, 0);
    expect(unflagged[0][0].flagged).toBe(false);
    result = reveal(unflagged, 0, 0);
    expect(result.grid[0][0].revealed).toBe(true);
    expect(result.cascade).toEqual([{ row: 0, col: 0 }]);
  });

  it('does nothing when revealing an already-revealed cell', () => {
    const grid = placedFixture();
    grid[0][0].revealed = true;
    const result = reveal(grid, 0, 0);
    expect(result.cascade).toEqual([]);
    expect(result.hitMine).toBeNull();
  });
});

describe('toggleFlag', () => {
  it('flags an unrevealed cell', () => {
    const grid = placedFixture();
    const next = toggleFlag(grid, 0, 0);
    expect(next[0][0].flagged).toBe(true);
  });
  it('unflags a flagged cell', () => {
    const grid = placedFixture();
    grid[0][0].flagged = true;
    const next = toggleFlag(grid, 0, 0);
    expect(next[0][0].flagged).toBe(false);
  });
  it('does nothing on a revealed cell', () => {
    const grid = placedFixture();
    grid[0][0].revealed = true;
    const next = toggleFlag(grid, 0, 0);
    expect(next[0][0].flagged).toBe(false);
  });
});

describe('countSafeRemaining', () => {
  it('counts unrevealed non-mine cells', () => {
    const grid = placedFixture();
    grid[0][0].revealed = true;
    // 9 cells total, 1 mine, 1 revealed safe → 7 safe remaining
    expect(countSafeRemaining(grid)).toBe(7);
  });
  it('returns 0 when all safe cells revealed', () => {
    const grid = placedFixture();
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (!grid[r][c].hasMine) grid[r][c].revealed = true;
      }
    }
    expect(countSafeRemaining(grid)).toBe(0);
  });
});
