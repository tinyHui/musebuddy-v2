import type { Meta, StoryObj } from '@storybook/react-native';

import { ThemedText } from '@/components/themed-text';

const meta = {
  title: 'Components/ThemedText',
  component: ThemedText,
  args: {
    children: 'MuseBuddy transcribes piano notes on device.',
    type: 'default',
  },
  argTypes: {
    type: {
      control: 'select',
      options: [
        'default',
        'title',
        'small',
        'smallBold',
        'subtitle',
        'link',
        'linkPrimary',
        'code',
      ],
    },
  },
} satisfies Meta<typeof ThemedText>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Title: Story = {
  args: {
    children: 'MuseBuddy',
    type: 'title',
  },
};
