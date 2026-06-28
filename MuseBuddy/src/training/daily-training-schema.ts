import { z } from 'zod';

import {
  chordIntervalSchema,
  chordQualitySchema,
  chordRootSchema,
  type ChordInterval,
  type ChordQuality,
  type ChordRoot,
} from '@schema/music-theory-schema';

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

export const chordLearningChordSchema = z.object({
  add: z.array(chordIntervalSchema).optional(),
  alterations: z.array(chordIntervalSchema).optional(),
  bass: chordRootSchema.optional(),
  explanation: z.string().optional(),
  friendlyName: z.string().optional(),
  intervals: z.array(chordIntervalSchema).min(1),
  omit: z.array(chordIntervalSchema).optional(),
  quality: chordQualitySchema,
  root: chordRootSchema,
});

export const dailyTrainingSchema = z.object({
  chordLearning: z.object({
    chord: chordLearningChordSchema,
  }),
  rhythmTraining: z.object({
    bars: z.tuple([rhythmBarSchema, rhythmBarSchema, rhythmBarSchema, rhythmBarSchema]),
  }),
});

export type DailyTrainingConfig = z.infer<typeof dailyTrainingSchema>;
export type ChordLearningChord = z.infer<typeof chordLearningChordSchema>;
export type { ChordInterval, ChordQuality, ChordRoot };
export { chordIntervalSchema, chordQualitySchema, chordRootSchema };
