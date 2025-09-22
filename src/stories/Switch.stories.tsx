import type { Meta, StoryObj } from '@storybook/react';
import { Switch } from '../builder/components/Switch';

const meta: Meta<typeof Switch> = {
  title: 'Builder/Components/Switch',
  component: Switch,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'React Aria Switch 컴포넌트를 래핑한 스위치 컴포넌트입니다. 두 가지 상태 (켜짐/꺼짐)를 토글하는 데 사용됩니다.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    children: {
      control: 'text',
      description: '스위치 옆에 표시될 라벨 텍스트 또는 React 노드',
    },
    isSelected: {
      control: 'boolean',
      description: '스위치가 켜져 있는지 여부 (제어용)',
    },
    defaultSelected: {
      control: 'boolean',
      description: '스위치의 초기 켜짐 상태 (비제어용)',
    },
    isDisabled: {
      control: 'boolean',
      description: '스위치 비활성화 여부',
    },
    isReadOnly: {
      control: 'boolean',
      description: '스위치 읽기 전용 여부',
    },
    value: {
      control: 'text',
      description: '폼 제출 시 사용될 스위치의 값',
    },
    onChange: { action: 'onChange', description: '스위치 상태 변경 시 호출되는 콜백' },
  },
  args: {
    children: '알림 활성화',
    isSelected: false,
    isDisabled: false,
    isReadOnly: false,
  }
};

export default meta;

type Story = StoryObj<typeof Switch>;

export const BasicSwitch: Story = {
  args: {
    children: '기본 스위치',
  },
};

export const SelectedSwitch: Story = {
  args: {
    children: '선택된 스위치',
    isSelected: true,
  },
};

export const DisabledSwitch: Story = {
  args: {
    children: '비활성화된 스위치',
    isDisabled: true
  }
};

export const ReadOnlySwitch: Story = {
  args: {
    children: '읽기 전용 스위치',
    isReadOnly: true,
    isSelected: true,
  },
};
