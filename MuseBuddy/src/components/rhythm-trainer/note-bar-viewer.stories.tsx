import type { Meta, StoryObj } from '@storybook/react-native';

import { NoteBarViewer } from './note-bar-viewer';

const meta = {
  title: 'Components/RhythmTrainer/NoteBarViewer',
  component: NoteBarViewer,
  args: {
    currentStepIndex: null,
    steps: [true, false, true, true, false, false, true, false],
  },
} satisfies Meta<typeof NoteBarViewer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Idle: Story = {};

export const HighlightedStep: Story = {
  args: {
    currentStepIndex: 4,
  },
};
