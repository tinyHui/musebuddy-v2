import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { museBuddyBorders, museBuddyColors, museBuddyRadii } from '@/constants/design-tokens';

type TrainingScreenShellProps = {
  children: ReactNode;
  eyebrow: string;
  footer: ReactNode;
  subtitle: string;
  title: string;
};

export function TrainingScreenShell({
  children,
  eyebrow,
  footer,
  subtitle,
  title,
}: TrainingScreenShellProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
        <View style={styles.header}>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        <View style={styles.body}>{children}</View>

        <View style={styles.footer}>{footer}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

type PrimaryTrainingButtonProps = {
  label: string;
  onPress: () => void;
  tone?: 'primary' | 'success';
};

export function PrimaryTrainingButton({
  label,
  onPress,
  tone = 'primary',
}: PrimaryTrainingButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        tone === 'success' && styles.successButton,
        pressed && styles.buttonPressed,
      ]}
    >
      <Text style={styles.buttonLabel}>{label}</Text>
    </Pressable>
  );
}

type PlaceholderPanelProps = {
  accent?: 'blue' | 'green' | 'purple';
  body: string;
  title: string;
};

export function PlaceholderPanel({ accent = 'blue', body, title }: PlaceholderPanelProps) {
  return (
    <View style={styles.panel}>
      <View style={[styles.accentMark, accentStyles[accent]]} />
      <Text style={styles.panelTitle}>{title}</Text>
      <Text style={styles.panelBody}>{body}</Text>
    </View>
  );
}

const accentStyles = StyleSheet.create({
  blue: {
    backgroundColor: museBuddyColors.accentBlue,
  },
  green: {
    backgroundColor: museBuddyColors.accentGreen,
  },
  purple: {
    backgroundColor: museBuddyColors.accentPurple,
  },
});

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: museBuddyColors.background,
    flex: 1,
  },
  content: {
    flexGrow: 1,
    gap: 24,
    paddingBottom: 32,
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  header: {
    gap: 8,
  },
  eyebrow: {
    color: museBuddyColors.accentPurple,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    color: museBuddyColors.ink,
    fontSize: 40,
    fontWeight: '900',
    lineHeight: 44,
  },
  subtitle: {
    color: museBuddyColors.ink,
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 24,
    maxWidth: 480,
  },
  body: {
    flex: 1,
    gap: 18,
  },
  footer: {
    paddingTop: 8,
  },
  button: {
    alignItems: 'center',
    backgroundColor: museBuddyColors.primary,
    borderColor: museBuddyColors.ink,
    borderRadius: museBuddyRadii.medium,
    borderWidth: museBuddyBorders.bold,
    boxShadow: `0 6px 0 ${museBuddyColors.ink}`,
    minHeight: 58,
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  successButton: {
    backgroundColor: museBuddyColors.accentGreen,
  },
  buttonPressed: {
    boxShadow: `0 2px 0 ${museBuddyColors.ink}`,
    transform: [{ translateY: 4 }],
  },
  buttonLabel: {
    color: museBuddyColors.ink,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  panel: {
    backgroundColor: museBuddyColors.surface,
    borderColor: museBuddyColors.ink,
    borderRadius: museBuddyRadii.large,
    borderWidth: museBuddyBorders.bold,
    boxShadow: `0 8px 0 ${museBuddyColors.ink}`,
    gap: 12,
    overflow: 'hidden',
    padding: 22,
  },
  accentMark: {
    borderColor: museBuddyColors.ink,
    borderRadius: museBuddyRadii.small,
    borderWidth: museBuddyBorders.bold,
    height: 22,
    width: 92,
  },
  panelTitle: {
    color: museBuddyColors.ink,
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 30,
  },
  panelBody: {
    color: museBuddyColors.ink,
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 25,
  },
});
