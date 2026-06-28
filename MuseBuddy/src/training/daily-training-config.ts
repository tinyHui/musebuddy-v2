import { dailyTrainingSchema } from './daily-training-schema';

export const dailyTrainingConfig = dailyTrainingSchema.parse({
  rhythmTraining: {
    bars: [
      [true, false, true, false, true, false, true, false],
      [true, false, false, true, true, false, true, false],
      [true, true, false, false, true, false, true, false],
      [true, false, true, true, false, true, false, false],
    ],
  },
});
