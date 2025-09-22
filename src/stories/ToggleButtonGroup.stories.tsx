import type { Meta } from '@storybook/react';
import React from 'react';
import { ToggleButton } from '../builder/components/ToggleButton';
import { ToggleButtonGroup } from '../builder/components/ToggleButtonGroup';
import { StoryObj } from '@storybook/react';

const meta: Meta<typeof ToggleButtonGroup> = {
  component: ToggleButtonGroup,
  parameters: {
    layout: 'centered'
  },
  tags: ['autodocs']
};

export default meta;

type Story = StoryObj<typeof ToggleButtonGroup>;

export const Example: Story = (args) => (
  <ToggleButtonGroup {...args}>
    <ToggleButton id="bold" aria-label="Bold" >Bold</ToggleButton>
    <ToggleButton id="italic" aria-label="Italic" >Italic</ToggleButton>
    <ToggleButton id="underline" aria-label="Underline" >Underline</ToggleButton>
  </ToggleButtonGroup>
);

Example.args = {
  selectionMode: 'multiple'
};
