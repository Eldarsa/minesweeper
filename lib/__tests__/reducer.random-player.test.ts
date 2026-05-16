import { describe, it, expect } from 'vitest';
import { initialState, makeReducer } from '../reducer';
import type { Settings, GameState, Cell } from '../types';

const partySettings: Settings = {
  rows: 9, cols: 9,
  mix: { shot: 3, ice: 2, wild: 1 },
  wildcardText: 'Bunns!',
  mode: 'random-player',
  players: [{ name: 'Ada' }, { name: 'Bo' }, { name: 'Cara' }],
  turnSeconds: 15,
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

function findFirstMine(grid: Cell[][]): { row: number; col: number } {
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
      if (grid[r][c].hasMine && !grid[r][c].revealed) return { row: r, col: c };
    }
  }
  throw new Error('no mine found');
}

function findSafe(grid: Cell[][]): { row: number; col: number } {
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
      if (!grid[r][c].hasMine && !grid[r][c].revealed) return { row: r, col: c };
    }
  }
  throw new Error('no safe found');
}

describe('reducer — random-player mode', () => {
  it('start initializes pickQueue, currentPlayerIdx, turnExpiresAt, playerStats', () => {
    const reducer = makeReducer(rng(1));
    let state: GameState = initialState;
    state = reducer(state, { type: 'configure', settings: partySettings });
    state = reducer(state, { type: 'start', now: 10000 });
    expect(state.phase).toBe('playing');
    expect(state.currentPlayerIdx).not.toBeNull();
    expect(state.currentPlayerIdx).toBeGreaterThanOrEqual(0);
    expect(state.currentPlayerIdx!).toBeLessThan(3);
    // After popping one, pickQueue has the remaining 2 indices
    expect(state.pickQueue).toHaveLength(2);
    expect(state.turnExpiresAt).toBe(10000 + 15000);
    expect(state.playerStats).toHaveLength(3);
    for (const s of state.playerStats) {
      expect(s).toEqual({ turns: 0, shot: 0, ice: 0, wild: 0 });
    }
  });

  it('safe reveal advances player, increments turns, resets timer', () => {
    const reducer = makeReducer(rng(7));
    let state: GameState = initialState;
    state = reducer(state, { type: 'configure', settings: partySettings });
    state = reducer(state, { type: 'start', now: 1000 });
    const firstPlayer = state.currentPlayerIdx!;
    // First reveal at center is guaranteed safe (3x3 safety zone around first click)
    state = reducer(state, { type: 'reveal', row: 4, col: 4, now: 2000 });
    expect(state.playerStats[firstPlayer].turns).toBe(1);
    expect(state.currentPlayerIdx).not.toBe(firstPlayer); // bag avoids immediate repeat
    expect(state.turnExpiresAt).toBe(2000 + 15000);
    expect(state.overlayDismissAt).toBeNull();
  });

  it('mine hit increments player stats but does NOT advance player; clears turnExpiresAt', () => {
    const reducer = makeReducer(rng(11));
    let state: GameState = initialState;
    state = reducer(state, { type: 'configure', settings: partySettings });
    state = reducer(state, { type: 'start', now: 1000 });
    // First click safe (places mines)
    state = reducer(state, { type: 'reveal', row: 4, col: 4, now: 2000 });
    const playerWhoHit = state.currentPlayerIdx!;
    const mine = findFirstMine(state.grid);
    state = reducer(state, { type: 'reveal', row: mine.row, col: mine.col, now: 3000 });
    const flavor = state.grid[mine.row][mine.col].flavor!;
    expect(state.currentPlayerIdx).toBe(playerWhoHit); // not advanced yet
    expect(state.playerStats[playerWhoHit][flavor]).toBe(1);
    expect(state.playerStats[playerWhoHit].turns).toBe(1); // counted as their turn
    expect(state.turnExpiresAt).toBeNull(); // timer paused during overlay
    expect(state.overlayDismissAt).not.toBeNull();
  });

  it('dismissOverlay after mine hit advances player and starts new timer', () => {
    const reducer = makeReducer(rng(11));
    let state: GameState = initialState;
    state = reducer(state, { type: 'configure', settings: partySettings });
    state = reducer(state, { type: 'start', now: 1000 });
    state = reducer(state, { type: 'reveal', row: 4, col: 4, now: 2000 });
    const mine = findFirstMine(state.grid);
    state = reducer(state, { type: 'reveal', row: mine.row, col: mine.col, now: 3000 });
    const playerWhoHit = state.currentPlayerIdx!;
    state = reducer(state, { type: 'dismissOverlay', now: 10000 });
    expect(state.currentPlayerIdx).not.toBe(playerWhoHit);
    expect(state.overlayDismissAt).toBeNull();
    expect(state.lastMine).toBeNull();
    expect(state.turnExpiresAt).toBe(10000 + 15000);
  });

  it('turnTimeout registers a virtual wild hit on current player; opens overlay; pauses timer', () => {
    const reducer = makeReducer(rng(3));
    let state: GameState = initialState;
    state = reducer(state, { type: 'configure', settings: partySettings });
    state = reducer(state, { type: 'start', now: 1000 });
    const before = state.currentPlayerIdx!;
    state = reducer(state, { type: 'turnTimeout', now: 16000 });
    expect(state.triggered.wild).toBe(1);
    expect(state.playerStats[before].wild).toBe(1);
    expect(state.playerStats[before].turns).toBe(1);
    expect(state.currentPlayerIdx).toBe(before); // not advanced
    expect(state.turnExpiresAt).toBeNull();
    expect(state.overlayDismissAt).not.toBeNull();
    // Sentinel coord signals "virtual" (no real cell)
    expect(state.lastMine).toEqual({ row: -1, col: -1, flavor: 'wild' });
  });

  it('dismissOverlay after timeout also advances player', () => {
    const reducer = makeReducer(rng(3));
    let state: GameState = initialState;
    state = reducer(state, { type: 'configure', settings: partySettings });
    state = reducer(state, { type: 'start', now: 1000 });
    const before = state.currentPlayerIdx!;
    state = reducer(state, { type: 'turnTimeout', now: 16000 });
    state = reducer(state, { type: 'dismissOverlay', now: 20000 });
    expect(state.currentPlayerIdx).not.toBe(before);
    expect(state.turnExpiresAt).toBe(20000 + 15000);
  });

  it('flag action no-ops in random-player mode', () => {
    const reducer = makeReducer(rng(1));
    let state: GameState = initialState;
    state = reducer(state, { type: 'configure', settings: partySettings });
    state = reducer(state, { type: 'start', now: 1000 });
    state = reducer(state, { type: 'reveal', row: 4, col: 4, now: 2000 });
    const before = state;
    state = reducer(state, { type: 'flag', row: 0, col: 0 });
    expect(state.grid[0][0].flagged).toBe(false);
    expect(state).toBe(before); // reference equality — no-op
  });

  it('inputError accepts flagsDisabled kind', () => {
    const reducer = makeReducer(rng(1));
    let state: GameState = initialState;
    state = reducer(state, { type: 'configure', settings: partySettings });
    state = reducer(state, { type: 'start', now: 1000 });
    state = reducer(state, { type: 'inputError', kind: 'flagsDisabled' });
    expect(state.inputError).toBe('flagsDisabled');
  });

  it('bag refills with no immediate repeat (max diff in pick counts ≤ 1)', () => {
    const reducer = makeReducer(rng(42));
    let state: GameState = initialState;
    state = reducer(state, { type: 'configure', settings: partySettings });
    state = reducer(state, { type: 'start', now: 0 });

    // First reveal places mines; do it on a corner so the safety zone is small
    state = reducer(state, { type: 'reveal', row: 0, col: 0, now: 100 });
    let prev = state.currentPlayerIdx!;
    let lastNow = 100;
    let advances = 1;
    // Do many safe reveals, advancing players each time
    while (advances < 30) {
      const safe = findSafe(state.grid);
      const next = reducer(state, { type: 'reveal', row: safe.row, col: safe.col, now: ++lastNow });
      if (next.phase === 'cleared') break;
      // Verify no immediate repeat
      expect(next.currentPlayerIdx).not.toBe(prev);
      prev = next.currentPlayerIdx!;
      state = next;
      advances++;
    }
    // Bag-balance invariant: max - min of turns ≤ 1
    const turns = state.playerStats.map(s => s.turns);
    expect(Math.max(...turns) - Math.min(...turns)).toBeLessThanOrEqual(1);
  });

  it('classic mode start leaves random-player fields untouched', () => {
    const reducer = makeReducer(rng(1));
    let state: GameState = initialState;
    const classic: Settings = { ...partySettings, mode: 'classic', players: [] };
    state = reducer(state, { type: 'configure', settings: classic });
    state = reducer(state, { type: 'start' });
    expect(state.currentPlayerIdx).toBeNull();
    expect(state.turnExpiresAt).toBeNull();
    expect(state.pickQueue).toEqual([]);
    expect(state.playerStats).toEqual([]);
  });

  it('pauseTurn freezes the deadline and stores remaining ms', () => {
    const reducer = makeReducer(rng(1));
    let state: GameState = initialState;
    state = reducer(state, { type: 'configure', settings: partySettings });
    state = reducer(state, { type: 'start', now: 1000 });
    // turnExpiresAt is 1000 + 15000 = 16000
    state = reducer(state, { type: 'pauseTurn', now: 4000 });
    expect(state.turnExpiresAt).toBeNull();
    expect(state.turnRemainingMs).toBe(12000); // 16000 - 4000
  });

  it('resumeTurn restores the deadline from the paused remainder', () => {
    const reducer = makeReducer(rng(1));
    let state: GameState = initialState;
    state = reducer(state, { type: 'configure', settings: partySettings });
    state = reducer(state, { type: 'start', now: 1000 });
    state = reducer(state, { type: 'pauseTurn', now: 4000 });
    state = reducer(state, { type: 'resumeTurn', now: 100000 });
    expect(state.turnRemainingMs).toBeNull();
    expect(state.turnExpiresAt).toBe(100000 + 12000);
  });

  it('turnTimeout is rejected while paused', () => {
    const reducer = makeReducer(rng(3));
    let state: GameState = initialState;
    state = reducer(state, { type: 'configure', settings: partySettings });
    state = reducer(state, { type: 'start', now: 1000 });
    state = reducer(state, { type: 'pauseTurn', now: 4000 });
    const before = state;
    state = reducer(state, { type: 'turnTimeout', now: 99999 });
    expect(state).toBe(before); // no-op
    expect(state.triggered.wild).toBe(0);
  });

  it('pauseTurn no-ops if not random-player or no active timer', () => {
    const reducer = makeReducer(rng(1));
    let state: GameState = initialState;
    const classic: Settings = { ...partySettings, mode: 'classic', players: [] };
    state = reducer(state, { type: 'configure', settings: classic });
    state = reducer(state, { type: 'start' });
    const before = state;
    state = reducer(state, { type: 'pauseTurn', now: 1000 });
    expect(state).toBe(before);
  });

  it('reset clears random-player state', () => {
    const reducer = makeReducer(rng(1));
    let state: GameState = initialState;
    state = reducer(state, { type: 'configure', settings: partySettings });
    state = reducer(state, { type: 'start', now: 1000 });
    state = reducer(state, { type: 'reset' });
    expect(state.phase).toBe('setup');
    expect(state.currentPlayerIdx).toBeNull();
    expect(state.turnExpiresAt).toBeNull();
    expect(state.pickQueue).toEqual([]);
    expect(state.playerStats).toEqual([]);
    expect(state.settings).toEqual(partySettings); // settings preserved
  });
});
