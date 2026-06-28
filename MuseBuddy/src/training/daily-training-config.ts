import { dailyTrainingSchema } from './daily-training-schema';

export const dailyTrainingConfig = dailyTrainingSchema.parse({
  chordLearning: {
    chord: {
      explanation:
        'Placeholder: explain how the root, third, fifth, and seventh create this chord color.',
      intervals: ['1', '3', '5', '7'],
      quality: 'major7',
      root: { accidental: '', letter: 'C' },
    },
  },
  rhythmTraining: {
    bars: [
      [true, false, true, false, true, false, true, false],
      [true, false, false, true, true, false, true, false],
      [true, true, false, false, true, false, true, false],
      [true, false, true, true, false, true, false, false],
    ],
  },
});
