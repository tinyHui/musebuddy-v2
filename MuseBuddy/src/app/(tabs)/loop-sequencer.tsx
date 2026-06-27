import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RhythmTrainerView } from '@/components/rhythm-trainer';

export default function LoopSequencerScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
        <RhythmTrainerView />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f6f8ef',
  },
  content: {
    flexGrow: 1,
    gap: 20,
    paddingBottom: 48,
    paddingHorizontal: 20,
    paddingTop: 36,
  },
});
