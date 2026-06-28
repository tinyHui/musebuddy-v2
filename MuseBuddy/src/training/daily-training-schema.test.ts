import { describe, expect, it } from 'vitest';

import { dailyTrainingSchema } from './daily-training-schema';

const validBar = [true, false, true, false, true, false, true, false];

describe('dailyTrainingSchema', () => {
  it('parses a valid daily training config', () => {
    const result = dailyTrainingSchema.safeParse({
      rhythmTraining: {
        bars: [validBar, validBar, validBar, validBar],
      },
    });

    expect(result.success).toBe(true);
  });

  it('rejects a rhythm training config without exactly four bars', () => {
    const result = dailyTrainingSchema.safeParse({
      rhythmTraining: {
        bars: [validBar, validBar, validBar],
      },
    });

    expect(result.success).toBe(false);
  });

  it('rejects rhythm bars without exactly eight steps', () => {
    const result = dailyTrainingSchema.safeParse({
      rhythmTraining: {
        bars: [validBar, validBar, validBar, [true, false, true]],
      },
    });

    expect(result.success).toBe(false);
  });
});
