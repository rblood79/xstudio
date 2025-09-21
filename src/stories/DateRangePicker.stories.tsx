import type { Meta, StoryObj } from '@storybook/react';
import { parseDate } from '@internationalized/date';
import { DateRangePicker } from '../builder/components/DateRangePicker';

const meta: Meta<typeof DateRangePicker> = {
  title: 'DateRangePicker',
  component: DateRangePicker,
  parameters: {
    layout: 'centered'
  },
  tags: ['autodocs'],
  args: {
    label: 'Select a date range'
  }
};

export default meta;

type Story = StoryObj<typeof DateRangePicker>;

export const Basic: Story = {
  render: (args) => (
    <DateRangePicker
      {...args}
      defaultValue={{
        start: parseDate('2024-06-10'),
        end: parseDate('2024-06-15')
      }}
    />
  )
};

export const WithDescription: Story = {
  render: (args) => (
    <DateRangePicker
      {...args}
      description="Plan your vacation period."
      minValue={parseDate('2024-06-01')}
      maxValue={parseDate('2024-06-30')}
      defaultValue={{
        start: parseDate('2024-06-12'),
        end: parseDate('2024-06-18')
      }}
    />
  )
};

export const WithTimeSelection: Story = {
  render: (args) => (
    <DateRangePicker
      {...args}
      includeTime
      timeFormat="24h"
      startTimeLabel="Start time"
      endTimeLabel="End time"
      defaultValue={{
        start: parseDate('2024-06-12'),
        end: parseDate('2024-06-13')
      }}
    />
  )
};
