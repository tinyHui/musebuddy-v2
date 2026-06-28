import { useRouter } from 'expo-router';

import {
  buildChordDisplay,
  ChordKeyboardCard,
  ChordNameCard,
  ChordSheetCard,
} from '@/components/chord-learning';
import { dailyTrainingConfig } from '@/training/daily-training-config';

import { PrimaryTrainingButton, TrainingScreenShell } from './training-screen-shell';

export function ChordLearningPage() {
  const router = useRouter();
  const chord = dailyTrainingConfig.chordLearning.chord;
  const display = buildChordDisplay(chord);

  return (
    <TrainingScreenShell
      eyebrow="Step 1 of 3"
      footer={
        <PrimaryTrainingButton
          label="Continue"
          onPress={() => {
            router.push('/rhythm-training');
          }}
        />
      }
      subtitle="Get familiar with today's chord shape before adding movement."
      title="Chord learning"
    >
      <ChordNameCard display={display} explanation={chord.explanation} />
      <ChordSheetCard display={display} />
      <ChordKeyboardCard display={display} />
    </TrainingScreenShell>
  );
}
