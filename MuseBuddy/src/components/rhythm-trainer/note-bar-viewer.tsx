import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import NoteBarSheet from './note-bar-sheet.dom';
import { convertBooleanBarToVexflowEvents } from './note-bar-vexflow';

type NoteBarViewerProps = {
  currentStepIndex: number | null;
  steps: readonly boolean[];
};

export function NoteBarViewer({ currentStepIndex, steps }: NoteBarViewerProps) {
  const events = useMemo(() => convertBooleanBarToVexflowEvents(steps), [steps]);

  return (
    <View accessibilityLabel="Note preview for rhythm bar" style={styles.container}>
      <NoteBarSheet
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
