import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BLOCK_COUNT, BPM_STEP, DEFAULT_BPM, MAX_BPM, MIN_BPM, STEPS_PER_BLOCK } from './constants';
import { NoteBarViewer } from './note-bar-viewer';
import { generateSequencerPattern } from './pattern';
import { RhythmBarViewer } from './rhythm-bar-viewer';
import { SequencerControls } from './sequencer-controls';
import { SequencerPattern } from './types';
import { useSequencerPlayback } from './use-sequencer-playback';

export function RhythmTrainerView() {
  const [bpm, setBpm] = useState(DEFAULT_BPM);
  const [pattern] = useState<SequencerPattern>(() => generateSequencerPattern());
  const { currentStepIndex, isPlaying, togglePlayback } = useSequencerPlayback({ bpm, pattern });

  const decreaseBpm = useCallback(() => {
    setBpm((value) => Math.max(MIN_BPM, value - BPM_STEP));
  }, []);

  const increaseBpm = useCallback(() => {
    setBpm((value) => Math.min(MAX_BPM, value + BPM_STEP));
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.trainer}>
        {Array.from({ length: BLOCK_COUNT }, (_, barIndex) => {
          const barStartIndex = barIndex * STEPS_PER_BLOCK;
          const steps = pattern.slice(barStartIndex, barStartIndex + STEPS_PER_BLOCK);
          const currentStepInBar =
            currentStepIndex !== null &&
            currentStepIndex >= barStartIndex &&
            currentStepIndex < barStartIndex + STEPS_PER_BLOCK
              ? currentStepIndex - barStartIndex
              : null;

          return (
            <View key={barIndex} style={styles.barGroup}>
              <RhythmBarViewer
                barIndex={barIndex}
                currentStepIndex={currentStepInBar}
                steps={steps}
              />
              <NoteBarViewer
                barIndex={barIndex}
                currentStepIndex={currentStepInBar}
                steps={steps}
              />
            </View>
          );
        })}
      </View>

      <SequencerControls
        bpm={bpm}
        canDecreaseBpm={bpm > MIN_BPM}
        canIncreaseBpm={bpm < MAX_BPM}
        isPlaying={isPlaying}
        onDecreaseBpm={decreaseBpm}
        onIncreaseBpm={increaseBpm}
        onTogglePlayback={togglePlayback}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
  },
  trainer: {
    gap: 16,
  },
  barGroup: {
    gap: 8,
  },
});
