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
