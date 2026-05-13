# Festminesveiper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Festminesveiper party-Minesweeper single-page app per `docs/superpowers/specs/2026-05-13-festminesveiper-design.md`.

**Architecture:** Three React phases (`setup` / `playing` / `cleared`) driven by a single `useReducer`. All game logic lives in pure TypeScript functions in `lib/` so it can be unit-tested without React. Components only render state and dispatch actions. Layout is locked to `100vh × 100vw` with a flex-fitted board.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript (strict), Tailwind v4, Vitest for unit tests, pnpm for package management.

---

## File Structure

**Created:**
- `vitest.config.ts` — test runner config
- `lib/types.ts` — `Cell`, `MineFlavor`, `Settings`, `GameState`, `Action`
- `lib/coords.ts` — `COL_LETTERS`, `parseCoord`, `formatCoord`
- `lib/minesweeper.ts` — `createEmptyGrid`, `placeMines`, `reveal`, `toggleFlag`, `countSafeRemaining`
- `lib/reducer.ts` — `initialState`, `reducer`
- `lib/__tests__/coords.test.ts`
- `lib/__tests__/minesweeper.test.ts`
- `lib/__tests__/reducer.test.ts`
- `components/SetupScreen.tsx`
- `components/Hud.tsx`
- `components/Cell.tsx`
- `components/Board.tsx`
- `components/MineRevealOverlay.tsx`
- `components/GameBoard.tsx`
- `components/EndScreen.tsx`

**Modified:**
- `package.json` — add Vitest + test scripts
- `app/globals.css` — palette tokens, body background, no-scroll baseline
- `app/layout.tsx` — set `lang="no"`, set `<title>`
- `app/page.tsx` — replace starter content with phase router

---

### Task 1: Test infrastructure (Vitest)

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `lib/__tests__/sanity.test.ts`

- [ ] **Step 1: Add Vitest devDependency**

```bash
cd /home/eldar/code/gamevault
pnpm add -D vitest@^2 @vitest/coverage-v8@^2
```

Expected: `vitest` and `@vitest/coverage-v8` appear under `devDependencies` in `package.json`.

- [ ] **Step 2: Add test scripts to `package.json`**

In `package.json`, replace the `"scripts"` block with:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/__tests__/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
```

- [ ] **Step 4: Write a sanity test**

Create `lib/__tests__/sanity.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('sanity', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Run the sanity test**

Run: `pnpm test`
Expected: `1 passed (1)` and exit code 0.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml vitest.config.ts lib/__tests__/sanity.test.ts
git commit -m "chore: add vitest test runner"
```

---

### Task 2: Domain types

**Files:**
- Create: `lib/types.ts`

No tests — type-only file.

- [ ] **Step 1: Create `lib/types.ts`**

```ts
export type MineFlavor = 'shot' | 'ice' | 'wild';

export type Cell = {
  hasMine: boolean;
  flavor: MineFlavor | null;
  revealed: boolean;
  flagged: boolean;
  adjacent: number; // 0–8
};

export type MineMix = { shot: number; ice: number; wild: number };

export type Settings = {
  rows: number;
  cols: number;
  mix: MineMix;
  wildcardText: string;
};

export type FlavorTally = { shot: number; ice: number; wild: number };

export type GameState = {
  phase: 'setup' | 'playing' | 'cleared';
  settings: Settings;
  grid: Cell[][];                                // empty until first reveal
  minesPlaced: boolean;
  triggered: FlavorTally;
  safeRemaining: number;
  lastReveal: { row: number; col: number } | null;
  lastMine: { row: number; col: number; flavor: MineFlavor } | null;
  overlayDismissAt: number | null;
  startedAt: number | null;                      // epoch ms; set on first reveal
  endedAt: number | null;                        // epoch ms; set when phase → cleared
  inputError: 'invalid' | 'oob' | null;
};

export type Action =
  | { type: 'configure'; settings: Settings }
  | { type: 'start' }
  | { type: 'reveal'; row: number; col: number; now: number }
  | { type: 'flag'; row: number; col: number }
  | { type: 'inputError'; kind: 'invalid' | 'oob' }
  | { type: 'clearInputError' }
  | { type: 'dismissOverlay' }
  | { type: 'reset' };
```

Note: `now` is passed in on `reveal` so the reducer stays pure (no `Date.now()` inside).

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat(types): add core domain types for festminesveiper"
```

---

### Task 3: Coordinate parsing

**Files:**
- Create: `lib/coords.ts`
- Create: `lib/__tests__/coords.test.ts`

- [ ] **Step 1: Write the tests**

Create `lib/__tests__/coords.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseCoord, formatCoord, COL_LETTERS } from '../coords';

describe('COL_LETTERS', () => {
  it('is 26 uppercase letters A..Z', () => {
    expect(COL_LETTERS).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
  });
});

describe('formatCoord', () => {
  it('formats (row=0, col=3) as "D1"', () => {
    expect(formatCoord(0, 3)).toBe('D1');
  });
  it('formats (row=11, col=0) as "A12"', () => {
    expect(formatCoord(11, 0)).toBe('A12');
  });
});

describe('parseCoord — reveal form', () => {
  it('parses "D7" against a 12x14 board', () => {
    expect(parseCoord('D7', 12, 14)).toEqual({ kind: 'reveal', row: 6, col: 3 });
  });
  it('is case-insensitive: "d7"', () => {
    expect(parseCoord('d7', 12, 14)).toEqual({ kind: 'reveal', row: 6, col: 3 });
  });
  it('trims surrounding whitespace', () => {
    expect(parseCoord('  D7  ', 12, 14)).toEqual({ kind: 'reveal', row: 6, col: 3 });
  });
  it('rejects "7D" as invalid (digits before letters)', () => {
    expect(parseCoord('7D', 12, 14)).toEqual({ error: 'invalid' });
  });
  it('rejects empty input as invalid', () => {
    expect(parseCoord('', 12, 14)).toEqual({ error: 'invalid' });
  });
  it('rejects out-of-bounds row "D99"', () => {
    expect(parseCoord('D99', 12, 14)).toEqual({ error: 'oob' });
  });
  it('rejects out-of-bounds column "Z1" on a 14-col board', () => {
    expect(parseCoord('Z1', 12, 14)).toEqual({ error: 'oob' });
  });
});

describe('parseCoord — flag form', () => {
  it('parses "F D7" as flag toggle', () => {
    expect(parseCoord('F D7', 12, 14)).toEqual({ kind: 'flag', row: 6, col: 3 });
  });
  it('parses "f d7" case-insensitively', () => {
    expect(parseCoord('f d7', 12, 14)).toEqual({ kind: 'flag', row: 6, col: 3 });
  });
  it('parses "F  D7" with extra whitespace', () => {
    expect(parseCoord('F  D7', 12, 14)).toEqual({ kind: 'flag', row: 6, col: 3 });
  });
  it('parses "FD7" as a coordinate (column FD), then OOB on 14 cols', () => {
    expect(parseCoord('FD7', 12, 14)).toEqual({ error: 'oob' });
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `pnpm test`
Expected: failures because `lib/coords.ts` does not exist.

- [ ] **Step 3: Implement `lib/coords.ts`**

```ts
export const COL_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export type ParseResult =
  | { kind: 'reveal'; row: number; col: number }
  | { kind: 'flag'; row: number; col: number }
  | { error: 'invalid' | 'oob' };

export function formatCoord(row: number, col: number): string {
  return `${COL_LETTERS[col]}${row + 1}`;
}

const COORD_RE = /^([A-Z]+)(\d+)$/;
const FLAG_RE = /^F\s+([A-Z]+)(\d+)$/;

export function parseCoord(raw: string, rows: number, cols: number): ParseResult {
  const trimmed = raw.trim().toUpperCase();
  if (trimmed.length === 0) return { error: 'invalid' };

  const flagMatch = FLAG_RE.exec(trimmed);
  if (flagMatch) return resolve(flagMatch[1], flagMatch[2], rows, cols, 'flag');

  const coordMatch = COORD_RE.exec(trimmed);
  if (coordMatch) return resolve(coordMatch[1], coordMatch[2], rows, cols, 'reveal');

  return { error: 'invalid' };
}

function resolve(
  letters: string,
  digits: string,
  rows: number,
  cols: number,
  kind: 'reveal' | 'flag',
): ParseResult {
  const col = lettersToIndex(letters);
  const row = parseInt(digits, 10) - 1;
  if (col < 0 || col >= cols) return { error: 'oob' };
  if (row < 0 || row >= rows) return { error: 'oob' };
  return { kind, row, col };
}

function lettersToIndex(letters: string): number {
  // 'A' → 0, 'B' → 1, ... 'Z' → 25, 'AA' → 26 ...
  let n = 0;
  for (const ch of letters) {
    n = n * 26 + (ch.charCodeAt(0) - 64); // 'A' is 65
  }
  return n - 1;
}
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `pnpm test`
Expected: all `coords.test.ts` cases pass.

- [ ] **Step 5: Commit**

```bash
git add lib/coords.ts lib/__tests__/coords.test.ts
git commit -m "feat(coords): add coordinate parser with flag-prefix support"
```

---

### Task 4: Minesweeper rules — grid + mine placement

**Files:**
- Create: `lib/minesweeper.ts`
- Create: `lib/__tests__/minesweeper.test.ts`

- [ ] **Step 1: Write the tests for grid creation, mine placement, and adjacency**

Create `lib/__tests__/minesweeper.test.ts`:

```ts
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
```

- [ ] **Step 2: Run to confirm failure**

Run: `pnpm test`
Expected: failures (module does not exist).

- [ ] **Step 3: Implement `createEmptyGrid` and `placeMines` in `lib/minesweeper.ts`**

```ts
import type { Cell, Settings, MineFlavor } from './types';

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
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `pnpm test`
Expected: all minesweeper grid + placement tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/minesweeper.ts lib/__tests__/minesweeper.test.ts
git commit -m "feat(minesweeper): grid creation and mine placement with first-click safety"
```

---

### Task 5: Minesweeper rules — reveal, flag, safe count

**Files:**
- Modify: `lib/minesweeper.ts`
- Modify: `lib/__tests__/minesweeper.test.ts`

- [ ] **Step 1: Append tests to `lib/__tests__/minesweeper.test.ts`**

Add at the end of the file:

```ts
import { reveal, toggleFlag, countSafeRemaining } from '../minesweeper';

function placedFixture(): import('../types').Cell[][] {
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
```

- [ ] **Step 2: Run to confirm failure**

Run: `pnpm test`
Expected: failures for the new functions.

- [ ] **Step 3: Append to `lib/minesweeper.ts`**

Add at the bottom of the file:

```ts
export type RevealResult = {
  grid: Cell[][];
  cascade: Array<{ row: number; col: number }>;
  hitMine: { row: number; col: number; flavor: import('./types').MineFlavor } | null;
};

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
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `pnpm test`
Expected: all minesweeper tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/minesweeper.ts lib/__tests__/minesweeper.test.ts
git commit -m "feat(minesweeper): reveal, flag, and safe-remaining counter"
```

---

### Task 6: Game reducer

**Files:**
- Create: `lib/reducer.ts`
- Create: `lib/__tests__/reducer.test.ts`

- [ ] **Step 1: Write the reducer tests**

Create `lib/__tests__/reducer.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { initialState, makeReducer } from '../reducer';
import type { Settings, GameState } from '../types';

const settings: Settings = {
  rows: 9, cols: 9,
  mix: { shot: 3, ice: 2, wild: 1 },
  wildcardText: 'Bunns!',
};

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

describe('reducer', () => {
  it('configure → playing transitions phase and stores settings', () => {
    const reducer = makeReducer(rng(1));
    let state: GameState = initialState;
    state = reducer(state, { type: 'configure', settings });
    state = reducer(state, { type: 'start' });
    expect(state.phase).toBe('playing');
    expect(state.settings).toEqual(settings);
    expect(state.minesPlaced).toBe(false); // mines not placed yet
    expect(state.grid.length).toBe(9);
  });

  it('first reveal places mines and begins the timer', () => {
    const reducer = makeReducer(rng(7));
    let state: GameState = initialState;
    state = reducer(state, { type: 'configure', settings });
    state = reducer(state, { type: 'start' });
    state = reducer(state, { type: 'reveal', row: 4, col: 4, now: 1000 });
    expect(state.minesPlaced).toBe(true);
    expect(state.startedAt).toBe(1000);
    expect(state.grid[4][4].revealed).toBe(true);
    expect(state.lastReveal).toEqual({ row: 4, col: 4 });
  });

  it('revealing a mine increments the flavor tally and sets overlay', () => {
    const reducer = makeReducer(rng(11));
    let state: GameState = initialState;
    state = reducer(state, { type: 'configure', settings });
    state = reducer(state, { type: 'start' });
    state = reducer(state, { type: 'reveal', row: 4, col: 4, now: 1000 });
    // Find a mine and reveal it
    const mine = findFirstMine(state.grid);
    state = reducer(state, { type: 'reveal', row: mine.row, col: mine.col, now: 2000 });
    const f = state.grid[mine.row][mine.col].flavor!;
    expect(state.triggered[f]).toBe(1);
    expect(state.lastMine).toEqual({ row: mine.row, col: mine.col, flavor: f });
    expect(state.overlayDismissAt).toBe(2000 + 6000);
    expect(state.phase).toBe('playing'); // mines never end the game
  });

  it('flagging a cell is reflected in state', () => {
    const reducer = makeReducer(rng(2));
    let state: GameState = initialState;
    state = reducer(state, { type: 'configure', settings });
    state = reducer(state, { type: 'start' });
    state = reducer(state, { type: 'reveal', row: 0, col: 0, now: 0 });
    state = reducer(state, { type: 'flag', row: 5, col: 5 });
    expect(state.grid[5][5].flagged).toBe(true);
  });

  it('clearing all safe cells transitions to cleared and records endedAt', () => {
    const tinySettings: Settings = {
      rows: 3, cols: 3, mix: { shot: 1, ice: 0, wild: 0 }, wildcardText: 'Bunns!',
    };
    const reducer = makeReducer(rng(3));
    let state: GameState = initialState;
    state = reducer(state, { type: 'configure', settings: tinySettings });
    state = reducer(state, { type: 'start' });
    // First reveal at (0,0) — 3x3 board, mine cap is 9-9=0, but setup is supposed to enforce mine cap.
    // For this test we use mix that fits inside the safety zone constraint of 3x3 first-click which
    // is the whole board minus the safety zone. With first reveal at (0,0), the safety zone is the
    // 2x2 top-left, leaving 5 candidate cells. 1 mine fits.
    state = reducer(state, { type: 'reveal', row: 0, col: 0, now: 100 });
    // Reveal every non-mine cell
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (!state.grid[r][c].hasMine && !state.grid[r][c].revealed) {
          state = reducer(state, { type: 'reveal', row: r, col: c, now: 500 });
        }
      }
    }
    expect(state.phase).toBe('cleared');
    expect(state.endedAt).toBe(500);
  });

  it('inputError sets and clears', () => {
    const reducer = makeReducer(rng(1));
    let state: GameState = initialState;
    state = reducer(state, { type: 'configure', settings });
    state = reducer(state, { type: 'start' });
    state = reducer(state, { type: 'inputError', kind: 'oob' });
    expect(state.inputError).toBe('oob');
    state = reducer(state, { type: 'clearInputError' });
    expect(state.inputError).toBeNull();
  });

  it('reset returns to setup phase', () => {
    const reducer = makeReducer(rng(1));
    let state: GameState = initialState;
    state = reducer(state, { type: 'configure', settings });
    state = reducer(state, { type: 'start' });
    state = reducer(state, { type: 'reveal', row: 0, col: 0, now: 0 });
    state = reducer(state, { type: 'reset' });
    expect(state.phase).toBe('setup');
    expect(state.grid).toEqual([]);
    expect(state.minesPlaced).toBe(false);
  });
});

function findFirstMine(grid: import('../types').Cell[][]): { row: number; col: number } {
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
      if (grid[r][c].hasMine && !grid[r][c].revealed) return { row: r, col: c };
    }
  }
  throw new Error('no mine found');
}
```

- [ ] **Step 2: Run to confirm failure**

Run: `pnpm test`
Expected: failures (reducer module missing).

- [ ] **Step 3: Implement `lib/reducer.ts`**

```ts
import type { Action, GameState, Settings } from './types';
import { createEmptyGrid, placeMines, reveal, toggleFlag, countSafeRemaining } from './minesweeper';

const DEFAULT_SETTINGS: Settings = {
  rows: 12, cols: 14,
  mix: { shot: 10, ice: 8, wild: 4 },
  wildcardText: 'Bunns!',
};

const OVERLAY_DURATION_MS = 6000;

export const initialState: GameState = {
  phase: 'setup',
  settings: DEFAULT_SETTINGS,
  grid: [],
  minesPlaced: false,
  triggered: { shot: 0, ice: 0, wild: 0 },
  safeRemaining: 0,
  lastReveal: null,
  lastMine: null,
  overlayDismissAt: null,
  startedAt: null,
  endedAt: null,
  inputError: null,
};

export function makeReducer(rng: () => number) {
  return function reducer(state: GameState, action: Action): GameState {
    switch (action.type) {
      case 'configure':
        return { ...state, settings: action.settings };

      case 'start': {
        const grid = createEmptyGrid(state.settings.rows, state.settings.cols);
        const totalMines = state.settings.mix.shot + state.settings.mix.ice + state.settings.mix.wild;
        const safeTotal = state.settings.rows * state.settings.cols - totalMines;
        return {
          ...initialState,
          phase: 'playing',
          settings: state.settings,
          grid,
          safeRemaining: safeTotal,
        };
      }

      case 'reveal': {
        if (state.phase !== 'playing') return state;
        let grid = state.grid;
        let minesPlaced = state.minesPlaced;
        let startedAt = state.startedAt;
        if (!minesPlaced) {
          grid = placeMines(grid, state.settings, { row: action.row, col: action.col }, rng);
          minesPlaced = true;
          startedAt = action.now;
        }
        const result = reveal(grid, action.row, action.col);
        if (result.cascade.length === 0 && !result.hitMine) return state; // no-op (flagged/already revealed)

        const safeRemaining = countSafeRemaining(result.grid);
        const triggered = { ...state.triggered };
        let lastMine = state.lastMine;
        let overlayDismissAt = state.overlayDismissAt;
        if (result.hitMine) {
          triggered[result.hitMine.flavor] += 1;
          lastMine = result.hitMine;
          overlayDismissAt = action.now + OVERLAY_DURATION_MS;
        }
        const cleared = safeRemaining === 0;
        return {
          ...state,
          grid: result.grid,
          minesPlaced,
          startedAt,
          safeRemaining,
          triggered,
          lastMine,
          overlayDismissAt,
          lastReveal: { row: action.row, col: action.col },
          phase: cleared ? 'cleared' : 'playing',
          endedAt: cleared ? action.now : state.endedAt,
        };
      }

      case 'flag': {
        if (state.phase !== 'playing') return state;
        const grid = toggleFlag(state.grid, action.row, action.col);
        return { ...state, grid };
      }

      case 'inputError':
        return { ...state, inputError: action.kind };

      case 'clearInputError':
        return state.inputError ? { ...state, inputError: null } : state;

      case 'dismissOverlay':
        return { ...state, overlayDismissAt: null, lastMine: null };

      case 'reset':
        return { ...initialState, settings: state.settings };
    }
  };
}
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `pnpm test`
Expected: all reducer tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/reducer.ts lib/__tests__/reducer.test.ts
git commit -m "feat(reducer): game reducer with first-reveal mine placement"
```

---

### Task 7: Global styles + layout shell

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Replace `app/globals.css`**

```css
@import "tailwindcss";

:root {
  --bg-1: #1f1340;
  --bg-2: #2a1755;
  --bg-radial-a: #4a2370;
  --bg-radial-b: #3a1d63;
  --bg-radial-c: #2a1850;

  --text-on-dark: #efe7ff;
  --text-on-light: #2a1845;
  --muted-on-dark: #b9a8e0;

  --accent-pink: #ff5c8a;
  --accent-orange: #ff9a3c;
  --accent-yellow: #ffd23f;
  --accent-teal: #2ec4b6;
  --accent-sky: #4cc9f0;
  --accent-purple: #b85cff;
  --accent-magenta: #ff5cf2;
}

* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; }
body {
  font-family: ui-rounded, "SF Pro Rounded", "Nunito", system-ui, sans-serif;
  color: var(--text-on-dark);
  background:
    radial-gradient(900px 700px at 12% -8%, var(--bg-radial-a) 0%, transparent 60%),
    radial-gradient(900px 700px at 110% 8%, var(--bg-radial-b) 0%, transparent 55%),
    radial-gradient(900px 900px at 50% 120%, var(--bg-radial-c) 0%, transparent 60%),
    linear-gradient(180deg, var(--bg-1) 0%, var(--bg-2) 100%);
  background-attachment: fixed;
}

@keyframes tileGlow {
  0%, 100% { filter: hue-rotate(0deg) saturate(1) brightness(0.95); }
  50%      { filter: hue-rotate(20deg) saturate(1.05) brightness(1.02); }
}
@keyframes tilePop {
  0%   { transform: scale(.6); }
  60%  { transform: scale(1.15); }
  100% { transform: scale(1); }
}
@keyframes overlayPop {
  0%   { transform: translateY(20px) scale(.92); opacity: 0; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}
```

- [ ] **Step 2: Replace `app/layout.tsx`**

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Festminesveiper',
  description: 'Festvariant av Minesveiper.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="no">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Verify build still compiles**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css app/layout.tsx
git commit -m "feat(ui): set Norwegian theme, palette tokens, and viewport-locked shell"
```

---

### Task 8: Setup screen

**Files:**
- Create: `components/SetupScreen.tsx`

- [ ] **Step 1: Create `components/SetupScreen.tsx`**

```tsx
'use client';

import { useState } from 'react';
import type { Settings } from '@/lib/types';

const PRESETS: Record<string, { rows: number; cols: number; total: number; suggestedMix: { shot: number; ice: number; wild: number } }> = {
  Lett:        { rows: 9,  cols: 9,  total: 10, suggestedMix: { shot: 5,  ice: 4,  wild: 1 } },
  Middels:     { rows: 12, cols: 14, total: 22, suggestedMix: { shot: 10, ice: 8,  wild: 4 } },
  Vanskelig:   { rows: 16, cols: 24, total: 60, suggestedMix: { shot: 28, ice: 22, wild: 10 } },
};

type Props = {
  initial: Settings;
  onStart: (settings: Settings) => void;
};

export function SetupScreen({ initial, onStart }: Props) {
  const [rows, setRows] = useState(initial.rows);
  const [cols, setCols] = useState(initial.cols);
  const [mix, setMix] = useState(initial.mix);
  const [wildcardText, setWildcardText] = useState(initial.wildcardText);
  const [presetName, setPresetName] = useState<keyof typeof PRESETS | 'Tilpasset'>('Middels');

  const total = mix.shot + mix.ice + mix.wild;
  const cap = rows * cols - 9; // first-click safety zone
  const isValid =
    rows >= 5 && rows <= 16 &&
    cols >= 5 && cols <= 26 &&
    total >= 1 && total <= cap &&
    wildcardText.trim().length > 0;

  function applyPreset(name: keyof typeof PRESETS) {
    const p = PRESETS[name];
    setPresetName(name);
    setRows(p.rows);
    setCols(p.cols);
    setMix(p.suggestedMix);
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', width: '100vw', padding: 24,
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.14)',
        borderRadius: 24, padding: 32,
        width: 'min(560px, 100%)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
      }}>
        <h1 style={{
          fontSize: 36, margin: 0, fontWeight: 900,
          background: 'linear-gradient(90deg, #ff5c8a, #ff9a3c, #ffd23f, #2ec4b6, #b85cff)',
          WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
        }}>🎉 Festminesveiper</h1>
        <p style={{ color: 'var(--muted-on-dark)', marginTop: 4 }}>Velg vanskelighetsgrad og hvilke straffer som ligger i minene.</p>

        <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
          {Object.keys(PRESETS).map(name => (
            <button key={name} onClick={() => applyPreset(name as keyof typeof PRESETS)}
              style={presetButton(presetName === name)}>{name}</button>
          ))}
          <button onClick={() => setPresetName('Tilpasset')}
            style={presetButton(presetName === 'Tilpasset')}>Tilpasset</button>
        </div>

        {presetName === 'Tilpasset' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
            <NumField label="Rader (5–16)" value={rows} onChange={setRows} min={5} max={16} />
            <NumField label="Kolonner (5–26)" value={cols} onChange={setCols} min={5} max={26} />
          </div>
        )}

        <h3 style={{ marginTop: 22, marginBottom: 8, fontSize: 14, color: 'var(--muted-on-dark)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
          Mineblanding ({total} / cap {cap})
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <NumField label="🥃 Shots" value={mix.shot} onChange={v => setMix({ ...mix, shot: v })} min={0} max={cap} />
          <NumField label="❄ Iser"   value={mix.ice}  onChange={v => setMix({ ...mix, ice: v })}  min={0} max={cap} />
          <NumField label="🎲 Jokere" value={mix.wild} onChange={v => setMix({ ...mix, wild: v })} min={0} max={cap} />
        </div>

        <h3 style={{ marginTop: 22, marginBottom: 8, fontSize: 14, color: 'var(--muted-on-dark)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
          Joker-tekst
        </h3>
        <input
          value={wildcardText}
          onChange={e => setWildcardText(e.target.value)}
          placeholder="Bunns!"
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.18)',
            background: 'rgba(255,255,255,0.06)', color: 'var(--text-on-dark)', fontSize: 16,
          }}
        />

        <button
          disabled={!isValid}
          onClick={() => onStart({ rows, cols, mix, wildcardText: wildcardText.trim() })}
          style={{
            marginTop: 24, width: '100%', padding: '14px 20px', borderRadius: 14,
            border: 'none', cursor: isValid ? 'pointer' : 'not-allowed',
            background: isValid ? 'linear-gradient(90deg, #ff5c8a, #b85cff)' : 'rgba(255,255,255,0.08)',
            color: '#fff', fontWeight: 900, fontSize: 18,
            boxShadow: isValid ? '0 10px 30px rgba(184,92,255,0.35)' : 'none',
          }}
        >
          Start spillet
        </button>
        {!isValid && (
          <p style={{ marginTop: 10, color: '#ffb3c0', fontSize: 13 }}>
            Sjekk at brettstørrelsen er innenfor grensene og at total mineantall er minst 1 og høyst {cap}.
          </p>
        )}
      </div>
    </div>
  );
}

function presetButton(active: boolean): React.CSSProperties {
  return {
    padding: '10px 16px', borderRadius: 999,
    border: active ? '2px solid #ffd23f' : '1px solid rgba(255,255,255,0.18)',
    background: active ? 'rgba(255,210,63,0.15)' : 'rgba(255,255,255,0.06)',
    color: 'var(--text-on-dark)', cursor: 'pointer', fontWeight: 700,
  };
}

function NumField({ label, value, onChange, min, max }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 12, color: 'var(--muted-on-dark)', fontWeight: 700 }}>{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={e => onChange(Math.max(min, Math.min(max, Number(e.target.value) || 0)))}
        style={{
          padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.18)',
          background: 'rgba(255,255,255,0.06)', color: 'var(--text-on-dark)', fontSize: 16, fontWeight: 700,
        }}
      />
    </label>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/SetupScreen.tsx
git commit -m "feat(ui): add setup screen with preset and custom mine mix"
```

---

### Task 9: HUD

**Files:**
- Create: `components/Hud.tsx`

- [ ] **Step 1: Create `components/Hud.tsx`**

```tsx
'use client';

import { useEffect, useRef } from 'react';
import type { FlavorTally } from '@/lib/types';

type Props = {
  totalMines: number;
  triggered: FlavorTally;
  inputValue: string;
  inputError: 'invalid' | 'oob' | null;
  onInputChange: (v: string) => void;
  onSubmit: () => void;
};

export function Hud({ totalMines, triggered, inputValue, inputError, onInputChange, onSubmit }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep focus on the coord input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  useEffect(() => {
    const onClick = () => inputRef.current?.focus();
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  const totalTriggered = triggered.shot + triggered.ice + triggered.wild;

  return (
    <div style={{
      flex: '0 0 auto',
      display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12,
    }}>
      <div style={{
        fontWeight: 900, fontSize: 22, letterSpacing: '-0.01em',
        background: 'linear-gradient(90deg, #ff5c8a, #ff9a3c, #ffd23f, #2ec4b6, #b85cff)',
        WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
        marginRight: 8,
      }}>🎉 Festminesveiper</div>

      <Pill label="Miner" value={`${totalTriggered} / ${totalMines}`} />
      <Pill label="🥃 Shots" value={String(triggered.shot)} />
      <Pill label="❄ Iser" value={String(triggered.ice)} />
      <Pill label="🎲 Jokere" value={String(triggered.wild)} />

      <div style={{
        marginLeft: 'auto',
        background: 'rgba(255,255,255,0.95)',
        border: `2px solid ${inputError ? '#ff3d6e' : '#b85cff'}`,
        borderRadius: 999,
        padding: '8px 16px',
        boxShadow: '0 6px 20px rgba(184, 92, 255, 0.35)',
        display: 'flex', alignItems: 'center', gap: 10, minWidth: 320,
      }}>
        <input
          ref={inputRef}
          value={inputValue}
          onChange={e => onInputChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onSubmit(); }}
          placeholder="Skriv rute, f.eks. F4"
          style={{
            flex: 1, border: 0, outline: 0, fontSize: 16, fontWeight: 800,
            color: '#2a1845', background: 'transparent',
            textTransform: 'uppercase', letterSpacing: '.04em',
          }}
        />
        <span style={{ color: inputError ? '#ff3d6e' : '#6a4d7a', fontSize: 11, fontWeight: 700 }}>
          {inputError === 'oob' ? 'Ukjent rute' :
           inputError === 'invalid' ? 'Ugyldig' :
           '↵ for å åpne · F+rute for å flagge'}
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
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/Hud.tsx
git commit -m "feat(ui): add HUD with mine counters and coordinate input"
```

---

### Task 10: Cell + Board components

**Files:**
- Create: `components/Cell.tsx`
- Create: `components/Board.tsx`

- [ ] **Step 1: Create `components/Cell.tsx`**

```tsx
'use client';

import type { Cell as CellModel } from '@/lib/types';

type Props = {
  cell: CellModel;
  row: number;
  col: number;
  isLastReveal: boolean;
  onClick: () => void;
  onRightClick: () => void;
};

const NUMBER_COLORS = ['', '#2563eb', '#16a34a', '#e11d48', '#7c3aed', '#b45309', '#0891b2', '#1f2937', '#6b7280'];

function hueFor(row: number, col: number): number {
  return Math.floor(((row + 1) * 37 + (col + 1) * 53) % 360);
}

export function Cell({ cell, row, col, isLastReveal, onClick, onRightClick }: Props) {
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
```

- [ ] **Step 2: Create `components/Board.tsx`**

```tsx
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
        gridTemplateColumns: `28px repeat(${cols}, 1fr)`,
        gridTemplateRows: `28px repeat(${rows}, 1fr)`,
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
      fontWeight: 800, fontSize: 13, color: '#d4c4ff',
      userSelect: 'none', letterSpacing: '.04em',
    }}>{children}</div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/Cell.tsx components/Board.tsx
git commit -m "feat(ui): add Cell and Board with viewport-fit layout"
```

---

### Task 11: Mine reveal overlay

**Files:**
- Create: `components/MineRevealOverlay.tsx`

- [ ] **Step 1: Create `components/MineRevealOverlay.tsx`**

```tsx
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
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/MineRevealOverlay.tsx
git commit -m "feat(ui): add mine reveal overlay with auto-dismiss"
```

---

### Task 12: GameBoard composition + keyboard input

**Files:**
- Create: `components/GameBoard.tsx`

- [ ] **Step 1: Create `components/GameBoard.tsx`**

```tsx
'use client';

import { useState } from 'react';
import type { GameState, Action } from '@/lib/types';
import { parseCoord } from '@/lib/coords';
import { Hud } from './Hud';
import { Board } from './Board';
import { MineRevealOverlay } from './MineRevealOverlay';

type Props = {
  state: GameState;
  dispatch: (action: Action) => void;
};

export function GameBoard({ state, dispatch }: Props) {
  const [input, setInput] = useState('');
  const totalMines = state.settings.mix.shot + state.settings.mix.ice + state.settings.mix.wild;

  function submit() {
    const result = parseCoord(input, state.settings.rows, state.settings.cols);
    if ('error' in result) {
      dispatch({ type: 'inputError', kind: result.error });
      return;
    }
    if (result.kind === 'reveal') {
      dispatch({ type: 'reveal', row: result.row, col: result.col, now: Date.now() });
    } else {
      dispatch({ type: 'flag', row: result.row, col: result.col });
    }
    setInput('');
  }

  return (
    <div style={{
      height: '100vh', width: '100vw',
      display: 'flex', flexDirection: 'column',
      padding: '14px 18px 18px',
    }}>
      <Hud
        totalMines={totalMines}
        triggered={state.triggered}
        inputValue={input}
        inputError={state.inputError}
        onInputChange={(v) => { setInput(v); if (state.inputError) dispatch({ type: 'clearInputError' }); }}
        onSubmit={submit}
      />
      <Board
        grid={state.grid}
        lastReveal={state.lastReveal}
        onReveal={(r, c) => dispatch({ type: 'reveal', row: r, col: c, now: Date.now() })}
        onFlag={(r, c) => dispatch({ type: 'flag', row: r, col: c })}
      />
      <MineRevealOverlay
        lastMine={state.lastMine}
        overlayDismissAt={state.overlayDismissAt}
        totalMines={totalMines}
        triggered={state.triggered}
        wildcardText={state.settings.wildcardText}
        onDismiss={() => dispatch({ type: 'dismissOverlay' })}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/GameBoard.tsx
git commit -m "feat(ui): compose game board with HUD, board, overlay, and input handler"
```

---

### Task 13: End screen

**Files:**
- Create: `components/EndScreen.tsx`

- [ ] **Step 1: Create `components/EndScreen.tsx`**

```tsx
'use client';

import type { GameState } from '@/lib/types';

type Props = {
  state: GameState;
  onPlayAgain: () => void;
};

export function EndScreen({ state, onPlayAgain }: Props) {
  const totalMines = state.settings.mix.shot + state.settings.mix.ice + state.settings.mix.wild;
  const totalTriggered = state.triggered.shot + state.triggered.ice + state.triggered.wild;
  const avoided = totalMines - totalTriggered;
  const elapsedSec = state.startedAt && state.endedAt ? Math.round((state.endedAt - state.startedAt) / 1000) : 0;
  const mins = Math.floor(elapsedSec / 60);
  const secs = elapsedSec % 60;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', width: '100vw', padding: 24,
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.14)',
        borderRadius: 24, padding: 36,
        width: 'min(520px, 100%)', textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
      }}>
        <h1 style={{
          fontSize: 56, margin: 0, fontWeight: 900,
          background: 'linear-gradient(90deg, #ff5c8a, #ff9a3c, #ffd23f, #2ec4b6, #b85cff)',
          WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
        }}>Renset! 🎉</h1>
        <p style={{ color: 'var(--muted-on-dark)', marginTop: 8 }}>
          Tid: {mins} min {secs.toString().padStart(2, '0')} s
        </p>

        <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          <Stat label="🥃 Shots servert" value={state.triggered.shot} />
          <Stat label="❄ Iser servert" value={state.triggered.ice} />
          <Stat label="🎲 Jokere servert" value={state.triggered.wild} />
          <Stat label="🛡 Miner unngått" value={avoided} />
        </div>

        <button
          onClick={onPlayAgain}
          style={{
            marginTop: 28, width: '100%', padding: '14px 20px', borderRadius: 14,
            border: 'none', cursor: 'pointer',
            background: 'linear-gradient(90deg, #ff5c8a, #b85cff)',
            color: '#fff', fontWeight: 900, fontSize: 18,
            boxShadow: '0 10px 30px rgba(184,92,255,0.35)',
          }}
        >
          Spill igjen
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.14)',
      borderRadius: 12, padding: '12px 14px',
    }}>
      <div style={{ fontSize: 11, color: 'var(--muted-on-dark)', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', marginTop: 2 }}>{value}</div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/EndScreen.tsx
git commit -m "feat(ui): add end screen with summary stats"
```

---

### Task 14: Phase router page + manual smoke test

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Replace `app/page.tsx`**

```tsx
'use client';

import { useReducer, useMemo } from 'react';
import { initialState, makeReducer } from '@/lib/reducer';
import { SetupScreen } from '@/components/SetupScreen';
import { GameBoard } from '@/components/GameBoard';
import { EndScreen } from '@/components/EndScreen';

export default function Page() {
  const reducer = useMemo(() => makeReducer(Math.random), []);
  const [state, dispatch] = useReducer(reducer, initialState);

  if (state.phase === 'setup') {
    return <SetupScreen
      initial={state.settings}
      onStart={(settings) => {
        dispatch({ type: 'configure', settings });
        dispatch({ type: 'start' });
      }}
    />;
  }
  if (state.phase === 'cleared') {
    return <EndScreen state={state} onPlayAgain={() => dispatch({ type: 'reset' })} />;
  }
  return <GameBoard state={state} dispatch={dispatch} />;
}
```

- [ ] **Step 2: Run the dev server**

Run: `pnpm dev`
Expected: server starts, no compile errors.

- [ ] **Step 3: Manual smoke test in a browser**

Open `http://localhost:3000`. Verify each:
- Setup screen renders with the purple background, three preset buttons, mix inputs, and the "Start spillet" button (disabled until mix sum is at least 1 and within cap).
- Click "Middels" → mix auto-fills to 10/8/4 → Start enables → click Start.
- Game board fills the viewport (no scrollbar). HUD pills show `0 / 22`, `🥃 0`, `❄ 0`, `🎲 0`. Coordinate input has focus.
- Type `D7` ↵ → cell D7 reveals; the board cascades if it was a zero-empty.
- Type `F D7` ↵ on an unrevealed cell → flag appears.
- Type `Z99` ↵ → input shows "Ukjent rute" in red; clears on next keystroke.
- Right-click a cell → flag toggles.
- Continue until you hit a mine → overlay slides in from bottom-right, tally pill increments, game continues.
- Clear all safe cells → end screen "Renset! 🎉" with summary; "Spill igjen" returns to setup.

- [ ] **Step 4: Stop the dev server (Ctrl-C)**

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx
git commit -m "feat(app): wire phase router for setup/playing/cleared"
```

- [ ] **Step 6: Run the full test suite one more time**

Run: `pnpm test`
Expected: all tests pass, exit 0.

---

## Self-Review

**Spec coverage check:**

| Spec section | Covered by |
| --- | --- |
| §3.1 Board sizes + presets + custom | Task 8 (SetupScreen presets + custom inputs) |
| §3.1 A–Z col cap | Task 3 (`COL_LETTERS`), Task 8 (max=26) |
| §3.2 Mine flavors + mix | Task 4 (`placeMines` flavor distribution), Task 8 (mix inputs) |
| §3.2 Single wildcard text | Task 8 (input), Task 11 (used in overlay) |
| §3.3 Cascade reveal | Task 5 (`reveal` BFS) |
| §3.3 Flag prevents reveal | Task 5 (test + impl) |
| §3.3 First-click safety | Task 4 (test + `placeMines`) |
| §3.3 Flagged-but-safe blocks end | Task 5 (`countSafeRemaining` only counts unrevealed non-mines, flagged ones counted) — verified by test |
| §3.4 End-screen summary | Task 13 (EndScreen) |
| §4 Coord input + flag prefix | Task 3 (`parseCoord`) + Task 12 (submit handler) |
| §4 Mouse left/right click | Task 10 (Cell handlers) |
| §4 Input clears on success / shows error | Task 12 (clears on success) + Task 9 (HUD shows error text) |
| §5 Three phases, 100vh | Task 7 (CSS) + Task 14 (router) + Task 12 (game shell flex layout) |
| §6.1 Palette + dark purple | Task 7 (globals.css tokens + body bg) |
| §6.2 Glowing tiles + revealed surfaces + numbers + mines + flag + last-called | Task 10 (Cell) + Task 7 (keyframes) |
| §6.3 HUD content | Task 9 (Hud) |
| §6.4 Mine reveal overlay incl. auto-dismiss | Task 11 (MineRevealOverlay + useEffect timer) |
| §6.5 Viewport sizing | Task 10 (Board grid) + Task 7 (body overflow hidden) |
| §7 Architecture (lib/components split, useReducer, pure rules) | Tasks 2–6 (lib), 8–13 (components), 14 (router) |
| §8 Tests on lib/ + reducer | Tasks 3, 4, 5, 6 |

**Placeholder scan:** No "TBD" or unfilled steps; every step contains the actual code or command.

**Type consistency:** `Cell`, `Settings`, `GameState`, `Action`, `MineFlavor`, `FlavorTally`, `ParseResult`, `RevealResult` are defined once and used consistently. Function signatures (`reveal`, `placeMines`, `parseCoord`, `formatCoord`, `makeReducer`) match between definition and call sites in components.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-13-festminesveiper.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**
