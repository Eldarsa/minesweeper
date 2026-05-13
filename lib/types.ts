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
