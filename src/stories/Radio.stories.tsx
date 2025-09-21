import type { Meta, StoryObj } from '@storybook/react';
import { Radio } from '../builder/components/Radio';
import { RadioGroup } from '../builder/components/RadioGroup';

const meta: Meta<typeof Radio> = {
  title: 'Radio',
  component: Radio,
  parameters: {
    layout: 'centered'
  },
  tags: ['autodocs'],
  args: {
    isDisabled: false
  }
};

export default meta;

type Story = StoryObj<typeof Radio>;

export const Example: Story = {
  render: (args) => (
    <RadioGroup label="Favorite fruit" defaultValue="apple">
      <Radio {...args} value="apple">Apple</Radio>
      <Radio {...args} value="orange">Orange</Radio>
      <Radio {...args} value="pear">Pear</Radio>
    </RadioGroup>
  )
};

export const Horizontal: Story = {
  render: (args) => (
    <RadioGroup label="Delivery speed" orientation="horizontal" defaultValue="standard">
      <Radio {...args} value="standard">Standard</Radio>
      <Radio {...args} value="express">Express</Radio>
      <Radio {...args} value="overnight">Overnight</Radio>
    </RadioGroup>
  )
};
