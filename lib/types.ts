export type MineFlavor = 'shot' | 'ice' | 'wild';

export type Cell = {
  hasMine: boolean;
  flavor: MineFlavor | null;
  revealed: boolean;
  flagged: boolean;
  adjacent: number; // 0–8
};

export type MineMix = { shot: number; ice: number; wild: number };

export type GameMode = 'classic' | 'random-player';

export type Player = { name: string };

export type PlayerStats = { turns: number; shot: number; ice: number; wild: number };

export type Settings = {
  rows: number;
  cols: number;
  mix: MineMix;
  wildcardText: string;
  mode: GameMode;
  players: Player[];     // empty in classic
  turnSeconds: number;   // only meaningful in random-player; default 15
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
  inputError: 'invalid' | 'oob' | 'flagsDisabled' | null;

  // Random-player mode state. Null/empty in classic.
  pickQueue: number[];                           // shuffled indices into settings.players
  currentPlayerIdx: number | null;
  turnExpiresAt: number | null;                  // epoch ms; null while overlay is up or in classic
  playerStats: PlayerStats[];                    // parallel to settings.players
};

export type Action =
  | { type: 'configure'; settings: Settings }
  | { type: 'start'; now?: number }
  | { type: 'reveal'; row: number; col: number; now: number }
  | { type: 'flag'; row: number; col: number }
  | { type: 'inputError'; kind: 'invalid' | 'oob' | 'flagsDisabled' }
  | { type: 'clearInputError' }
  | { type: 'dismissOverlay'; now?: number }
  | { type: 'turnTimeout'; now: number }
  | { type: 'reset' };
