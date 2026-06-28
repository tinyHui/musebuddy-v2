import { StyleSheet, Text, View } from 'react-native';

import { museBuddyColors } from '@/constants/design-tokens';

import type { ChordDisplay } from './chord-display';
import ChordSheet from './chord-sheet.dom';
import { FlashCard } from './flash-card';

type ChordSheetCardProps = {
  display: ChordDisplay;
};

export function ChordSheetCard({ display }: ChordSheetCardProps) {
  return (
    <FlashCard>
      <View style={styles.content}>
        <Text style={styles.title}>Sheet</Text>
        <View
          accessibilityLabel={`Sheet notes: ${display.notes.map((note) => note.text).join(', ')}`}
          style={styles.sheetFrame}
        >
          <ChordSheet
            dom={{
              scrollEnabled: false,
              style: styles.sheet,
            }}
            notes={display.notes}
          />
        </View>
      </View>
    </FlashCard>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 12,
  },
  title: {
    color: museBuddyColors.ink,
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 26,
  },
  sheetFrame: {
    backgroundColor: museBuddyColors.white,
    height: 148,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sheet: {
    backgroundColor: 'transparent',
    height: 148,
    width: '100%',
  },
});
