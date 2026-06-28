import type { Meta, StoryObj } from '@storybook/react-native';

import { RhythmBarViewer } from './rhythm-bar-viewer';

const noop = () => {};

const meta = {
  title: 'Components/RhythmTrainer/RhythmBarViewer',
  component: RhythmBarViewer,
  args: {
    currentStepIndex: null,
    isPlayingBar: false,
    onRegenerate: noop,
    onShuffle: noop,
    steps: [true, false, true, false, true, false, true, false],
  },
} satisfies Meta<typeof RhythmBarViewer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Idle: Story = {};

export const PlayingCurrentStep: Story = {
  args: {
    currentStepIndex: 3,
    isPlayingBar: true,
  },
};

export const RestHeavy: Story = {
  args: {
    steps: [true, false, false, false, true, false, false, false],
  },
};
