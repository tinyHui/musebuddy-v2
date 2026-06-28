import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import {
  RhythmViewer,
  useSequencerPlayback,
  type SequencerPattern,
} from '@/components/rhythm-trainer';
import { DEFAULT_BPM } from '@/components/rhythm-trainer/constants';
import { dailyTrainingConfig } from '@/training/daily-training-config';

import { PrimaryTrainingButton, TrainingScreenShell } from './training-screen-shell';

export function RhythmTrainingPage() {
  const router = useRouter();
  const pattern = useMemo<SequencerPattern>(
    () => dailyTrainingConfig.rhythmTraining.bars.flat(),
    [],
  );
  const { currentStepIndex, isPlaying, stopPlayback, togglePlayback } = useSequencerPlayback({
    bpm: DEFAULT_BPM,
    pattern,
  });

  return (
    <TrainingScreenShell
      eyebrow="Step 2 of 3"
      footer={
        <View style={{ gap: 14 }}>
          <PrimaryTrainingButton
            label={isPlaying ? 'Stop rhythm' : 'Play rhythm'}
            onPress={togglePlayback}
          />
          <PrimaryTrainingButton
            label="Continue"
            onPress={() => {
              stopPlayback();
              router.push('/jam-session');
            }}
          />
        </View>
      }
      subtitle="Read today's four-bar rhythm, then carry it into the jam."
      title="Rhythm training"
    >
      <RhythmViewer
        currentStepIndex={currentStepIndex}
        isBarActionsVisible={false}
        pattern={pattern}
      />
    </TrainingScreenShell>
  );
}
