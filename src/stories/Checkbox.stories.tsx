import type { Meta, StoryObj } from '@storybook/react';
import { Checkbox } from '../shared/components/Checkbox';

const meta: Meta<typeof Checkbox> = {
  title: 'Builder/Components/Checkbox',
  component: Checkbox,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'React Aria Checkbox 컴포넌트를 래핑한 체크박스 컴포넌트입니다. 단일 선택 옵션을 제공합니다.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    children: {
      control: 'text',
      description: '체크박스 옆에 표시될 라벨 텍스트 또는 React 노드',
    },
    isSelected: {
      control: 'boolean',
      description: '체크박스가 선택되었는지 여부',
    },
    defaultSelected: {
      control: 'boolean',
      description: '초기 선택 상태 (비제어)',
    },
    isIndeterminate: {
      control: 'boolean',
      description: '체크박스가 부분적으로 선택된 (불확실한) 상태인지 여부',
    },
    isDisabled: {
      control: 'boolean',
      description: '체크박스 비활성화 여부',
    },
    isReadOnly: {
      control: 'boolean',
      description: '체크박스 읽기 전용 여부',
    },
    isInvalid: {
      control: 'boolean',
      description: '유효성 검사 실패 상태인지 여부',
    },
    value: {
      control: 'text',
      description: '폼 제출 시 사용될 체크박스의 값',
    },
    onChange: { action: 'onChange', description: '체크박스 상태 변경 시 호출되는 콜백' },
  },
  args: {
    children: '뉴스레터 구독',
    isSelected: false,
    isIndeterminate: false,
    isDisabled: false,
    isReadOnly: false,
    isInvalid: false,
  }
};

export default meta;

type Story = StoryObj<typeof Checkbox>;

export const Basic: Story = {
  args: {
    children: '기본 체크박스',
  },
};

export const Selected: Story = {
  args: {
    children: '선택된 체크박스',
    isSelected: true,
  },
};

export const Indeterminate: Story = {
  args: {
    children: '부분 선택된 체크박스',
    isIndeterminate: true,
  }
};

export const Disabled: Story = {
  args: {
    children: '비활성화된 체크박스',
    isDisabled: true
  }
};

export const Invalid: Story = {
  args: {
    children: '유효하지 않은 체크박스',
    isInvalid: true,
  },
};
