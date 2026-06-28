import { describe, expect, it } from 'vitest';

import { dailyTrainingSchema } from './daily-training-schema';

const validBar = [true, false, true, false, true, false, true, false];

const validChordLearning = {
  chord: {
    intervals: ['1', '3', '5', '7'],
    quality: 'major7',
    root: { accidental: '', letter: 'C' },
  },
};

describe('dailyTrainingSchema', () => {
  it('parses a valid daily training config', () => {
    const result = dailyTrainingSchema.safeParse({
      chordLearning: validChordLearning,
      rhythmTraining: {
        bars: [validBar, validBar, validBar, validBar],
      },
    });

    expect(result.success).toBe(true);
  });

  it('rejects a rhythm training config without exactly four bars', () => {
    const result = dailyTrainingSchema.safeParse({
      chordLearning: validChordLearning,
      rhythmTraining: {
        bars: [validBar, validBar, validBar],
      },
    });

    expect(result.success).toBe(false);
  });

  it('rejects rhythm bars without exactly eight steps', () => {
    const result = dailyTrainingSchema.safeParse({
      chordLearning: validChordLearning,
      rhythmTraining: {
        bars: [validBar, validBar, validBar, [true, false, true]],
      },
    });

    expect(result.success).toBe(false);
  });

  it('rejects unsupported chord roots', () => {
    const result = dailyTrainingSchema.safeParse({
      chordLearning: {
        chord: {
          intervals: ['1', '3', '5'],
          quality: 'major',
          root: { accidental: '', letter: 'H' },
        },
      },
      rhythmTraining: {
        bars: [validBar, validBar, validBar, validBar],
      },
    });

    expect(result.success).toBe(false);
  });

  it('rejects unsupported chord intervals', () => {
    const result = dailyTrainingSchema.safeParse({
      chordLearning: {
        chord: {
          intervals: ['1', '3', '5', '#15'],
          quality: 'major7',
          root: { accidental: '', letter: 'C' },
        },
      },
      rhythmTraining: {
        bars: [validBar, validBar, validBar, validBar],
      },
    });

    expect(result.success).toBe(false);
  });
});
