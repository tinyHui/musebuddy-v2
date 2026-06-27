import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Ionicons } from './icons';

type RhythmBarViewerProps = {
  barIndex: number;
  currentStepIndex: number | null;
  onShuffleBar: (barIndex: number) => void;
  steps: readonly boolean[];
};

export function RhythmBarViewer({
  barIndex,
  currentStepIndex,
  onShuffleBar,
  steps,
}: RhythmBarViewerProps) {
  const isActiveBar = currentStepIndex !== null;

  return (
    <View
      accessibilityLabel={`Bar ${barIndex + 1} rhythm with eight eighth-note steps`}
      style={[styles.container, isActiveBar && styles.containerPlaying]}
    >
      <View style={styles.header}>
        <Text style={styles.label}>Bar {barIndex + 1}</Text>
        <Pressable
          accessibilityLabel={`Shuffle bar ${barIndex + 1} rhythm`}
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => {
            onShuffleBar(barIndex);
          }}
          style={({ pressed }) => [styles.shuffleButton, pressed && styles.shuffleButtonPressed]}
        >
          <Ionicons name="shuffle-outline" size={16} color="#2f4f16" />
        </Pressable>
      </View>

      <View pointerEvents="none" style={styles.iconLayer}>
        <Ionicons name="pulse-outline" size={58} color="rgba(77, 111, 36, 0.18)" />
      </View>

      <View style={styles.stepGrid}>
        {steps.map((isEnabled, stepIndex) => (
          <StepPart
            key={stepIndex}
            isCurrent={currentStepIndex === stepIndex}
            isEnabled={isEnabled}
            stepIndex={stepIndex}
          />
        ))}
      </View>
    </View>
  );
}

type StepPartProps = {
  isCurrent: boolean;
  isEnabled: boolean;
  stepIndex: number;
};

function StepPart({ isCurrent, isEnabled, stepIndex }: StepPartProps) {
  return (
    <View
      accessibilityLabel={`Step ${stepIndex + 1} is ${isEnabled ? 'enabled' : 'disabled'}`}
      style={[
        styles.stepPart,
        isEnabled ? styles.stepPartEnabled : styles.stepPartDisabled,
        isCurrent && styles.stepPartCurrent,
      ]}
    >
      <View style={[styles.stepIndicator, isEnabled && styles.stepIndicatorEnabled]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#e9f7bd',
    borderColor: '#c7df7e',
    borderCurve: 'continuous',
    borderRadius: 8,
    borderWidth: 1,
    boxShadow: '0 8px 20px rgba(77, 88, 44, 0.14)',
    minHeight: 132,
    overflow: 'hidden',
    padding: 12,
  },
  containerPlaying: {
    borderColor: '#6f991c',
    boxShadow: '0 0 18px rgba(111, 153, 28, 0.28)',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  label: {
    color: '#2f4f16',
    fontSize: 13,
    fontWeight: '800',
  },
  shuffleButton: {
    alignItems: 'center',
    borderRadius: 4,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  shuffleButtonPressed: {
    backgroundColor: 'rgba(47, 79, 22, 0.12)',
  },
  iconLayer: {
    alignItems: 'center',
    bottom: 30,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 24,
  },
  stepGrid: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 42,
  },
  stepPart: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.56)',
    borderColor: 'rgba(77, 111, 36, 0.18)',
    borderCurve: 'continuous',
    borderRadius: 4,
    borderWidth: 1,
    flex: 1,
    height: 44,
    justifyContent: 'flex-end',
    paddingBottom: 5,
  },
  stepPartEnabled: {
    backgroundColor: '#fff7a8',
  },
  stepPartDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.52)',
  },
  stepPartCurrent: {
    backgroundColor: '#ffffff',
    borderColor: '#2f4f16',
    borderWidth: 2,
  },
  stepIndicator: {
    backgroundColor: 'rgba(77, 111, 36, 0.28)',
    borderRadius: 2,
    height: 4,
    width: '58%',
  },
  stepIndicatorEnabled: {
    backgroundColor: '#2f4f16',
  },
});
