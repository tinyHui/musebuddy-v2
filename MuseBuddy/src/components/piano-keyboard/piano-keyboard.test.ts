import { describe, expect, it } from 'vitest';

import { getPianoKeyboardMarkers, normalizePianoKeyboardKey } from './piano-keyboard-utils';

describe('normalizePianoKeyboardKey', () => {
  it.each([
    ['Db', 'C#'],
    ['Eb', 'D#'],
    ['Gb', 'F#'],
    ['Ab', 'G#'],
    ['Bb', 'A#'],
    ['C', 'C'],
    ['F#', 'F#'],
  ] as const)('normalizes %s to %s', (source, expected) => {
    expect(normalizePianoKeyboardKey(source)).toBe(expected);
  });
});

describe('getPianoKeyboardMarkers', () => {
  it('includes the root even when no other keys are selected', () => {
    expect(getPianoKeyboardMarkers('C')).toEqual([{ key: 'C', isRoot: true }]);
  });

  it('deduplicates enharmonic spellings and lets the root marker win', () => {
    expect(getPianoKeyboardMarkers('Db', ['C#', 'E', 'Gb'])).toEqual([
      { key: 'C#', isRoot: true },
      { key: 'E', isRoot: false },
      { key: 'F#', isRoot: false },
    ]);
  });
});
