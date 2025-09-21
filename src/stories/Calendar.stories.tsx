import type { Meta, StoryObj } from '@storybook/react';
import { getLocalTimeZone, today } from '@internationalized/date';
import { Calendar } from '../builder/components/Calendar';

const meta: Meta<typeof Calendar> = {
  title: 'Calendar',
  component: Calendar,
  parameters: {
    layout: 'centered'
  },
  tags: ['autodocs']
};

export default meta;

type Story = StoryObj<typeof Calendar>;

export const Basic: Story = {
  render: (args) => (
    <Calendar {...args} defaultValue={today(getLocalTimeZone())} />
  )
};

export const WithMinMax: Story = {
  render: (args) => (
    <Calendar
      {...args}
      minValue={today(getLocalTimeZone()).subtract({ days: 5 })}
      maxValue={today(getLocalTimeZone()).add({ days: 5 })}
      defaultValue={today(getLocalTimeZone())}
    />
  )
};

export const WithError: Story = {
  render: (args) => (
    <Calendar
      {...args}
      isInvalid
      errorMessage="Date is outside the allowed range"
      minValue={today(getLocalTimeZone()).add({ days: 2 })}
      defaultValue={today(getLocalTimeZone())}
    />
  )
};
