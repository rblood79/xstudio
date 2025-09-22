import type { Meta, StoryObj } from '@storybook/react';
import { getLocalTimeZone, today } from '@internationalized/date';
import { Calendar } from '../builder/components/Calendar';

const meta: Meta<typeof Calendar> = {
  title: 'Builder/Components/Calendar',
  component: Calendar,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'React Aria Calendar 컴포넌트를 래핑한 달력 컴포넌트입니다.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    minValue: {
      control: 'date',
      description: '선택 가능한 최소 날짜',
    },
    maxValue: {
      control: 'date',
      description: '선택 가능한 최대 날짜',
    },
    defaultValue: {
      control: 'date',
      description: '기본으로 선택된 날짜',
    },
    value: {
      control: 'date',
      description: '제어되는 선택된 날짜 (읽기 전용)',
    },
    isInvalid: {
      control: 'boolean',
      description: '입력값이 유효하지 않은지 여부',
    },
    errorMessage: {
      control: 'text',
      description: '유효성 검사 실패 시 표시될 메시지',
    },
    isDisabled: {
      control: 'boolean',
      description: '컴포넌트 비활성화 여부',
    },
    isReadOnly: {
      control: 'boolean',
      description: '컴포넌트 읽기 전용 여부',
    },
  },
  args: {
    defaultValue: today(getLocalTimeZone()),
    isInvalid: false,
    isDisabled: false,
    isReadOnly: false,
  }
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
