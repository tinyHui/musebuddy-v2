import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function PeakSoundScreen() {
  return (
    <ScrollView contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
      <View style={styles.header}>
        <Text selectable style={styles.eyebrow}>
          SOUND ANALYSIS
        </Text>
        <Text selectable style={styles.title}>
          Peak Sound
        </Text>
        <Text selectable style={styles.subtitle}>
          Placeholder for peak sound detection.
        </Text>
      </View>

      <View style={styles.card}>
        <Text selectable style={styles.cardTitle}>
          Coming soon
        </Text>
        <Text selectable style={styles.helpText}>
          This tab is ready for the peak sound workflow.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    backgroundColor: '#f4f1e9',
    flexGrow: 1,
    gap: 20,
    paddingBottom: 48,
    paddingHorizontal: 20,
    paddingTop: 36,
  },
  header: {
    gap: 8,
    marginBottom: 8,
  },
  eyebrow: {
    color: '#2457d6',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  title: {
    color: '#16191f',
    fontSize: 44,
    fontWeight: '800',
  },
  subtitle: {
    color: '#60646c',
    fontSize: 17,
    lineHeight: 24,
    maxWidth: 440,
  },
  card: {
    alignItems: 'center',
    backgroundColor: '#fffdf8',
    borderColor: '#ded9cc',
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    padding: 24,
  },
  cardTitle: {
    color: '#16191f',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  helpText: {
    color: '#60646c',
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
  },
});
