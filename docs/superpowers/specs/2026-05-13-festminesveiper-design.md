# Festminesveiper — Design Spec

**Date:** 2026-05-13
**Status:** Approved
**Scope:** v1 of the Party Minesweeper game inside the `gamevault` project. Teams, scoring across multiple games, and other games are explicitly out of scope for this spec.

## 1. Concept

Festminesveiper is a single-screen, big-display variant of Minesweeper for parties. Mines are drinking penalties (a shot, an ice cube down the back, a custom "wildcard" dare). The room shouts cell coordinates, one MC at the keyboard types them in, and the game reveals. When a mine is hit, a celebratory overlay calls out the punishment. The game keeps running after a mine — it ends only when every safe cell has been opened.

The full UI is in **Norwegian**.

## 2. Target experience

- One laptop driving a TV/projector in a room of ~6–20 people.
- The MC sits at the keyboard. Players across the room call out cells like "D7!". The MC types the coordinate and hits Enter.
- Mines are a feature, not a fail state — every mine triggered is a moment of group fun, not a game over.
- The whole game lives in a single browser tab. Refresh = new game.

## 3. Game rules

### 3.1 Board
- Configurable rows × cols. Default presets:
  - **Lett** (Easy): 9 rows × 9 cols, 10 mines
  - **Middels** (Medium): 12 rows × 14 cols, 22 mines
  - **Vanskelig** (Hard): 16 rows × 24 cols, 60 mines
  - **Tilpasset** (Custom): user picks rows (5–16), cols (5–26), and total mines (≥1, ≤ rows·cols − 9).
- Columns are letters **A–Z** (cap at 26 — beyond that we'd need AA/AB and the spec rejects that complexity for v1). Rows are numbers starting at **1**.
- Cell coordinates are written column-then-row: `D7`, `A1`, `Z16`.

### 3.2 Mine flavors
A mine carries one of three flavors:

| Flavor | Norsk label | Glyph |
| --- | --- | --- |
| Shot | Shots | 🥃 |
| Ice | Iser | ❄ |
| Wildcard | Jokere | 🎲 |

At setup, the user defines the **mine mix** — how many of each flavor make up the total mine count. The mix must sum to the configured total mine count. The app then assigns each mine cell exactly one flavor, shuffled across the board.

Wildcards are a single configurable text label per game (e.g., "Bunns!", "Truth or dare", "Bytt drink"). For v1 there is **one wildcard text** per game, used by every wildcard mine. (Multiple distinct wildcard texts are explicitly out of scope.)

### 3.3 Reveal mechanics
Standard Minesweeper rules apply, with these party variants:
- A revealed safe cell shows the count of mines among its 8 neighbors (1–8). Empty cells (zero adjacent mines) cascade-reveal their neighbors.
- A revealed mine **does not end the game**. It stays revealed, contributes to the running flavor tally, and the overlay fires.
- Flagging marks a cell so it cannot be revealed by accident. Flagged cells must be unflagged before they can be opened.
- **First-click safety:** mines are placed *after* the first reveal. The first cell and all 8 of its neighbors are guaranteed mine-free. The custom-board mine cap (`≤ rows·cols − 9`) ensures this is always achievable.
- A flagged cell that is *actually safe* prevents game-end until it is unflagged and revealed. This matches classic Minesweeper.

### 3.4 End state
The game ends when every non-mine cell is revealed. The end screen shows:
- "Renset!" headline
- Total mines triggered, broken down by flavor
- Total mines avoided (= mines never triggered, which is `total mines − triggered`)
- Elapsed time
- "Spill igjen" button → returns to the setup screen

There is no losing condition.

## 4. Input

The MC interacts with the game three ways:

1. **Coordinate input (primary).** A text input pinned in the HUD is always focused. Typing a coordinate (`D7`) and pressing Enter reveals that cell. Typing `F D7` (the `F` prefix requires a whitespace separator) and pressing Enter toggles the flag on that cell. Input is case-insensitive.
2. **Mouse.** Left-click on a cell reveals it; right-click toggles the flag. Identical effect to keyboard input.
3. **No other inputs.** No undo, no hint button, no zoom, no chord-click.

Coordinate parsing rules:
- Letters first, digits second: `D7`, `aa12`. The reverse (`7D`) is rejected.
- The flag-prefix is `F` followed by whitespace, then a coordinate. `FD7` (no space) is parsed as a coordinate (column `FD`, row 7) and rejected as out-of-bounds — never as flag + `D7`.
- Out-of-bounds or malformed coordinates show an inline error message in the input pill ("Ukjent rute") and clear it on the next keystroke.
- The input clears after a successful action.

## 5. UI structure

The whole app is a single page that switches between three phase states. Layout is locked to `100vh` × `100vw` with no scrolling at any phase.

### 5.1 Setup screen (`phase: 'setup'`)
- Centered card on the purple background.
- Preset buttons: Lett / Middels / Vanskelig / Tilpasset.
- When Tilpasset is selected, three numeric inputs appear (rader, kolonner, miner totalt).
- Mine-mix section: three numeric inputs for shots / iser / jokere. A live "X / Y" indicator shows mix sum vs total. The Start button is disabled until mix sum equals total.
- Wildcard text input (optional; default placeholder "Bunns!").
- "Start spillet" button.

### 5.2 Game screen (`phase: 'playing'`)
- Top: HUD strip (see §6).
- Below: board area, flex-filling all remaining viewport height. Board centered, sized to fit available area while preserving the rows:cols aspect ratio.
- Mine-reveal overlay anchored bottom-right when active (see §6.3).

### 5.3 End screen (`phase: 'cleared'`)
- Centered "Renset! 🎉" card with the summary listed in §3.4.

## 6. Visual design

### 6.1 Palette and mood
- Dark purple party background: layered radial gradients of `#4a2370 / #3a1d63 / #2a1850` over a `#1f1340 → #2a1755` linear base.
- Bright accent palette (used in tile gradients, brand text, mine flavors): `#ff5c8a`, `#ff9a3c`, `#ffd23f`, `#2ec4b6`, `#4cc9f0`, `#b85cff`, `#ff5cf2`.
- Type: rounded sans-serif (`ui-rounded` → `SF Pro Rounded` → `Nunito` → `system-ui`). Bold weights throughout for projector legibility.

### 6.2 Tiles
- **Unrevealed tile.** Each tile gets a deterministic hue from `(row * 37 + col * 53) % 360`, rendered as a soft 2-stop gradient at HSL ~70% saturation / ~62% lightness. A subtle 4.5-second `hue-rotate` + `brightness` loop gives the board a slow shimmer; per-tile animation delay is `((row + col) % 7) * 0.25s` so tiles drift out of phase. Box shadow is a single small drop shadow plus a soft inset highlight — no heavy outer glow.
- **Revealed safe tile.** Near-white surface (`rgba(255,255,255,0.92)`), thin purple inset border, dark purple text. Empty (zero-adjacent) cells use a slightly more transparent fill so cascade regions read as one shape.
- **Adjacent-mine numbers.** Classic Minesweeper colors lifted for contrast on the white tile: 1 blue, 2 green, 3 red, 4 violet, 5 amber, 6 cyan, 7 dark gray, 8 mid gray.
- **Mine tiles.** Full-color flavor gradient: shot = pink→orange, ice = teal→sky, wildcard = purple→magenta. White inset border + matching colored drop shadow. A 350ms scale-pop animation plays on reveal.
- **Last-called highlight.** Most-recently-revealed cell gets a 4px gold (`#ffd23f`) outline with a 3px offset. Overrides on the next reveal.
- **Flag.** A pink ⚑ glyph drawn on top of the still-glowing unrevealed tile.

### 6.3 HUD
A single horizontal strip at the top of the page, fixed height, containing in order:
1. Brand wordmark "🎉 Festminesveiper" with a multi-color gradient text fill.
2. Pill: **Miner** — `triggered / total`.
3. Pill: **🥃 Shots** — count triggered.
4. Pill: **❄ Iser** — count triggered.
5. Pill: **🎲 Jokere** — count triggered.
6. Coordinate input pill (right-aligned via `margin-left: auto`), always focused. Placeholder: `Skriv rute, f.eks. F4`. Hint text: `↵ for å åpne · F+rute for å flagge`.

No "trygge ruter" counter and no "sist ropt" pill — the gold outline on the board itself communicates the most recent reveal.

When the input is in an error state (invalid or OOB coordinate), the pill shows the error text "Ukjent rute" in muted red below or trailing the input until the next keystroke clears it.

### 6.4 Mine reveal overlay
When a mine is revealed, a card slides up in the bottom-right corner:
- Border: 3px in the matching flavor color (pink for shot, teal for ice, purple for wildcard).
- Kicker: "Mine sprengt · rute D7"
- Big flavor glyph
- Title: `SHOT!` / `IS!` / `JOKER!` (or the configured wildcard text in caps, truncated if very long)
- Sub: "Den som ropte D7 — bunns! Spillet fortsetter." (wildcard substitutes its text for "bunns!")
- Tally chips: 🥃 Shots, ❄ Iser, 🎲 Jokere, ⏳ Igjen.

The overlay auto-dismisses after 6 seconds, or when the *next mine* is revealed (which immediately replaces it with a fresh overlay). Safe-cell reveals do not dismiss the overlay. It never blocks input — the MC can keep typing coordinates while it is on screen.

### 6.5 Layout / viewport sizing
The whole stage is `100vh × 100vw` with `overflow: hidden`. The HUD has a fixed height; the board area takes the remaining height. The board is a CSS grid with `aspect-ratio: cols / rows`, `height: 100%; max-width: 100%` — so it shrinks to fit whatever space is left after the HUD on any viewport. Cell font scales with viewport via `clamp(14px, 2.4vh, 28px)`.

## 7. Architecture

### 7.1 Stack
- Next.js 16 App Router (already in the repo)
- React 19
- Tailwind v4
- TypeScript (strict mode is already on)
- All client-side. No API routes, no database, no persistence beyond the active tab.

### 7.2 File layout
```
app/
  page.tsx                         # phase router (setup | playing | cleared)
  globals.css                      # base + tailwind
components/
  SetupScreen.tsx
  GameBoard.tsx                    # HUD + Board + Overlay composition
  Hud.tsx
  Board.tsx                        # grid + axis labels + cell rendering
  Cell.tsx
  MineRevealOverlay.tsx
  EndScreen.tsx
lib/
  minesweeper.ts                   # pure rules: createGrid, placeMines, reveal, flag, neighborCount
  coords.ts                        # parseCoord, formatCoord, COL_LETTERS
  types.ts                         # GameState, Cell, MineFlavor, Settings
  reducer.ts                       # game reducer (single mutator)
  randomHue.ts                     # deterministic per-cell hue helper
```

Names are illustrative — implementation is free to merge or split files as long as the boundaries below hold.

### 7.3 State model
A single `GameState` object lives in a `useReducer`. The reducer is the only place that mutates state.

```ts
type MineFlavor = 'shot' | 'ice' | 'wild';

type Cell = {
  hasMine: boolean;
  flavor: MineFlavor | null;     // only when hasMine
  revealed: boolean;
  flagged: boolean;
  adjacent: number;              // 0–8, computed after mine placement
};

type Settings = {
  rows: number;
  cols: number;
  mix: { shot: number; ice: number; wild: number };
  wildcardText: string;          // shown on wildcard mine reveal
};

type GameState = {
  phase: 'setup' | 'playing' | 'cleared';
  settings: Settings;
  grid: Cell[][];                // empty until first reveal
  minesPlaced: boolean;
  triggered: { shot: number; ice: number; wild: number };
  safeRemaining: number;         // total safe cells still unrevealed
  lastReveal: { row: number; col: number } | null;
  lastMine: { row: number; col: number; flavor: MineFlavor } | null;
  overlayDismissAt: number | null; // epoch ms; null = no overlay
};

type Action =
  | { type: 'configure'; settings: Settings }
  | { type: 'start' }
  | { type: 'reveal'; row: number; col: number }
  | { type: 'flag'; row: number; col: number }
  | { type: 'dismissOverlay' }
  | { type: 'reset' };
```

### 7.4 Pure rules (`lib/minesweeper.ts`)
All grid operations are pure functions returning new state. No React, no DOM, no randomness leaking out.

- `createEmptyGrid(rows, cols): Cell[][]`
- `placeMines(grid, settings, firstReveal, rng): Cell[][]` — places mines avoiding the first-click safety zone, assigns flavors per the mix, computes `adjacent` for every cell. Takes an injectable `rng` so tests are deterministic.
- `reveal(grid, row, col): { grid, cascade: Array<{row,col}>, hitMine: { row, col, flavor } | null }` — returns the new grid plus what happened. Cascade includes the originally clicked cell if it was a zero-empty.
- `toggleFlag(grid, row, col): Cell[][]`
- `countSafeRemaining(grid): number`

### 7.5 Coordinate parsing (`lib/coords.ts`)
- `COL_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'`
- `parseCoord(input: string, rows, cols): { row, col } | { error: 'invalid' | 'oob' }` — handles case, whitespace, optional `F ` prefix for flag.
- `formatCoord(row, col): string` — `(0, 3) → 'D1'`.

### 7.6 Why this split
- `lib/` is fully unit-testable with no React. The reducer + pure rules together can be exercised in tests by replaying action sequences and asserting on the resulting state.
- React components only render `GameState` and dispatch `Action`s — no game logic in components.
- The phase router keeps the three screens fully separate so the board never has to render setup-mode controls and vice versa.

## 8. Testing

- Unit tests for `lib/minesweeper.ts`:
  - First-click safety: clicking any cell results in a mine-free 3×3 region around it.
  - Cascade reveal opens the full empty region.
  - Mine flavor distribution matches the configured mix.
  - `safeRemaining` reaches zero exactly when all non-mine cells are revealed.
- Unit tests for `lib/coords.ts`: case-insensitive parsing, OOB rejection, flag-prefix parsing, round-trip with `formatCoord`.
- Reducer tests: drive a full game (configure → start → first reveal → mine reveal → final reveal → cleared) and assert state transitions.
- No end-to-end browser tests in v1 (manual verification on the dev server is sufficient at this scope).

Test runner choice (vitest vs node:test) is left to the implementation plan; the spec only requires that `lib/` is covered.

## 9. Out of scope (deliberate)

- Teams, scoring across games, tournaments
- Network multiplayer / spectator mode
- Persistence (refresh resets everything)
- Sound effects (may be added in a later spec)
- Multiple distinct wildcard texts per game
- Localization beyond Norwegian
- Accessibility passes beyond keyboard input + reasonable color contrast on revealed surfaces
- Mobile-specific layout (the game targets a laptop driving a big screen)

## 10. Open questions resolved during brainstorming

- **Background brightness:** dark purple gradient, not bright cream/peach.
- **Tile glow intensity:** soft shimmer, no rave-level glow.
- **HUD content:** total mines + per-flavor tally + input only. No "safe remaining" or "last call" counter.
- **Game-over on mine:** no — mines never end the game, only safe-cell exhaustion does.
- **Language:** all strings in Norwegian.
