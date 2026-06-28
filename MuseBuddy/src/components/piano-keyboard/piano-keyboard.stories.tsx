import type { Meta, StoryObj } from '@storybook/react-native';

import { PianoKeyboard, type PianoKeyboardKeyName } from './piano-keyboard';

type ChordPreset =
  | 'C major'
  | 'A minor'
  | 'G7'
  | 'Cmaj7'
  | 'Csus4'
  | 'Cadd9'
  | 'C(no3)'
  | 'F# diminished'
  | 'Manual';

type PianoKeyboardStoryArgs = {
  chordPreset: ChordPreset;
  root: PianoKeyboardKeyName;
  keys: PianoKeyboardKeyName[];
};

const chordPresets = {
  'C major': { root: 'C', keys: ['E', 'G'] },
  'A minor': { root: 'A', keys: ['C', 'E'] },
  G7: { root: 'G', keys: ['B', 'D', 'F'] },
  Cmaj7: { root: 'C', keys: ['E', 'G', 'B'] },
  Csus4: { root: 'C', keys: ['F', 'G'] },
  Cadd9: { root: 'C', keys: ['D', 'E', 'G'] },
  'C(no3)': { root: 'C', keys: ['G'] },
  'F# diminished': { root: 'F#', keys: ['A', 'C'] },
} satisfies Record<
  Exclude<ChordPreset, 'Manual'>,
  { root: PianoKeyboardKeyName; keys: PianoKeyboardKeyName[] }
>;

const chordPresetOptions: ChordPreset[] = [
  'C major',
  'A minor',
  'G7',
  'Cmaj7',
  'Csus4',
  'Cadd9',
  'C(no3)',
  'F# diminished',
  'Manual',
];

const noteOptions: PianoKeyboardKeyName[] = [
  'C',
  'C#',
  'Db',
  'D',
  'D#',
  'Eb',
  'E',
  'F',
  'F#',
  'Gb',
  'G',
  'G#',
  'Ab',
  'A',
  'A#',
  'Bb',
  'B',
];

const meta = {
  title: 'Components/PianoKeyboard',
  component: PianoKeyboard,
  args: {
    chordPreset: 'C major',
    root: 'C',
    keys: ['E', 'G'],
  },
  argTypes: {
    chordPreset: {
      control: 'select',
      options: chordPresetOptions,
    },
    root: {
      control: 'select',
      options: noteOptions,
    },
    keys: {
      control: 'object',
    },
  },
  render: ({ chordPreset, keys, root }: PianoKeyboardStoryArgs) => {
    if (chordPreset === 'Manual') {
      return <PianoKeyboard keys={keys} root={root} width={320} />;
    }

    const preset = chordPresets[chordPreset];

    return <PianoKeyboard keys={preset.keys} root={preset.root} width={320} />;
  },
} satisfies Meta<PianoKeyboardStoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Chord: Story = {};
