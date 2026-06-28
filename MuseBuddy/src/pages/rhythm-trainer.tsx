import { StyleSheet, View } from 'react-native';

import { SequencerControls } from '@/components/rhythm-trainer/sequencer-controls';
import { RhythmViewer } from '@/components/rhythm-trainer/rhythm-viewer';
import type { SequencerPattern } from '@/components/rhythm-trainer/types';

export type RhythmTrainerPageProps = {
  bpm: number;
  canDecreaseBpm: boolean;
  canIncreaseBpm: boolean;
  currentStepIndex: number | null;
  isPlaying: boolean;
  onDecreaseBpm: () => void;
  onIncreaseBpm: () => void;
  onRegenerateBar: (barIndex: number) => void;
  onShuffleBar: (barIndex: number) => void;
  onTogglePlayback: () => void;
  pattern: SequencerPattern;
};

export function RhythmTrainerPage({
  bpm,
  canDecreaseBpm,
  canIncreaseBpm,
  currentStepIndex,
  isPlaying,
  onDecreaseBpm,
  onIncreaseBpm,
  onRegenerateBar,
  onShuffleBar,
  onTogglePlayback,
  pattern,
}: RhythmTrainerPageProps) {
  return (
    <View style={styles.container}>
      <RhythmViewer
        currentStepIndex={currentStepIndex}
        onRegenerateBar={onRegenerateBar}
        onShuffleBar={onShuffleBar}
        pattern={pattern}
      />

      <SequencerControls
        bpm={bpm}
        canDecreaseBpm={canDecreaseBpm}
        canIncreaseBpm={canIncreaseBpm}
        isPlaying={isPlaying}
        onDecreaseBpm={onDecreaseBpm}
        onIncreaseBpm={onIncreaseBpm}
        onTogglePlayback={onTogglePlayback}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
  },
});
