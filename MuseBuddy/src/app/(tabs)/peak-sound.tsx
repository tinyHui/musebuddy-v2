import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { usePianoAttackDetector } from '@/hooks/use-piano-attack-detector';

type AttackLogEntry = NonNullable<ReturnType<typeof usePianoAttackDetector>['lastAttack']>;

function formatDb(value: number): string {
  return `${Math.round(value)} dB`;
}

export default function PeakSoundScreen() {
  const { ambientLevel, lastAttack, phase, start, statusMessage, stop } = usePianoAttackDetector();
  const [attackLog, setAttackLog] = useState<AttackLogEntry[]>([]);
  const isBusy = phase === 'starting' || phase === 'stopping';
  const isListening = phase === 'listening';

  useEffect(() => {
    if (!lastAttack) {
      return;
    }

    setAttackLog((currentLog) => [lastAttack, ...currentLog].slice(0, 12));
  }, [lastAttack]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
        <View style={styles.header}>
          <Text style={styles.eyebrow}>RHYTHM TRAINING</Text>
          <Text style={styles.title}>Peak Sound</Text>
          <Text style={styles.subtitle}>Listen for piano attacks in the room.</Text>
        </View>

        <View style={styles.panel}>
          <Text selectable style={styles.statusText}>
            {statusText(phase)}
          </Text>

          <Text selectable style={styles.levelText}>
            Ambient {ambientLevel ? formatDb(ambientLevel.roundedLevelDb) : '-- dB'}
          </Text>

          {lastAttack ? (
            <Text selectable style={styles.detailText}>
              Peak {formatDb(lastAttack.levelDb)} | Attack ambient {formatDb(lastAttack.ambientDb)}{' '}
              | +{formatDb(lastAttack.deltaDb)} | Onset {formatDb(lastAttack.onsetStrengthDb)}
            </Text>
          ) : (
            <Text selectable style={styles.detailText}>
              No attacks detected
            </Text>
          )}

          <View style={styles.logPanel}>
            <Text selectable style={styles.logTitle}>
              Attack log
            </Text>
            {attackLog.length > 0 ? (
              attackLog.map((attack) => (
                <Text key={attack.id} selectable style={styles.logLine}>
                  #{attack.id} {Math.round(attack.timestampMs)}ms | peak {formatDb(attack.levelDb)}{' '}
                  | ambient {formatDb(attack.ambientDb)} | delta +{formatDb(attack.deltaDb)} |
                  onset {formatDb(attack.onsetStrengthDb)}
                </Text>
              ))
            ) : (
              <Text selectable style={styles.logEmpty}>
                Waiting for attack events
              </Text>
            )}
          </View>

          {statusMessage !== '' && (
            <Text selectable style={styles.errorText}>
              {statusMessage}
            </Text>
          )}
        </View>

        <View style={styles.controls}>
          <ActionButton label="Start" onPress={start} disabled={isListening || isBusy} />
          <ActionButton label="Stop" onPress={stop} disabled={!isListening || isBusy} tone="stop" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function statusText(phase: ReturnType<typeof usePianoAttackDetector>['phase']): string {
  switch (phase) {
    case 'idle':
      return 'Ready';
    case 'starting':
      return 'Starting microphone';
    case 'listening':
      return 'Listening';
    case 'stopping':
      return 'Stopping microphone';
    case 'error':
      return 'Unavailable';
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
  panel: {
    backgroundColor: '#fffdf8',
    borderColor: '#ded9cc',
    borderRadius: 8,
    borderWidth: 1,
    gap: 16,
    padding: 24,
  },
  statusText: {
    color: '#16191f',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  levelText: {
    color: '#16191f',
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
  },
  detailText: {
    color: '#60646c',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  logPanel: {
    alignSelf: 'stretch',
    backgroundColor: '#f6f3ec',
    borderColor: '#e3ded2',
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 12,
  },
  logTitle: {
    color: '#16191f',
    fontSize: 14,
    fontWeight: '700',
  },
  logLine: {
    color: '#30343b',
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    lineHeight: 18,
  },
  logEmpty: {
    color: '#77736b',
    fontSize: 13,
    lineHeight: 18,
  },
  errorText: {
    color: '#ad2119',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#2457d6',
    borderRadius: 8,
    flex: 1,
    minHeight: 52,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  stopButton: {
    backgroundColor: '#ad2119',
  },
  buttonDisabled: {
    backgroundColor: '#d4d0c7',
  },
  buttonPressed: {
    opacity: 0.82,
  },
  buttonLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonLabelDisabled: {
    color: '#77736b',
  },
});
