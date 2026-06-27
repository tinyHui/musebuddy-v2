import { afterEach, describe, expect, it, vi } from 'vitest';

import { shuffleBlockPattern } from './pattern';

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
