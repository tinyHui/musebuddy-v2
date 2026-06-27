import { StyleSheet, View } from 'react-native';

type NoteBarViewerProps = {
  barIndex: number;
  currentStepIndex: number | null;
  steps: readonly boolean[];
};

export function NoteBarViewer({ barIndex, currentStepIndex, steps }: NoteBarViewerProps) {
  return (
    <View accessibilityLabel={`Bar ${barIndex + 1} note preview`} style={styles.container}>
      <View style={styles.staff}>
        {Array.from({ length: 5 }, (_, lineIndex) => (
          <View key={lineIndex} style={styles.staffLine} />
        ))}
      </View>

      <View style={styles.noteGrid}>
        {steps.map((isEnabled, stepIndex) => (
          <View key={stepIndex} style={styles.noteSlot}>
            {isEnabled ? (
              <View
                style={[
                  styles.noteHead,
                  stepIndex % 2 === 0 ? styles.noteHeadLower : styles.noteHeadUpper,
                  currentStepIndex === stepIndex && styles.noteHeadCurrent,
                ]}
              />
            ) : (
              <View
                style={[styles.restMark, currentStepIndex === stepIndex && styles.restMarkCurrent]}
              />
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderColor: '#d6decf',
    borderCurve: 'continuous',
    borderRadius: 8,
    borderWidth: 1,
    boxShadow: '0 4px 14px rgba(68, 78, 54, 0.08)',
    height: 86,
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: 12,
  },
  staff: {
    gap: 8,
    left: 12,
    position: 'absolute',
    right: 12,
  },
  staffLine: {
    backgroundColor: '#d6decf',
    height: 1,
  },
  noteGrid: {
    flexDirection: 'row',
    gap: 4,
    height: 58,
  },
  noteSlot: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  noteHead: {
    backgroundColor: '#46523f',
    borderColor: '#2f392a',
    borderCurve: 'continuous',
    borderRadius: 8,
    borderWidth: 1,
    height: 14,
    width: 18,
  },
  noteHeadLower: {
    transform: [{ translateY: 10 }, { rotate: '-12deg' }],
  },
  noteHeadUpper: {
    transform: [{ translateY: -8 }, { rotate: '-12deg' }],
  },
  noteHeadCurrent: {
    backgroundColor: '#7faf22',
    borderColor: '#5f8714',
  },
  restMark: {
    backgroundColor: '#a9b5a2',
    borderRadius: 2,
    height: 4,
    width: 12,
  },
  restMarkCurrent: {
    backgroundColor: '#7faf22',
  },
});
