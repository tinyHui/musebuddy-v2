import { describe, expect, it } from 'vitest';

import { convertBooleanBarToVexflowEvents, DEFAULT_NOTE_KEY } from './note-bar-vexflow';

type ExpectedEvent = {
  kind: 'note' | 'rest';
  duration: string;
  dots?: 0 | 1;
  startStep: number;
  stepCount: number;
  tieFromPrevious?: boolean;
  tieToNext?: boolean;
};

function pattern(source: string): boolean[] {
  return source.split(/\s+/).map((token) => {
    if (token === 'T') {
      return true;
    }

    if (token === 'F') {
      return false;
    }

    throw new Error(`Unsupported pattern token: ${token}`);
  });
}

function convert(source: string) {
  return convertBooleanBarToVexflowEvents(pattern(source)).map(
    ({ kind, duration, dots, startStep, stepCount, tieFromPrevious, tieToNext, noteKey }) => ({
      kind,
      duration,
      dots,
      startStep,
      stepCount,
      tieFromPrevious,
      tieToNext,
      noteKey,
    }),
  );
}

function note(
  startStep: number,
  stepCount: number,
  duration: string,
  options: Pick<ExpectedEvent, 'dots' | 'tieFromPrevious' | 'tieToNext'> = {},
) {
  return {
    kind: 'note',
    duration,
    dots: options.dots ?? 0,
    startStep,
    stepCount,
    tieFromPrevious: options.tieFromPrevious ?? false,
    tieToNext: options.tieToNext ?? false,
    noteKey: DEFAULT_NOTE_KEY,
  };
}

function rest(
  startStep: number,
  stepCount: number,
  duration: string,
  options: Pick<ExpectedEvent, 'dots'> = {},
) {
  return {
    kind: 'rest',
    duration,
    dots: options.dots ?? 0,
    startStep,
    stepCount,
    tieFromPrevious: false,
    tieToNext: false,
    noteKey: undefined,
  };
}

describe('convertBooleanBarToVexflowEvents', () => {
  it.each([
    ['T T F F F F F F', [note(0, 2, 'q'), rest(2, 6, 'h', { dots: 1 })]],
    ['T T T F F F F F', [note(0, 3, 'q', { dots: 1 }), rest(3, 4, 'h'), rest(7, 1, '8')]],
    [
      'F T T T F F F F',
      [
        rest(0, 1, '8'),
        note(1, 1, '8', { tieToNext: true }),
        note(2, 2, 'q', { tieFromPrevious: true }),
        rest(4, 4, 'h'),
      ],
    ],
    [
      'F F T T T F F F',
      [rest(0, 2, 'q'), note(2, 3, 'q', { dots: 1 }), rest(5, 2, 'q'), rest(7, 1, '8')],
    ],
    [
      'F F F T T T F F',
      [
        rest(0, 2, 'q'),
        rest(2, 1, '8'),
        note(3, 1, '8', { tieToNext: true }),
        note(4, 2, 'q', { tieFromPrevious: true }),
        rest(6, 2, 'q'),
      ],
    ],
    [
      'T T T F T T T F',
      [
        note(0, 3, 'q', { dots: 1 }),
        rest(3, 1, '8'),
        note(4, 3, 'q', { dots: 1 }),
        rest(7, 1, '8'),
      ],
    ],
  ])('converts core pattern %s', (source, expected) => {
    expect(convert(source)).toEqual(expected);
  });

  it.each([
    ['T T T T F F F F', [note(0, 4, 'h'), rest(4, 4, 'h')]],
    [
      'T T T T T F F F',
      [
        note(0, 4, 'h', { tieToNext: true }),
        note(4, 1, '8', { tieFromPrevious: true }),
        rest(5, 3, 'q', { dots: 1 }),
      ],
    ],
    [
      'F T T T T T F F',
      [
        rest(0, 1, '8'),
        note(1, 1, '8', { tieToNext: true }),
        note(2, 4, 'h', { tieFromPrevious: true }),
        rest(6, 2, 'q'),
      ],
    ],
    [
      'F F T T T T T F',
      [
        rest(0, 2, 'q'),
        note(2, 4, 'h', { tieToNext: true }),
        note(6, 1, '8', { tieFromPrevious: true }),
        rest(7, 1, '8'),
      ],
    ],
    [
      'F F F T T T T T',
      [
        rest(0, 2, 'q'),
        rest(2, 1, '8'),
        note(3, 1, '8', { tieToNext: true }),
        note(4, 4, 'h', { tieFromPrevious: true }),
      ],
    ],
  ])('converts long note run %s', (source, expected) => {
    expect(convert(source)).toEqual(expected);
  });

  it.each([
    [
      'T F T F T F T F',
      [
        note(0, 1, '8'),
        rest(1, 1, '8'),
        note(2, 1, '8'),
        rest(3, 1, '8'),
        note(4, 1, '8'),
        rest(5, 1, '8'),
        note(6, 1, '8'),
        rest(7, 1, '8'),
      ],
    ],
    [
      'F T F T F T F T',
      [
        rest(0, 1, '8'),
        note(1, 1, '8'),
        rest(2, 1, '8'),
        note(3, 1, '8'),
        rest(4, 1, '8'),
        note(5, 1, '8'),
        rest(6, 1, '8'),
        note(7, 1, '8'),
      ],
    ],
    [
      'T F F T T F F T',
      [note(0, 1, '8'), rest(1, 2, 'q'), note(3, 2, 'q'), rest(5, 2, 'q'), note(7, 1, '8')],
    ],
    [
      'F T T F F T T F',
      [rest(0, 1, '8'), note(1, 2, 'q'), rest(3, 2, 'q'), note(5, 2, 'q'), rest(7, 1, '8')],
    ],
  ])('converts alternating pattern %s', (source, expected) => {
    expect(convert(source)).toEqual(expected);
  });

  it.each([
    ['T F F F T T T T', [note(0, 1, '8'), rest(1, 1, '8'), rest(2, 2, 'q'), note(4, 4, 'h')]],
    [
      'T T F F F T T T',
      [
        note(0, 2, 'q'),
        rest(2, 2, 'q'),
        rest(4, 1, '8'),
        note(5, 1, '8', { tieToNext: true }),
        note(6, 2, 'q', { tieFromPrevious: true }),
      ],
    ],
    [
      'F F F F F T T T',
      [
        rest(0, 4, 'h'),
        rest(4, 1, '8'),
        note(5, 1, '8', { tieToNext: true }),
        note(6, 2, 'q', { tieFromPrevious: true }),
      ],
    ],
    ['F F F F T T T F', [rest(0, 4, 'h'), note(4, 3, 'q', { dots: 1 }), rest(7, 1, '8')]],
  ])('keeps rests crossing beats readable for %s', (source, expected) => {
    expect(convert(source)).toEqual(expected);
  });

  it.each([
    ['T F F F F F F F', [note(0, 1, '8'), rest(1, 1, '8'), rest(2, 4, 'h'), rest(6, 2, 'q')]],
    ['F F F F F F F T', [rest(0, 6, 'h', { dots: 1 }), rest(6, 1, '8'), note(7, 1, '8')]],
    [
      'F T T T T F F F',
      [
        rest(0, 1, '8'),
        note(1, 1, '8', { tieToNext: true }),
        note(2, 2, 'q', { tieFromPrevious: true, tieToNext: true }),
        note(4, 1, '8', { tieFromPrevious: true }),
        rest(5, 2, 'q'),
        rest(7, 1, '8'),
      ],
    ],
    [
      'T T T T F T T T',
      [
        note(0, 4, 'h'),
        rest(4, 1, '8'),
        note(5, 1, '8', { tieToNext: true }),
        note(6, 2, 'q', { tieFromPrevious: true }),
      ],
    ],
    [
      'T T F T T T T F',
      [
        note(0, 2, 'q'),
        rest(2, 1, '8'),
        note(3, 1, '8', { tieToNext: true }),
        note(4, 2, 'q', { tieFromPrevious: true, tieToNext: true }),
        note(6, 1, '8', { tieFromPrevious: true }),
        rest(7, 1, '8'),
      ],
    ],
  ])('handles beat-boundary stress pattern %s', (source, expected) => {
    expect(convert(source)).toEqual(expected);
  });

  it('rejects bars that are not exactly eight slots', () => {
    expect(() => convertBooleanBarToVexflowEvents([true, false])).toThrow(
      'Expected 8 bar steps, received 2.',
    );
  });

  it('covers the whole bar without gaps or overlaps', () => {
    const events = convertBooleanBarToVexflowEvents(pattern('F T T T T F F F'));

    events.forEach((event, index) => {
      expect(event.startStep).toBe(
        index === 0 ? 0 : events[index - 1].startStep + events[index - 1].stepCount,
      );
    });
    expect(events.reduce((total, event) => total + event.stepCount, 0)).toBe(8);
  });
});
