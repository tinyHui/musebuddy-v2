import { StyleSheet, View } from 'react-native';

import { BLOCK_COUNT, STEPS_PER_BLOCK } from './constants';
import { NoteBarViewer } from './note-bar-viewer';
import { RhythmBarViewer } from './rhythm-bar-viewer';
import type { SequencerPattern } from './types';

type RhythmViewerProps = {
  currentStepIndex: number | null;
  isBarActionsVisible?: boolean;
  onRegenerateBar?: (barIndex: number) => void;
  onShuffleBar?: (barIndex: number) => void;
  pattern: SequencerPattern;
};

export function RhythmViewer({
  currentStepIndex,
  isBarActionsVisible = true,
  onRegenerateBar,
  onShuffleBar,
  pattern,
}: RhythmViewerProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: BLOCK_COUNT }, (_, barIndex) => {
        const barStartIndex = barIndex * STEPS_PER_BLOCK;
        const steps = pattern.slice(barStartIndex, barStartIndex + STEPS_PER_BLOCK);
        const currentStepInBar =
          currentStepIndex !== null &&
          currentStepIndex >= barStartIndex &&
          currentStepIndex < barStartIndex + STEPS_PER_BLOCK
            ? currentStepIndex - barStartIndex
            : null;
        const isPlayingBar = currentStepInBar !== null;

        return (
          <View key={barIndex} style={styles.barGroup}>
            <RhythmBarViewer
              currentStepIndex={currentStepInBar}
              isActionVisible={isBarActionsVisible}
              isPlayingBar={isPlayingBar}
              onRegenerate={() => {
                onRegenerateBar?.(barIndex);
              }}
              onShuffle={() => {
                onShuffleBar?.(barIndex);
              }}
              steps={steps}
            />
            <NoteBarViewer currentStepIndex={currentStepInBar} steps={steps} />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  barGroup: {
    gap: 8,
  },
});
