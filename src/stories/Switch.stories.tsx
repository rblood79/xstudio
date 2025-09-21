import type { Meta, StoryObj } from '@storybook/react';
import { Switch } from '../builder/components/Switch';

const meta: Meta<typeof Switch> = {
  title: 'Switch',
  component: Switch,
  parameters: {
    layout: 'centered'
  },
  tags: ['autodocs'],
  args: {
    children: 'Enable notifications'
  }
};

export default meta;

type Story = StoryObj<typeof Switch>;

export const Basic: Story = {};

export const Disabled: Story = {
  args: {
    children: 'Disabled switch',
    isDisabled: true
  }
};

export const Selected: Story = {
  args: {
    children: 'Switch on by default',
    defaultSelected: true
  }
};
