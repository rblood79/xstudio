import type { Meta, StoryObj } from '@storybook/react';
import { Checkbox } from '../builder/components/Checkbox';
import { CheckboxGroup } from '../builder/components/CheckboxGroup';

const meta: Meta<typeof CheckboxGroup> = {
  title: 'CheckboxGroup',
  component: CheckboxGroup,
  parameters: {
    layout: 'centered'
  },
  tags: ['autodocs'],
  args: {
    label: 'Newsletter topics'
  }
};

export default meta;

type Story = StoryObj<typeof CheckboxGroup>;

export const Basic: Story = {
  render: (args) => (
    <CheckboxGroup {...args}>
      <Checkbox value="updates">Product updates</Checkbox>
      <Checkbox value="events">Events</Checkbox>
      <Checkbox value="offers">Special offers</Checkbox>
    </CheckboxGroup>
  )
};

export const Horizontal: Story = {
  render: (args) => (
    <CheckboxGroup {...args} orientation="horizontal">
      <Checkbox value="coffee">Coffee</Checkbox>
      <Checkbox value="tea">Tea</Checkbox>
      <Checkbox value="juice">Juice</Checkbox>
    </CheckboxGroup>
  )
};
