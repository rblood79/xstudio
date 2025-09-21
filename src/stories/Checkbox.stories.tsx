import type { Meta, StoryObj } from '@storybook/react';
import { Checkbox } from '../builder/components/Checkbox';

const meta: Meta<typeof Checkbox> = {
  title: 'Checkbox',
  component: Checkbox,
  parameters: {
    layout: 'centered'
  },
  tags: ['autodocs'],
  args: {
    children: 'Subscribe to newsletter'
  }
};

export default meta;

type Story = StoryObj<typeof Checkbox>;

export const Basic: Story = {};

export const Indeterminate: Story = {
  args: {
    children: 'Partially selected',
    isIndeterminate: true
  }
};

export const Disabled: Story = {
  args: {
    children: 'Disabled option',
    isDisabled: true
  }
};
