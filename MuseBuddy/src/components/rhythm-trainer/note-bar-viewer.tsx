import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import NoteBarSheet from './note-bar-sheet.dom';
import { convertBooleanBarToVexflowEvents } from './note-bar-vexflow';

type NoteBarViewerProps = {
  barIndex: number;
  currentStepIndex: number | null;
  steps: readonly boolean[];
};

export function NoteBarViewer({ barIndex, currentStepIndex, steps }: NoteBarViewerProps) {
  const events = useMemo(() => convertBooleanBarToVexflowEvents(steps), [steps]);

  return (
    <View accessibilityLabel={`Bar ${barIndex + 1} note preview`} style={styles.container}>
      <NoteBarSheet
        barIndex={barIndex}
        currentStepIndex={currentStepIndex}
        dom={{
          scrollEnabled: false,
          style: styles.sheet,
        }}
        events={events}
      />
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
    height: 124,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sheet: {
    backgroundColor: 'transparent',
    height: 120,
    width: '100%',
  },
});
