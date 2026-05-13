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
    const reducer = makeReducer(rng(1));
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
    const reducer = makeReducer(rng(4));
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
