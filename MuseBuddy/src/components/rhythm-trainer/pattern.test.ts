import { afterEach, describe, expect, it, vi } from 'vitest';

import { generateBlockPattern, shuffleBlockPattern } from './pattern';

describe('shuffleBlockPattern', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a new shuffled copy while preserving enabled step count', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0);

    const source = [true, false, true, false];
    const shuffled = shuffleBlockPattern(source);

    expect(shuffled).toEqual([false, true, false, true]);
    expect(shuffled).not.toBe(source);
    expect(shuffled.filter(Boolean)).toHaveLength(source.filter(Boolean).length);
  });
});

describe('generateBlockPattern', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('generates a block of eight steps from the block probabilities', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.91)
      .mockReturnValueOnce(0.28)
      .mockReturnValueOnce(0.72)
      .mockReturnValueOnce(0.27)
      .mockReturnValueOnce(0.71)
      .mockReturnValueOnce(0.29)
      .mockReturnValueOnce(0.73)
      .mockReturnValueOnce(0.01);

    const pattern = generateBlockPattern();

    expect(pattern).toEqual([true, false, false, true, true, false, false, true]);
  });
});
