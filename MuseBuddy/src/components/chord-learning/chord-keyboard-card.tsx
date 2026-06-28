import { StyleSheet, Text, View } from 'react-native';

import { PianoKeyboard } from '@/components/piano-keyboard/piano-keyboard';
import { museBuddyColors } from '@/constants/design-tokens';

import type { ChordDisplay } from './chord-display';
import { FlashCard } from './flash-card';

type ChordKeyboardCardProps = {
  display: ChordDisplay;
};

export function ChordKeyboardCard({ display }: ChordKeyboardCardProps) {
  const rootNote = display.notes.find((note) => note.isRoot) ?? display.notes[0];
  const selectedKeys = display.notes
    .filter((note) => note.keyboardKey !== rootNote.keyboardKey)
    .map((note) => note.keyboardKey);
  const noteNames = display.notes.map((note) => note.text).join(' - ');

  return (
    <FlashCard>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Piano keys</Text>
          <Text style={styles.notes}>{noteNames}</Text>
        </View>
        <PianoKeyboard
          accessibilityLabel={`Piano keyboard highlighting ${noteNames}`}
          keyColor={museBuddyColors.accentBlue}
          keys={selectedKeys}
          root={rootNote.keyboardKey}
          rootColor={museBuddyColors.accentRed}
        />
      </View>
    </FlashCard>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 12,
  },
  header: {
    gap: 4,
  },
  title: {
    color: museBuddyColors.ink,
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 26,
  },
  notes: {
    color: museBuddyColors.ink,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
});
