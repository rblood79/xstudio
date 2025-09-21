import type { Meta, StoryObj } from '@storybook/react';
import { parseDate } from '@internationalized/date';
import { DatePicker } from '../builder/components/DatePicker';

const meta: Meta<typeof DatePicker> = {
  title: 'DatePicker',
  component: DatePicker,
  parameters: {
    layout: 'centered'
  },
  tags: ['autodocs'],
  args: {
    label: 'Select a date'
  }
};

export default meta;

type Story = StoryObj<typeof DatePicker>;

export const Basic: Story = {
  render: (args) => (
    <DatePicker {...args} defaultValue={parseDate('2024-05-15')} />
  )
};

export const WithDescription: Story = {
  render: (args) => (
    <DatePicker
      {...args}
      description="Choose when the event should take place."
      minValue={parseDate('2024-05-01')}
      maxValue={parseDate('2024-05-31')}
      defaultValue={parseDate('2024-05-15')}
    />
  )
};

export const WithTimeSelection: Story = {
  render: (args) => (
    <DatePicker
      {...args}
      includeTime
      timeFormat="24h"
      timeLabel="Time"
      defaultValue={parseDate('2024-05-15')}
    />
  )
};
