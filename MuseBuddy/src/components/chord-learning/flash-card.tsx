import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { museBuddyBorders, museBuddyColors, museBuddyRadii } from '@/constants/design-tokens';

type FlashCardProps = {
  accessibilityLabel?: string;
  children: ReactNode;
  isPressedStyleEnabled?: boolean;
  onPress?: () => void;
};

export function FlashCard({
  accessibilityLabel,
  children,
  isPressedStyleEnabled = true,
  onPress,
}: FlashCardProps) {
  const content = <View style={styles.inner}>{children}</View>;

  if (!onPress) {
    return <View style={styles.card}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed && isPressedStyleEnabled ? styles.cardPressed : null,
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: museBuddyColors.white,
    borderColor: museBuddyColors.ink,
    borderRadius: museBuddyRadii.large,
    borderWidth: museBuddyBorders.bold,
    boxShadow: `0 8px 0 ${museBuddyColors.ink}`,
    overflow: 'hidden',
  },
  cardPressed: {
    boxShadow: `0 3px 0 ${museBuddyColors.ink}`,
    transform: [{ translateY: 5 }],
  },
  inner: {
    backgroundColor: museBuddyColors.white,
    padding: 18,
  },
});
