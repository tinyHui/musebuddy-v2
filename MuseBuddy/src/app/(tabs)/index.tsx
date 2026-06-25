import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTranscription } from '@/hooks/use-transcription';

function formatElapsed(elapsedMs: number): string {
  const totalSeconds = Math.floor(elapsedMs / 1_000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatMilliseconds(milliseconds: number): string {
  return `${Math.round(milliseconds)} ms`;
}

export default function TranscriptionScreen() {
  const { loadModel, phase, progress, recording, result, start, statusMessage, stop, transcribe } =
    useTranscription();

  const modelReady = phase !== 'loadingModel' && phase !== 'modelError';
  const isBusy = ['starting', 'stopping', 'transcribing'].includes(phase);
  const startEnabled = modelReady && phase !== 'recording' && !isBusy;
  const stopEnabled = phase === 'recording';
  const transcribeEnabled = modelReady && recording !== null && phase !== 'recording' && !isBusy;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>ON-DEVICE PIANO TRANSCRIPTION</Text>
          <Text style={styles.title}>MuseBuddy</Text>
          <Text style={styles.subtitle}>
            Record up to 60 seconds. Your audio stays on this device.
          </Text>
        </View>

        {phase === 'modelError' ? (
          <View style={styles.card}>
            <Text selectable style={styles.errorTitle}>
              Model unavailable
            </Text>
            <Text selectable style={styles.helpText}>
              {statusMessage}
            </Text>
            <ActionButton label="Retry model loading" onPress={loadModel} />
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <View style={styles.statusRow}>
                {isBusy && <ActivityIndicator color="#2457d6" />}
                <Text selectable style={styles.statusText}>
                  {statusText(phase)}
                </Text>
              </View>

              {phase === 'recording' && (
                <>
                  <Text selectable style={styles.timer}>
                    {formatElapsed(progress.elapsedMs)}
                  </Text>
                  <View
                    accessibilityLabel={`Microphone level ${Math.round(progress.level * 100)} percent`}
                    accessibilityRole="progressbar"
                    style={styles.meterTrack}
                  >
                    <View style={[styles.meterFill, { width: `${progress.level * 100}%` }]} />
                  </View>
                </>
              )}

              {recording && phase !== 'recording' && (
                <Text selectable style={styles.recordedDuration}>
                  {formatElapsed(recording.durationMs)}
                </Text>
              )}

              {statusMessage !== '' && (
                <Text selectable style={styles.errorText}>
                  {statusMessage}
                </Text>
              )}
            </View>

            <View style={styles.controls}>
              <ActionButton label="Start" onPress={start} disabled={!startEnabled} />
              <ActionButton label="Stop" onPress={stop} disabled={!stopEnabled} tone="stop" />
              <ActionButton label="Transcribe" onPress={transcribe} disabled={!transcribeEnabled} />
            </View>
          </>
        )}

        {result && phase === 'results' && (
          <View style={styles.resultsSection}>
            <View style={styles.summaryCard}>
              <Text selectable style={styles.cardTitle}>
                Transcription complete
              </Text>
              <Text selectable style={styles.summaryText}>
                {result.notes.length} detected events ·{' '}
                {formatMilliseconds(result.recordingDurationMs)}
              </Text>
              <Text selectable style={styles.processingText}>
                Processed in {formatMilliseconds(result.processingDurationMs)}
              </Text>
            </View>

            {result.notes.length === 0 ? (
              <View style={styles.card}>
                <Text selectable style={styles.cardTitle}>
                  No pitches detected
                </Text>
              </View>
            ) : (
              result.notes.map((note, index) => (
                <View
                  key={`${note.midiPitch}-${note.startTimeMs}-${index}`}
                  style={styles.resultRow}
                >
                  <Text selectable style={styles.pitchText}>
                    Pitch {note.midiPitch}
                  </Text>
                  <Text selectable style={styles.detailText}>
                    Start {formatMilliseconds(note.startTimeMs)}
                  </Text>
                  <Text selectable style={styles.detailText}>
                    End {formatMilliseconds(note.endTimeMs)}
                  </Text>
                  <Text selectable style={styles.detailText}>
                    Duration {formatMilliseconds(note.durationMs)}
                  </Text>
                  <Text selectable style={styles.detailText}>
                    Confidence {Math.round(note.confidence * 100)}% · Velocity {note.velocity}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function statusText(phase: ReturnType<typeof useTranscription>['phase']): string {
  switch (phase) {
    case 'loadingModel':
      return 'Loading transcription model…';
    case 'ready':
      return 'Ready to record';
    case 'starting':
      return 'Starting recording…';
    case 'recording':
      return 'Recording';
    case 'stopping':
      return 'Saving recording…';
    case 'recorded':
      return 'Recording ready to transcribe';
    case 'transcribing':
      return 'Transcribing recording…';
    case 'results':
      return 'Recording and results ready';
    case 'modelError':
      return 'Model unavailable';
  }
}

type ActionButtonProps = {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  tone?: 'primary' | 'stop';
};

function ActionButton({ disabled = false, label, onPress, tone = 'primary' }: ActionButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        tone === 'stop' && styles.stopButton,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.buttonPressed,
      ]}
    >
      <Text style={[styles.buttonLabel, disabled && styles.buttonLabelDisabled]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f1e9',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 36,
    paddingBottom: 48,
    gap: 20,
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
    letterSpacing: -1.5,
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
    gap: 20,
    padding: 24,
  },
  controls: {
    gap: 12,
  },
  summaryCard: {
    backgroundColor: '#dce7ff',
    borderRadius: 20,
    gap: 8,
    padding: 24,
  },
  cardTitle: {
    color: '#16191f',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  statusText: {
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
  button: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: '#2457d6',
    borderRadius: 14,
    minHeight: 54,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  buttonDisabled: {
    backgroundColor: '#d7d3ca',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  stopButton: {
    backgroundColor: '#c43b34',
  },
  buttonLabel: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },
  buttonLabelDisabled: {
    color: '#8a877f',
  },
  timer: {
    color: '#16191f',
    fontSize: 58,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    letterSpacing: -1,
  },
  recordedDuration: {
    color: '#16191f',
    fontSize: 42,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  meterTrack: {
    backgroundColor: '#e4e0d7',
    borderRadius: 7,
    height: 14,
    overflow: 'hidden',
    width: '100%',
  },
  meterFill: {
    backgroundColor: '#2a9d67',
    borderRadius: 7,
    height: '100%',
  },
  resultsSection: {
    gap: 12,
  },
  summaryText: {
    color: '#24365f',
    fontSize: 17,
    fontWeight: '600',
  },
  processingText: {
    color: '#52617d',
    fontSize: 14,
  },
  resultRow: {
    backgroundColor: '#fffdf8',
    borderColor: '#ded9cc',
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
    padding: 18,
  },
  pitchText: {
    color: '#16191f',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  detailText: {
    color: '#4c5058',
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    lineHeight: 19,
  },
  errorTitle: {
    color: '#a52d27',
    fontSize: 22,
    fontWeight: '700',
  },
  errorText: {
    color: '#a52d27',
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
});
