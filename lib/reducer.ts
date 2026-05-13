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
