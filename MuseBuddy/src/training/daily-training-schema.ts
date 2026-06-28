import { z } from 'zod';

const rhythmBarSchema = z.tuple([
  z.boolean(),
  z.boolean(),
  z.boolean(),
  z.boolean(),
  z.boolean(),
  z.boolean(),
  z.boolean(),
  z.boolean(),
]);

export const dailyTrainingSchema = z.object({
  rhythmTraining: z.object({
    bars: z.tuple([rhythmBarSchema, rhythmBarSchema, rhythmBarSchema, rhythmBarSchema]),
  }),
});

export type DailyTrainingConfig = z.infer<typeof dailyTrainingSchema>;
