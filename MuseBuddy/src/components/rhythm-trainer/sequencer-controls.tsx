import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Ionicons } from './icons';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type SequencerControlsProps = {
  bpm: number;
  canDecreaseBpm: boolean;
  canIncreaseBpm: boolean;
  isPlaying: boolean;
  onDecreaseBpm: () => void;
  onIncreaseBpm: () => void;
  onTogglePlayback: () => void;
};

export function SequencerControls({
  bpm,
  canDecreaseBpm,
  canIncreaseBpm,
  isPlaying,
  onDecreaseBpm,
  onIncreaseBpm,
  onTogglePlayback,
}: SequencerControlsProps) {
  return (
    <View style={styles.container}>
      <IconButton
        accessibilityLabel={isPlaying ? 'Stop rhythm trainer playback' : 'Play rhythm trainer'}
        iconName={isPlaying ? 'stop' : 'play'}
        label={isPlaying ? 'Stop' : 'Play'}
        onPress={onTogglePlayback}
        tone="primary"
      />

      <View style={styles.bpmControl}>
        <IconButton
          accessibilityLabel="Decrease BPM"
          disabled={!canDecreaseBpm}
          iconName="remove"
          onPress={onDecreaseBpm}
          tone="secondary"
        />
        <View style={styles.bpmReadout}>
          <Text selectable style={styles.bpmValue}>
            {bpm}
          </Text>
          <Text style={styles.bpmLabel}>BPM</Text>
        </View>
        <IconButton
          accessibilityLabel="Increase BPM"
          disabled={!canIncreaseBpm}
          iconName="add"
          onPress={onIncreaseBpm}
          tone="secondary"
        />
      </View>
    </View>
  );
}

type IconButtonProps = {
  accessibilityLabel: string;
  disabled?: boolean;
  iconName: IconName;
  label?: string;
  onPress: () => void;
  tone: 'primary' | 'secondary';
};

function IconButton({
  accessibilityLabel,
  disabled = false,
  iconName,
  label,
  onPress,
  tone,
}: IconButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        tone === 'primary' ? styles.primaryButton : styles.secondaryButton,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.buttonPressed,
      ]}
    >
      <Ionicons name={iconName} size={22} color={disabled ? '#a4ad9d' : '#ffffff'} />
      {label ? (
        <Text style={[styles.iconButtonLabel, disabled && styles.buttonLabelDisabled]}>
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  bpmControl: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  bpmReadout: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#d6decf',
    borderCurve: 'continuous',
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 96,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  bpmValue: {
    color: '#2f392a',
    fontSize: 28,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
  },
  bpmLabel: {
    color: '#6f7b68',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  iconButton: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 18,
  },
  primaryButton: {
    backgroundColor: '#5f8714',
  },
  secondaryButton: {
    backgroundColor: '#6f7b68',
  },
  buttonDisabled: {
    backgroundColor: '#e1e7dc',
  },
  buttonPressed: {
    opacity: 0.82,
  },
  iconButtonLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  buttonLabelDisabled: {
    color: '#a4ad9d',
  },
});
