import type { Action, GameState, PlayerStats, Settings } from './types';
import { createEmptyGrid, placeMines, reveal, toggleFlag, countSafeRemaining } from './minesweeper';

const DEFAULT_SETTINGS: Settings = {
  rows: 12, cols: 14,
  mix: { shot: 10, ice: 8, wild: 4 },
  wildcardText: 'Bunns!',
  mode: 'classic',
  players: [],
  turnSeconds: 15,
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
  pickQueue: [],
  currentPlayerIdx: null,
  turnExpiresAt: null,
  playerStats: [],
};

export function makeReducer(rng: () => number) {
  function shuffle(arr: number[]): number[] {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Pull next player from the bag. Refills when empty, avoiding immediate repeats.
  function drawNext(
    players: number,
    queue: number[],
    previous: number | null,
    turnSeconds: number,
    now: number,
  ): { pickQueue: number[]; currentPlayerIdx: number | null; turnExpiresAt: number | null } {
    if (players === 0) {
      return { pickQueue: [], currentPlayerIdx: null, turnExpiresAt: null };
    }
    let q = queue;
    if (q.length === 0) {
      const indices = Array.from({ length: players }, (_, i) => i);
      q = shuffle(indices);
      // Avoid back-to-back picks across bag refills
      if (players >= 2 && q[0] === previous) {
        [q[0], q[1]] = [q[1], q[0]];
      }
    }
    const [head, ...rest] = q;
    return {
      pickQueue: rest,
      currentPlayerIdx: head,
      turnExpiresAt: now + turnSeconds * 1000,
    };
  }

  return function reducer(state: GameState, action: Action): GameState {
    switch (action.type) {
      case 'configure':
        return { ...state, settings: action.settings };

      case 'start': {
        const { settings } = state;
        const grid = createEmptyGrid(settings.rows, settings.cols);
        const totalMines = settings.mix.shot + settings.mix.ice + settings.mix.wild;
        const safeTotal = settings.rows * settings.cols - totalMines;
        const base: GameState = {
          ...initialState,
          phase: 'playing',
          settings,
          grid,
          safeRemaining: safeTotal,
        };
        if (settings.mode !== 'random-player' || settings.players.length === 0) {
          return base;
        }
        const playerStats: PlayerStats[] = settings.players.map(() => ({
          turns: 0, shot: 0, ice: 0, wild: 0,
        }));
        const now = action.now ?? 0;
        const draw = drawNext(settings.players.length, [], null, settings.turnSeconds, now);
        return { ...base, playerStats, ...draw };
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
        if (result.cascade.length === 0 && !result.hitMine) return state;

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

        let next: GameState = {
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

        if (state.settings.mode === 'random-player' && state.currentPlayerIdx !== null) {
          const stats = next.playerStats.slice();
          const idx = state.currentPlayerIdx;
          const prev = stats[idx];
          stats[idx] = { ...prev, turns: prev.turns + 1 };
          if (result.hitMine) {
            stats[idx] = { ...stats[idx], [result.hitMine.flavor]: stats[idx][result.hitMine.flavor] + 1 };
            next = { ...next, playerStats: stats, turnExpiresAt: null };
          } else if (cleared) {
            next = { ...next, playerStats: stats, turnExpiresAt: null };
          } else {
            const draw = drawNext(
              state.settings.players.length,
              state.pickQueue,
              state.currentPlayerIdx,
              state.settings.turnSeconds,
              action.now,
            );
            next = { ...next, playerStats: stats, ...draw };
          }
        }
        return next;
      }

      case 'flag': {
        if (state.phase !== 'playing') return state;
        if (state.settings.mode === 'random-player') return state; // flags disabled
        const grid = toggleFlag(state.grid, action.row, action.col);
        return { ...state, grid };
      }

      case 'inputError':
        return { ...state, inputError: action.kind };

      case 'clearInputError':
        return state.inputError ? { ...state, inputError: null } : state;

      case 'dismissOverlay': {
        const cleared: GameState = { ...state, overlayDismissAt: null, lastMine: null };
        if (state.settings.mode === 'random-player' && state.phase === 'playing') {
          const now = action.now ?? 0;
          const draw = drawNext(
            state.settings.players.length,
            state.pickQueue,
            state.currentPlayerIdx,
            state.settings.turnSeconds,
            now,
          );
          return { ...cleared, ...draw };
        }
        return cleared;
      }

      case 'turnTimeout': {
        if (state.phase !== 'playing') return state;
        if (state.settings.mode !== 'random-player') return state;
        if (state.currentPlayerIdx === null) return state;
        if (state.overlayDismissAt !== null) return state; // overlay already up

        const idx = state.currentPlayerIdx;
        const triggered = { ...state.triggered, wild: state.triggered.wild + 1 };
        const stats = state.playerStats.slice();
        const prev = stats[idx];
        stats[idx] = { ...prev, turns: prev.turns + 1, wild: prev.wild + 1 };
        return {
          ...state,
          triggered,
          playerStats: stats,
          lastMine: { row: -1, col: -1, flavor: 'wild' },
          overlayDismissAt: action.now + OVERLAY_DURATION_MS,
          turnExpiresAt: null,
        };
      }

      case 'reset':
        return { ...initialState, settings: state.settings };
    }
  };
}
