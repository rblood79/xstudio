import type { Meta } from '@storybook/react';
import React from 'react';
import { ToggleButton } from '../builder/components/ToggleButton';

const meta: Meta<typeof ToggleButton> = {
  component: ToggleButton,
  parameters: {
    layout: 'centered'
  },
  tags: ['autodocs']
};

export default meta;

type Story = StoryObj<typeof ToggleButton>;

export const Example: Story = (args) => <ToggleButton {...args}>Pin</ToggleButton>;
