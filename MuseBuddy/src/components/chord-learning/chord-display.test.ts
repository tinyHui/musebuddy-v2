import { describe, expect, it } from 'vitest';

import { buildChordDisplay } from './chord-display';

describe('buildChordDisplay', () => {
  it('builds C major seventh display tokens and notes', () => {
    const display = buildChordDisplay({
      intervals: ['1', '3', '5', '7'],
      quality: 'major7',
      root: { accidental: '', letter: 'C' },
    });

    expect(display.symbol).toBe('Cmaj7');
    expect(display.commonNotations).toEqual(['Cmaj7', 'CM7']);
    expect(display.tokens).toEqual([
      { componentId: 'root', interval: '1', note: 'C', text: 'C', type: 'root' },
      { componentId: 'quality', text: 'maj', type: 'quality' },
      { componentId: 'extension', interval: '7', text: '7', type: 'extension' },
    ]);
    expect(display.notes.map((note) => note.text)).toEqual(['C', 'E', 'G', 'B']);
  });

  it('omits omitted intervals from display notes', () => {
    const display = buildChordDisplay({
      intervals: ['1', 'b3', '5', 'b7'],
      omit: ['b3'],
      quality: 'minor7',
      root: { accidental: '', letter: 'C' },
    });

    expect(display.symbol).toBe('Cm7(omit3)');
    expect(display.tokens).toContainEqual({
      componentId: 'omit-b3',
      interval: 'b3',
      text: '(omit3)',
      type: 'omission',
    });
    expect(display.notes.map((note) => note.text)).toEqual(['C', 'G', 'Bb']);
  });

  it('spells accidental roots and dominant seventh notes for sheet display', () => {
    const display = buildChordDisplay({
      intervals: ['1', '3', '5', 'b7'],
      quality: 'dominant7',
      root: { accidental: 'b', letter: 'B' },
    });

    expect(display.symbol).toBe('Bb7');
    expect(display.commonNotations).toEqual(['Bb7']);
    expect(display.notes.map((note) => note.text)).toEqual(['Bb', 'D', 'F', 'Ab']);
    expect(display.notes.map((note) => note.keyboardKey)).toEqual(['Bb', 'D', 'F', 'Ab']);
  });
});
