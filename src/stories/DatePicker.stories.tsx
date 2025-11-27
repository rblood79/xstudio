import type { Meta, StoryObj } from '@storybook/react';
import { parseDate } from '@internationalized/date';
import { DatePicker } from '../shared/components/DatePicker';

const meta: Meta<typeof DatePicker> = {
  title: 'Builder/Components/DatePicker',
  component: DatePicker,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'React Aria DatePicker 컴포넌트를 래핑한 날짜 선택 컴포넌트입니다. 단일 날짜를 선택하는 데 사용됩니다.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    label: {
      control: 'text',
      description: '날짜 선택기의 라벨',
    },
    description: {
      control: 'text',
      description: '날짜 선택기에 대한 추가 설명',
    },
    errorMessage: {
      control: 'text',
      description: '유효성 검사 실패 시 표시될 메시지',
    },
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
    isDisabled: {
      control: 'boolean',
      description: '컴포넌트 비활성화 여부',
    },
    isReadOnly: {
      control: 'boolean',
      description: '컴포넌트 읽기 전용 여부',
    },
    includeTime: {
      control: 'boolean',
      description: '시간 선택기를 포함할지 여부',
    },
    timeFormat: {
      control: 'radio',
      options: ['12h', '24h'],
      description: '시간 형식 (12시간 또는 24시간)',
    },
    timeLabel: {
      control: 'text',
      description: '시간 선택기의 라벨',
    },
    onChange: { action: 'onChange', description: '날짜 변경 시 호출되는 콜백' },
  },
  args: {
    label: '날짜 선택',
    defaultValue: parseDate('2024-05-15'),
    isInvalid: false,
    isDisabled: false,
    isReadOnly: false,
    includeTime: false,
    timeFormat: '24h',
    timeLabel: '시간',
  }
};

export default meta;

type Story = StoryObj<typeof DatePicker>;

export const Basic: Story = {
  args: {
    label: '기본 날짜 선택기',
  },
};

export const WithDescription: Story = {
  args: {
    label: '설명과 범위가 있는 날짜 선택기',
    description: '이벤트가 언제 발생해야 하는지 선택하세요.',
    minValue: parseDate('2024-05-01'),
    maxValue: parseDate('2024-05-31'),
  }
};

export const WithTimeSelection: Story = {
  args: {
    label: '시간 선택기가 있는 날짜 선택기',
    includeTime: true,
    timeFormat: '24h',
    timeLabel: '이벤트 시간',
  }
};
