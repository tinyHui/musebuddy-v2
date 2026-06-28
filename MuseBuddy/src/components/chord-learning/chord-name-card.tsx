import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { museBuddyColors, museBuddyRadii } from '@/constants/design-tokens';

import type { ChordDisplay, ChordDisplayTokenType } from './chord-display';
import { FlashCard } from './flash-card';

type ChordNameCardProps = {
  display: ChordDisplay;
  explanation?: string;
};

export function ChordNameCard({ display, explanation }: ChordNameCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const notationText = display.commonNotations.join(' / ');

  return (
    <FlashCard
      accessibilityLabel={`Chord name card. ${isFlipped ? 'Showing explanation.' : 'Showing symbol.'}`}
      onPress={() => {
        setIsFlipped((current) => !current);
      }}
    >
      {isFlipped ? (
        <View style={styles.content}>
          <Text style={styles.kicker}>Chord idea</Text>
          <Text style={styles.explanation}>
            {explanation ?? 'Placeholder: explain this chord shape in friendly beginner language.'}
          </Text>
        </View>
      ) : (
        <View style={styles.content}>
          <Text style={styles.kicker}>{"Today's chord"}</Text>
          <Text style={styles.friendlyName}>{display.friendlyName}</Text>
          <Text accessibilityLabel={`Chord symbol ${display.symbol}`} style={styles.symbol}>
            {display.tokens.map((token, index) => (
              <Text
                key={`${token.type}-${token.text}-${index}`}
                style={tokenStyles[token.type] ?? styles.symbolText}
              >
                {token.text}
              </Text>
            ))}
          </Text>
          <Text style={styles.notation}>{notationText}</Text>
          <Text style={styles.flipHint}>Tap to flip</Text>
        </View>
      )}
    </FlashCard>
  );
}

const tokenStyles = StyleSheet.create<Record<ChordDisplayTokenType, object>>({
  addition: {
    color: museBuddyColors.accentGreen,
  },
  alteration: {
    color: museBuddyColors.accentPurple,
  },
  bass: {
    color: museBuddyColors.accentBlue,
  },
  extension: {
    color: museBuddyColors.accentPurple,
  },
  omission: {
    color: museBuddyColors.accentRed,
  },
  quality: {
    color: museBuddyColors.accentBlue,
  },
  root: {
    color: museBuddyColors.accentRed,
  },
  separator: {
    color: museBuddyColors.ink,
  },
});

const styles = StyleSheet.create({
  content: {
    gap: 10,
  },
  kicker: {
    color: museBuddyColors.accentPurple,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  friendlyName: {
    color: museBuddyColors.ink,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 28,
  },
  symbol: {
    color: museBuddyColors.ink,
    fontSize: 54,
    fontWeight: '900',
    lineHeight: 60,
  },
  symbolText: {
    color: museBuddyColors.ink,
  },
  notation: {
    color: museBuddyColors.ink,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
  },
  flipHint: {
    alignSelf: 'flex-start',
    backgroundColor: museBuddyColors.surfaceMuted,
    borderRadius: museBuddyRadii.round,
    color: museBuddyColors.ink,
    fontSize: 13,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  explanation: {
    color: museBuddyColors.ink,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 27,
    minHeight: 116,
  },
});
