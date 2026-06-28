import type { Meta, StoryObj } from '@storybook/react-native';

import { RhythmViewer } from './rhythm-viewer';

const noop = () => {};

const samplePattern = [
  true,
  false,
  true,
  false,
  true,
  false,
  true,
  false,
  true,
  true,
  false,
  false,
  true,
  false,
  false,
  true,
  true,
  false,
  false,
  true,
  false,
  true,
  false,
  false,
  true,
  false,
  true,
  true,
  false,
  false,
  true,
  false,
];

const meta = {
  title: 'Components/RhythmTrainer/RhythmViewer',
  component: RhythmViewer,
  args: {
    currentStepIndex: null,
    onRegenerateBar: noop,
    onShuffleBar: noop,
    pattern: samplePattern,
  },
} satisfies Meta<typeof RhythmViewer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Idle: Story = {};

export const ActiveMiddleBar: Story = {
  args: {
    currentStepIndex: 13,
  },
};
