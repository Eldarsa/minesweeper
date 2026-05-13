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
