import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Rect } from 'react-native-svg';

import { museBuddyBorders, museBuddyColors, museBuddyRadii } from '@/constants/design-tokens';

import {
  getPianoKeyboardMarkers,
  normalizePianoKeyboardKey,
  type CanonicalPianoKeyboardKeyName,
  type PianoKeyboardKeyName,
} from './piano-keyboard-utils';

export type { CanonicalPianoKeyboardKeyName, PianoKeyboardKeyName } from './piano-keyboard-utils';
export { getPianoKeyboardMarkers, normalizePianoKeyboardKey } from './piano-keyboard-utils';

export type PianoKeyboardProps = {
  root: PianoKeyboardKeyName;
  keys?: readonly PianoKeyboardKeyName[];
  width?: number;
  rootColor?: string;
  keyColor?: string;
  accessibilityLabel?: string;
};

const whiteKeys = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;

const blackKeys = [
  { key: 'C#', x: 42 },
  { key: 'D#', x: 82 },
  { key: 'F#', x: 162 },
  { key: 'G#', x: 202 },
  { key: 'A#', x: 242 },
] as const;

const whiteKeyPositions = {
  C: 10,
  D: 50,
  E: 90,
  F: 130,
  G: 170,
  A: 210,
  B: 250,
} satisfies Record<(typeof whiteKeys)[number], number>;

const blackKeyPositions = {
  'C#': 54,
  'D#': 94,
  'F#': 174,
  'G#': 214,
  'A#': 254,
} satisfies Record<(typeof blackKeys)[number]['key'], number>;

function getMarkerPosition(key: CanonicalPianoKeyboardKeyName) {
  if (key in whiteKeyPositions) {
    return {
      cx: whiteKeyPositions[key as keyof typeof whiteKeyPositions] + 20,
      cy: 108,
      r: 11,
    };
  }

  return {
    cx: blackKeyPositions[key as keyof typeof blackKeyPositions],
    cy: 66,
    r: 9,
  };
}

export function PianoKeyboard({
  accessibilityLabel,
  keyColor = museBuddyColors.accentBlue,
  keys = [],
  root,
  rootColor = museBuddyColors.accentRed,
  width,
}: PianoKeyboardProps) {
  const markers = getPianoKeyboardMarkers(root, keys);
  const rootKey = normalizePianoKeyboardKey(root);
  const markerLabel = markers.map(({ key, isRoot }) => `${key}${isRoot ? ' root' : ''}`).join(', ');

  return (
    <View
      accessibilityLabel={
        accessibilityLabel ?? `One octave piano keyboard with selected keys: ${markerLabel}`
      }
      accessibilityRole="image"
      style={[styles.container, width === undefined ? null : { width }]}
    >
      <Svg height="100%" viewBox="0 0 320 170" width="100%">
        <G>
          {whiteKeys.map((key) => (
            <Rect
              fill={museBuddyColors.ink}
              height={122}
              key={`white-shadow-${key}`}
              rx={museBuddyRadii.small}
              width={40}
              x={whiteKeyPositions[key]}
              y={29}
            />
          ))}
          {blackKeys.map(({ key, x }) => (
            <Rect
              fill={museBuddyColors.ink}
              height={76}
              key={`black-shadow-${key}`}
              rx={museBuddyRadii.small}
              width={24}
              x={x}
              y={29}
            />
          ))}
        </G>

        <G>
          {whiteKeys.map((key) => (
            <Rect
              fill={museBuddyColors.surface}
              height={122}
              key={key}
              rx={museBuddyRadii.small}
              stroke={museBuddyColors.ink}
              strokeLinejoin="round"
              strokeWidth={museBuddyBorders.extraBold}
              width={40}
              x={whiteKeyPositions[key]}
              y={20}
            />
          ))}
        </G>

        <Rect
          fill={museBuddyColors.surfaceMuted}
          height={12}
          rx={museBuddyRadii.small}
          width={280}
          x={10}
          y={20}
        />
        <Rect
          fill="none"
          height={122}
          rx={museBuddyRadii.small}
          stroke={museBuddyColors.ink}
          strokeWidth={museBuddyBorders.extraBold}
          width={280}
          x={10}
          y={20}
        />

        <G>
          {blackKeys.map(({ key, x }) => (
            <Rect
              fill={museBuddyColors.ink}
              height={76}
              key={key}
              rx={museBuddyRadii.small}
              stroke={museBuddyColors.ink}
              strokeLinejoin="round"
              strokeWidth={museBuddyBorders.extraBold}
              width={24}
              x={x}
              y={20}
            />
          ))}
        </G>

        <G>
          {markers.map(({ key, isRoot }) => {
            const { cx, cy, r } = getMarkerPosition(key);

            return (
              <Circle
                cx={cx}
                cy={cy}
                fill={isRoot ? rootColor : keyColor}
                key={`marker-${key}-${rootKey}`}
                r={r}
                stroke={museBuddyColors.ink}
                strokeWidth={museBuddyBorders.bold}
              />
            );
          })}
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    aspectRatio: 320 / 170,
    maxWidth: '100%',
    width: '100%',
  },
});
